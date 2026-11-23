import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  app.post('/api/generate-deck', async (req, res) => {
    try {
      const { courseText, theme, level, difficultyTier } = req.body as {
        courseText?: string;
        theme?: string;
        level?: 'Collège' | 'Lycée';
        difficultyTier?: 'FACILE' | 'MOYEN' | 'DIFFICILE' | 'EXPERT';
      };

      const selectedLevel = level === 'Lycée' ? 'Lycée (Première / Terminale - Bac)' : 'Collège (3e - Brevet)';
      const tierMap: Record<string, string> = {
        FACILE: 'Niveau Facile (Échauffement : questions fondamentales, définitions claires et calculs directs)',
        MOYEN: 'Niveau Moyen (Brevet / Bac Standard : questions classiques d’examen avec pièges courants)',
        DIFFICILE: 'Niveau Difficile (Mention Très Bien : questions pointues, subtilités de cours et calculs à plusieurs étapes)',
        EXPERT: 'Niveau Expert (Olympiades / Prépa : questions redoutables, pièges subtils et maîtrise approfondie)',
      };
      const selectedTierDesc = tierMap[difficultyTier || 'MOYEN'] || tierMap.MOYEN;

      const hasCourse = courseText && courseText.trim().length >= 20;
      const hasTheme = theme && theme.trim().length >= 2;

      if (!hasCourse && !hasTheme) {
        return res.status(400).json({
          error: 'Veuillez coller un extrait de cours (min. 20 caractères) ou saisir un thème précis.',
        });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'La clé API Gemini nest pas configurée sur le serveur (Settings > Secrets).',
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptContext = hasCourse
        ? `Voici le cours ou les notes fournis par l'élève :\n"""\n${courseText!.slice(0, 12000)}\n"""\n${hasTheme ? `Thème complémentaire indiqué : ${theme}` : ''}`
        : `Sujet / Thème demandé : "${theme}"`;

      const prompt = `Génère un deck de révision tactique compétitif de type "Révis'Clash" pour le cycle ${selectedLevel}.
Difficulté ciblée : ${selectedTierDesc}.
${promptContext}

Règles de conception obligatoires :
1. Crée un titre de deck percutant (ex: "Maths : Théorème de Thalès & Pièges", "Histoire : Crises de la Guerre Froide") et un court sous-titre.
2. Génère EXACTEMENT 12 cartes-questions principales ("cards") à difficulté progressive (4 cartes "FACILE", 4 cartes "MOYEN", 4 cartes "DIFFICILE" adaptées au calibre demandé) + 1 carte décisive de Mort Subite ("suddenDeathCard") de niveau "DIFFICILE".
3. Chaque carte est un QCM piège mais rigoureux et juste à 4 choix ("options" : tableau de 4 chaînes courtes et claires).
4. Les distracteurs (mauvais choix) doivent être des erreurs classiques d'élèves (confusions fréquentes, oublis de signe, dates proches) pour rendre le duel palpitant.
5. "correctIndex" est l'entier entre 0 et 3 correspondant à la bonne réponse.
6. "explanation" est une explication pédagogique ultra-claire en 1 à 2 phrases qui aide l'élève à retenir la règle ou l'astuce.
7. "blurTargets" doit contenir EXACTEMENT 2 mots importants (de plus de 3 lettres) qui apparaissent TEXTUELLEMENT dans la chaîne "question" (utilisés par la carte Joker "Brouillard" pour flouter 2 mots de la question adverse).`;

      const cardSchema = {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
            description: "L'énoncé clair de la question ou formule.",
          },
          tier: {
            type: Type.STRING,
            description: 'Calibre de la carte : "FACILE", "MOYEN" ou "DIFFICILE".',
          },
          blurTargets: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Exactement 2 mots-clés présents dans l'énoncé question à flouter avec le Joker Brouillard.",
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Exactement 4 propositions de réponse.",
          },
          correctIndex: {
            type: Type.INTEGER,
            description: "Index de la bonne réponse (0, 1, 2 ou 3).",
          },
          explanation: {
            type: Type.STRING,
            description: "Explication courte et pédagogique en 1 ou 2 phrases.",
          },
        },
        required: ['question', 'tier', 'blurTargets', 'options', 'correctIndex', 'explanation'],
      };

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Tu es un professeur agrégé et concepteur de jeux éducatifs français pour le Brevet (Collège) et le Bac (Lycée). Tu réponds exclusivement en JSON valide selon le schéma demandé, en français irréprochable.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Titre court du deck généré.',
              },
              subtitle: {
                type: Type.STRING,
                description: 'Sous-titre résumant les notions clés.',
              },
              category: {
                type: Type.STRING,
                description: 'Matière principale (ex: Maths, Histoire-Géo, SVT, Physique-Chimie, Français, Philosophie).',
              },
              cards: {
                type: Type.ARRAY,
                items: cardSchema,
                description: 'Exactement 12 cartes QCM.',
              },
              suddenDeathCard: cardSchema,
            },
            required: ['title', 'subtitle', 'category', 'cards', 'suddenDeathCard'],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);

      if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
        return res.status(502).json({
          error: "L'IA n'a pas pu structurer les 12 cartes. Veuillez réessayer avec un thème ou cours plus explicite.",
        });
      }

      // Helper to shuffle the 4 options of a card using Fisher-Yates so the correct answer is evenly distributed across A, B, C, and D
      const shuffleCardOptions = (options: string[], correctIdx: number) => {
        const safeOptions = options.length === 4 ? [...options] : ['Choix A', 'Choix B', 'Choix C', 'Choix D'];
        const safeCorrectIdx = correctIdx >= 0 && correctIdx <= 3 ? correctIdx : 0;
        const tagged = safeOptions.map((text, i) => ({
          text,
          isCorrect: i === safeCorrectIdx,
        }));
        for (let i = tagged.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = tagged[i];
          tagged[i] = tagged[j];
          tagged[j] = temp;
        }
        return {
          options: tagged.map((t) => t.text),
          correctIndex: tagged.findIndex((t) => t.isCorrect),
        };
      };

      const normalizeTier = (rawTier: any, idx: number): 'FACILE' | 'MOYEN' | 'DIFFICILE' => {
        if (rawTier === 'FACILE' || rawTier === 'MOYEN' || rawTier === 'DIFFICILE') return rawTier;
        if (idx < 4) return 'FACILE';
        if (idx < 8) return 'MOYEN';
        return 'DIFFICILE';
      };

      const normalizedCards = parsed.cards.slice(0, 12).map((c: any, idx: number) => {
        const rawOpts = Array.isArray(c.options) ? c.options.slice(0, 4).map(String) : ['Choix A', 'Choix B', 'Choix C', 'Choix D'];
        const rawCorrect = typeof c.correctIndex === 'number' ? c.correctIndex : 0;
        const shuffled = shuffleCardOptions(rawOpts, rawCorrect);
        return {
          id: `ai-card-${Date.now()}-${idx}`,
          category: parsed.category || 'Personnalisé',
          difficulty: level === 'Lycée' ? 'Lycée' : 'Collège',
          tier: normalizeTier(c.tier, idx),
          question: String(c.question || ''),
          blurTargets: Array.isArray(c.blurTargets) ? c.blurTargets.slice(0, 2).map(String) : [],
          options: shuffled.options,
          correctIndex: shuffled.correctIndex,
          explanation: String(c.explanation || ''),
        };
      });

      const rawSD = parsed.suddenDeathCard || parsed.cards[0];
      const sdShuffled = shuffleCardOptions(
        Array.isArray(rawSD.options) ? rawSD.options.slice(0, 4).map(String) : ['Choix A', 'Choix B', 'Choix C', 'Choix D'],
        typeof rawSD.correctIndex === 'number' ? rawSD.correctIndex : 0
      );
      const suddenDeathCard = {
        id: `ai-sd-${Date.now()}`,
        category: parsed.category || 'Personnalisé',
        difficulty: level === 'Lycée' ? 'Lycée' : 'Collège',
        tier: 'DIFFICILE' as const,
        question: String(rawSD.question || ''),
        blurTargets: Array.isArray(rawSD.blurTargets) ? rawSD.blurTargets.slice(0, 2).map(String) : [],
        options: sdShuffled.options,
        correctIndex: sdShuffled.correctIndex,
        explanation: String(rawSD.explanation || ''),
      };

      return res.json({
        deck: {
          id: `custom-${Date.now()}`,
          title: String(parsed.title || theme || 'Deck Sur-Mesure'),
          subtitle: String(parsed.subtitle || '12 cartes pièges générées par IA'),
          category: String(parsed.category || 'Sur-Mesure'),
          level: level === 'Lycée' ? 'Lycée' : 'Collège',
          isCustom: true,
          cards: normalizedCards,
          suddenDeathCard,
        },
      });
    } catch (error: any) {
      console.error('Error in /api/generate-deck:', error);
      const status = error?.status || 500;
      const message =
        error?.message || "Erreur lors de la génération du deck par l'IA. Vérifiez votre connexion ou la clé Gemini.";
      return res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Révis'Clash server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

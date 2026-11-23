import React, { useState } from 'react';
import {
  BookOpen,
  Bot,
  Check,
  Clock,
  CloudFog,
  Eye,
  Flame,
  Gauge,
  Loader2,
  Play,
  PlusCircle,
  ShieldAlert,
  Sparkles,
  Swords,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { BossId, Deck, DifficultyTier, GameMode, JokerType, SchoolLevel } from '../types';
import { BOSS_PROFILES, DIFFICULTY_CONFIGS, JOKER_CATALOG } from '../data/decks';

interface LobbyViewProps {
  decks: Deck[];
  selectedDeckId: string;
  onSelectDeck: (id: string) => void;
  onAddCustomDeck: (deck: Deck) => void;
  onDeleteCustomDeck: (id: string) => void;
  gameMode: GameMode;
  onChangeGameMode: (mode: GameMode) => void;
  difficultyTier: DifficultyTier;
  onChangeDifficultyTier: (tier: DifficultyTier) => void;
  selectedBossId: BossId;
  onSelectBoss: (id: BossId) => void;
  player1Name: string;
  onChangePlayer1Name: (name: string) => void;
  player2Name: string;
  onChangePlayer2Name: (name: string) => void;
  p1Jokers: JokerType[];
  onChangeP1Jokers: (jokers: JokerType[]) => void;
  p2Jokers: JokerType[];
  onChangeP2Jokers: (jokers: JokerType[]) => void;
  onStartDuel: () => void;
  isBigMode: boolean;
}

const ALL_JOKER_TYPES: JokerType[] = ['BROUILLARD', 'CHRONO_HALF', 'DOUBLE_MISE'];
const ALL_DIFFICULTY_TIERS: DifficultyTier[] = ['FACILE', 'MOYEN', 'DIFFICILE', 'EXPERT'];

export const LobbyView: React.FC<LobbyViewProps> = ({
  decks,
  selectedDeckId,
  onSelectDeck,
  onAddCustomDeck,
  onDeleteCustomDeck,
  gameMode,
  onChangeGameMode,
  difficultyTier,
  onChangeDifficultyTier,
  selectedBossId,
  onSelectBoss,
  player1Name,
  onChangePlayer1Name,
  player2Name,
  onChangePlayer2Name,
  p1Jokers,
  onChangeP1Jokers,
  p2Jokers,
  onChangeP2Jokers,
  onStartDuel,
  isBigMode,
}) => {
  const [showGenerator, setShowGenerator] = useState(false);
  const [genLevel, setGenLevel] = useState<SchoolLevel>('Collège');
  const [genDifficulty, setGenDifficulty] = useState<DifficultyTier>('MOYEN');
  const [genTheme, setGenTheme] = useState('');
  const [genCourseText, setGenCourseText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [previewDeck, setPreviewDeck] = useState<Deck | null>(null);

  const selectedDeck = decks.find((d) => d.id === selectedDeckId) || decks[0];
  const currentDiffConfig = DIFFICULTY_CONFIGS[difficultyTier];

  const toggleJokerSelection = (
    current: JokerType[],
    setter: (next: JokerType[]) => void,
    type: JokerType
  ) => {
    if (current.includes(type)) {
      if (current.length > 1) {
        setter(current.filter((t) => t !== type));
      }
    } else {
      if (current.length < 2) {
        setter([...current, type]);
      } else {
        setter([current[1], type]);
      }
    }
  };

  const handleGenerateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenError(null);

    if (genCourseText.trim().length < 20 && genTheme.trim().length < 2) {
      setGenError('Colle ton cours (au moins une phrase) ou indique un thème de chapitre.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseText: genCourseText.trim(),
          theme: genTheme.trim(),
          level: genLevel,
          difficultyTier: genDifficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.deck) {
        throw new Error(data.error || 'Impossible de générer le deck.');
      }

      const newDeck: Deck = {
        ...data.deck,
        accentColor: 'indigo',
      };
      onAddCustomDeck(newDeck);
      onSelectDeck(newDeck.id);
      onChangeDifficultyTier(genDifficulty);
      setShowGenerator(false);
      setGenTheme('');
      setGenCourseText('');
    } catch (err: any) {
      setGenError(err?.message || 'Erreur lors de la génération IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getJokerIcon = (type: JokerType) => {
    if (type === 'BROUILLARD') return <CloudFog className="w-5 h-5 text-sky-500 shrink-0" />;
    if (type === 'CHRONO_HALF') return <Clock className="w-5 h-5 text-rose-500 shrink-0" />;
    return <Flame className="w-5 h-5 text-amber-500 shrink-0" />;
  };

  return (
    <div className="w-full max-w-[1160px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* En-tête d'arène */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
            Arène Tactique 1v1 · 12 Cartes · 4 Niveaux de Difficulté
          </div>
          <h1
            className={`font-display font-extrabold tracking-tight text-slate-900 dark:text-white [text-wrap:balance] ${
              isBigMode ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
            }`}
          >
            Choisis ton Deck, règle la Difficulté et prépare tes 2 Jokers
          </h1>
          <p
            className={`text-slate-600 dark:text-slate-300 leading-relaxed ${
              isBigMode ? 'text-[19px]' : 'text-[15.5px]'
            }`}
          >
            Enchaîne 3 bonnes réponses pour passer <strong>En Feu (x1.5)</strong>, sabote le tour adverse avec le <strong>Brouillard</strong> ou le <strong>Chrono /2</strong>, et récupère ta fiche des erreurs en fin de duel.
          </p>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setShowGenerator((prev) => !prev)}
            className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              showGenerator
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{showGenerator ? 'Masquer le Générateur IA' : 'Générateur de Deck Express'}</span>
          </button>
        </div>
      </section>

      {/* 1. Générateur de Deck Express (IA Gemini) */}
      {showGenerator && (
        <section className="rounded-2xl border border-indigo-200 dark:border-indigo-900/70 bg-white dark:bg-[#151f32] p-5 sm:p-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2
                className={`font-display font-bold text-slate-900 dark:text-white ${
                  isBigMode ? 'text-2xl' : 'text-lg sm:text-xl'
                }`}
              >
                Générateur de Deck Express par IA
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Colle ton cours ou indique un chapitre : l&apos;IA forge 12 cartes-questions pièges (QCM 4 choix) + 1 carte Mort Subite.
              </p>
            </div>

            {/* Sélecteurs Cycle (Collège/Lycée) + Difficulté IA */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                {(['Collège', 'Lycée'] as SchoolLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setGenLevel(lvl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      genLevel === lvl
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {lvl === 'Collège' ? 'Collège (Brevet)' : 'Lycée (Bac)'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                {ALL_DIFFICULTY_TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setGenDifficulty(tier)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      genDifficulty === tier
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {DIFFICULTY_CONFIGS[tier].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleGenerateDeck} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Thème ou Chapitre
                </label>
                <input
                  type="text"
                  value={genTheme}
                  onChange={(e) => setGenTheme(e.target.value)}
                  placeholder="Ex: Loi d'Ohm, Révolution 1789, Dérivées..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3.5 py-2.5 text-sm focus:outline-2 focus:outline-indigo-500"
                />
                <div className="pt-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                    Idées rapides :
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Physique : Électricité & Loi d’Ohm',
                      'Français : Figures de style Brevet',
                      'Histoire : La Révolution française',
                      'Maths Bac : Suites & Dérivées',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setGenTheme(preset)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Ou colle directement ton extrait de cours / fiche (optionnel si thème rempli)
                </label>
                <textarea
                  rows={4}
                  value={genCourseText}
                  onChange={(e) => setGenCourseText(e.target.value)}
                  placeholder="Colle ici tes notes de cours, définitions, dates ou formules..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-3.5 text-sm focus:outline-2 focus:outline-indigo-500"
                />
              </div>
            </div>

            {genError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{genError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowGenerator(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Forgeage des 12 cartes ({DIFFICULTY_CONFIGS[genDifficulty].label})...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Générer le Deck ({DIFFICULTY_CONFIGS[genDifficulty].label})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Grille Principale : Sélection du Deck (Gauche) + Configuration Duel, Difficulté & Jokers (Droite) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLONNE GAUCHE : Les Decks (7 cols) */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className={`font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 ${
                isBigMode ? 'text-2xl' : 'text-lg sm:text-xl'
              }`}
            >
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>1. Choisis ton Deck de combat ({decks.length} disponibles)</span>
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              4 paliers : Facile, Moyen, Difficile, Expert
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {decks.map((deck) => {
              const isSelected = deck.id === selectedDeck.id;
              return (
                <div
                  key={deck.id}
                  onClick={() => onSelectDeck(deck.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectDeck(deck.id);
                    }
                  }}
                  className={`group relative rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white dark:bg-[#1e293b] border-indigo-600 dark:border-indigo-400 ring-2 ring-indigo-500/30 shadow-md'
                      : 'bg-white/80 dark:bg-[#151f32] border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>
                        {deck.category} · {deck.level} · {deck.cards.length} cartes
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewDeck(deck);
                          }}
                          title="Aperçu des cartes de ce deck"
                          aria-label={`Aperçu des cartes du deck ${deck.title}`}
                          className="p-1 rounded-lg hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {deck.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCustomDeck(deck.id);
                            }}
                            aria-label={`Supprimer le deck ${deck.title}`}
                            className="p-1 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3
                      className={`font-display font-bold text-slate-900 dark:text-white mb-1 ${
                        isBigMode ? 'text-xl' : 'text-[17px]'
                      }`}
                    >
                      {deck.title}
                    </h3>
                    <p
                      className={`text-slate-600 dark:text-slate-300 line-clamp-2 ${
                        isBigMode ? 'text-[16px]' : 'text-[13.5px]'
                      }`}
                    >
                      {deck.subtitle}
                    </p>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                    <span
                      className={
                        isSelected
                          ? 'text-indigo-600 dark:text-indigo-400 flex items-center gap-1'
                          : 'text-slate-500 dark:text-slate-400'
                      }
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Deck équipé</span>
                        </>
                      ) : (
                        <span>Cliquer pour équiper</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewDeck(deck);
                      }}
                      className="text-slate-400 hover:text-indigo-500 underline cursor-pointer"
                    >
                      Voir les 12 cartes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* COLONNE DROITE : Niveau de Difficulté, Mode de Jeu & Draft des 2 Cartes Joker (5 cols) */}
        <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151f32] p-5 sm:p-6 space-y-6 shadow-xs">
          {/* 2. Niveau de Difficulté du Duel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2
                className={`font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 ${
                  isBigMode ? 'text-2xl' : 'text-lg sm:text-xl'
                }`}
              >
                <Gauge className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>2. Niveau de Difficulté</span>
              </h2>
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                x{currentDiffConfig.scoreMultiplier.toFixed(1)} pts · {currentDiffConfig.turnSeconds}s
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90">
              {ALL_DIFFICULTY_TIERS.map((tier) => {
                const cfg = DIFFICULTY_CONFIGS[tier];
                const isActive = difficultyTier === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => onChangeDifficultyTier(tier)}
                    className={`py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? tier === 'EXPERT'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : tier === 'DIFFICILE'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
              <span>{currentDiffConfig.subtitle}</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                Chrono /2 : {currentDiffConfig.sabotagedSeconds}s
              </span>
            </div>
          </div>

          {/* 3. Choix du Mode de Jeu */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h2
              className={`font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 ${
                isBigMode ? 'text-2xl' : 'text-lg sm:text-xl'
              }`}
            >
              <Swords className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>3. Mode de Duel</span>
            </h2>

            <div className="grid grid-cols-2 gap-2.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90">
              <button
                type="button"
                onClick={() => onChangeGameMode('BOSS_SOLO')}
                className={`py-2.5 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  gameMode === 'BOSS_SOLO'
                    ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Bot className="w-4 h-4 shrink-0" />
                <span>Boss Fight Solo</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeGameMode('PASS_AND_PLAY')}
                className={`py-2.5 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  gameMode === 'PASS_AND_PLAY'
                    ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Pass &amp; Play (1v1)</span>
              </button>
            </div>

            {gameMode === 'BOSS_SOLO' ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Ton pseudo de duelliste
                  </label>
                  <input
                    type="text"
                    value={player1Name}
                    onChange={(e) => onChangePlayer1Name(e.target.value)}
                    maxLength={20}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Choisis ton IA rivale (Temps réel) :
                  </span>
                  <div className="space-y-2">
                    {BOSS_PROFILES.map((boss) => {
                      const active = boss.id === selectedBossId;
                      const effectiveAcc = Math.min(
                        98,
                        Math.max(35, Math.round((boss.accuracy + currentDiffConfig.bossAccuracyBoost) * 100))
                      );
                      return (
                        <button
                          key={boss.id}
                          type="button"
                          onClick={() => onSelectBoss(boss.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                            active
                              ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {boss.name}
                            </span>
                            <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                              Précision {effectiveAcc}%
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {boss.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Pseudo Joueur 1
                  </label>
                  <input
                    type="text"
                    value={player1Name}
                    onChange={(e) => onChangePlayer1Name(e.target.value)}
                    maxLength={18}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Pseudo Joueur 2
                  </label>
                  <input
                    type="text"
                    value={player2Name}
                    onChange={(e) => onChangePlayer2Name(e.target.value)}
                    maxLength={18}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-sm font-semibold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Sélection libre des 2 Cartes Joker */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>4. Choisis tes 2 Cartes Joker ({player1Name || 'Joueur 1'})</span>
              </h3>
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {p1Jokers.length}/2
              </span>
            </div>

            <div className="space-y-2">
              {ALL_JOKER_TYPES.map((jType) => {
                const info = JOKER_CATALOG[jType];
                const isPicked = p1Jokers.includes(jType);
                return (
                  <button
                    key={jType}
                    type="button"
                    onClick={() => toggleJokerSelection(p1Jokers, onChangeP1Jokers, jType)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                      isPicked
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="mt-0.5">{getJokerIcon(jType)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {info.name}
                        </span>
                        {isPicked && (
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Équipée
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {info.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Si Pass & Play, choix des 2 Jokers du Joueur 2 */}
            {gameMode === 'PASS_AND_PLAY' && (
              <div className="pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    Cartes Joker de {player2Name || 'Joueur 2'} :
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {p2Jokers.length}/2
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_JOKER_TYPES.map((jType) => {
                    const info = JOKER_CATALOG[jType];
                    const isPicked = p2Jokers.includes(jType);
                    return (
                      <button
                        key={jType}
                        type="button"
                        onClick={() => toggleJokerSelection(p2Jokers, onChangeP2Jokers, jType)}
                        className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                          isPicked
                            ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {info.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bouton Lancer le Duel */}
          <button
            type="button"
            onClick={onStartDuel}
            disabled={p1Jokers.length !== 2 || (gameMode === 'PASS_AND_PLAY' && p2Jokers.length !== 2)}
            className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-display font-bold text-base sm:text-lg shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>
              Lancer le Duel · {currentDiffConfig.label} ({selectedDeck.title})
            </span>
          </button>
        </section>
      </div>

      {/* MODALE D'APERÇU DES 12 CARTES DU DECK */}
      {previewDeck && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewDeck(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[82vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg sm:text-xl">
                  Aperçu du Deck : {previewDeck.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {previewDeck.cards.length} cartes QCM à difficulté progressive + 1 carte Mort Subite
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDeck(null)}
                className="p-1.5 rounded-full hover:bg-slate-500/10 cursor-pointer"
                aria-label="Fermer l'aperçu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 divide-y divide-slate-200 dark:divide-slate-800">
              {previewDeck.cards.map((card, i) => {
                const tierLabel = card.tier || (i < 4 ? 'FACILE' : i < 8 ? 'MOYEN' : 'DIFFICILE');
                return (
                  <div key={card.id} className="pt-3 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-bold">Carte #{i + 1}</span>
                      <span>Calibre : {tierLabel}</span>
                    </div>
                    <p className="font-semibold text-sm sm:text-base">{card.question}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      4 choix : {card.options.join(' · ')}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreviewDeck(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectDeck(previewDeck.id);
                  setPreviewDeck(null);
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold cursor-pointer"
              >
                Équiper ce Deck
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect } from 'react';
import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  Flame,
  Gauge,
  Home,
  Printer,
  RotateCcw,
  Swords,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  Deck,
  DifficultyTier,
  GameMode,
  MissedQuestionRecord,
  PlayerMatchState,
} from '../types';
import { DIFFICULTY_CONFIGS } from '../data/decks';

interface SummaryViewProps {
  deck: Deck;
  gameMode: GameMode;
  difficultyTier: DifficultyTier;
  p1: PlayerMatchState;
  p2: PlayerMatchState;
  missedRecords: MissedQuestionRecord[];
  wasSuddenDeath: boolean;
  isBigMode: boolean;
  onReplaySameDeck: () => void;
  onPracticeMissedOnly: () => void;
  onBackToLobby: () => void;
  onActiveTextChange: (text: string) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  deck,
  gameMode,
  difficultyTier,
  p1,
  p2,
  missedRecords,
  wasSuddenDeath,
  isBigMode,
  onReplaySameDeck,
  onPracticeMissedOnly,
  onBackToLobby,
  onActiveTextChange,
}) => {
  const isP1Winner = p1.score >= p2.score;
  const winner = isP1Winner ? p1 : p2;
  const diffConfig = DIFFICULTY_CONFIGS[difficultyTier];

  useEffect(() => {
    const missedSummary =
      missedRecords.length === 0
        ? 'Félicitations, aucune erreur commise pendant ce duel !'
        : missedRecords
            .map(
              (m, i) =>
                `Point à retenir ${i + 1} : ${m.card.question}. Bonne réponse : ${
                  m.card.options[m.card.correctIndex]
                }. ${m.card.explanation}`
            )
            .join(' ');

    onActiveTextChange(
      `Fin du duel en mode ${diffConfig.label} sur ${deck.title}. Victoire de ${winner.name} avec ${winner.score} points contre ${
        isP1Winner ? p2.score : p1.score
      } points. Ce que tu dois retenir : ${missedSummary}`
    );
  }, [
    deck.title,
    diffConfig.label,
    winner,
    isP1Winner,
    p1.score,
    p2.score,
    missedRecords,
    onActiveTextChange,
  ]);

  const calcAccuracy = (player: PlayerMatchState) =>
    player.totalAnswered > 0 ? Math.round((player.correctCount / player.totalAnswered) * 100) : 0;

  return (
    <div className="w-full max-w-[960px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* 1. Bannière du Vainqueur & Scores */}
      <section className="rounded-2xl border-2 border-indigo-500/80 bg-white dark:bg-[#151f32] p-6 sm:p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <Trophy className="w-4 h-4" />
              <span>
                {wasSuddenDeath
                  ? 'Victoire arrachée en Mort Subite !'
                  : `Résultat du Duel · ${deck.title}`}
              </span>
              <span>·</span>
              <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5" />
                Difficulté {diffConfig.label} (x{diffConfig.scoreMultiplier.toFixed(1)})
              </span>
            </div>
            <h1
              className={`font-display font-extrabold text-slate-900 dark:text-white ${
                isBigMode ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
              }`}
            >
              {winner.name} remporte l&apos;Arène avec {winner.score} pts !
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {gameMode === 'BOSS_SOLO'
                ? isP1Winner
                  ? `Tu as terrassé ${p2.name} en difficulté ${diffConfig.label} !`
                  : `${p2.name} l'emporte cette fois. Relis ta fiche ci-dessous et prends ta revanche !`
                : `Beau duel en Pass & Play (${diffConfig.label}) entre ${p1.name} et ${p2.name}.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 no-print">
            {missedRecords.length > 0 && (
              <button
                type="button"
                onClick={onPracticeMissedOnly}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Swords className="w-4 h-4" />
                <span>Rejouer mes erreurs ({missedRecords.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={onReplaySameDeck}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Revanche</span>
            </button>
            <button
              type="button"
              onClick={onBackToLobby}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm flex items-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Changer de Deck</span>
            </button>
          </div>
        </div>

        {/* Tableau comparatif des 2 Duellistes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
          {[p1, p2].map((player, idx) => {
            const isWin = (idx === 0 && isP1Winner) || (idx === 1 && !isP1Winner);
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  isWin
                    ? 'border-amber-500/80 bg-amber-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{player.name}</span>
                    {isWin && <Award className="w-5 h-5 text-amber-500" />}
                  </span>
                  <span className="font-mono font-extrabold text-2xl tabular-nums text-indigo-600 dark:text-indigo-400">
                    {player.score} pts
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Précision</span>
                    <span className="font-mono font-bold text-sm tabular-nums">
                      {calcAccuracy(player)}% ({player.correctCount}/{player.totalAnswered})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Meilleur Combo</span>
                    <span className="font-mono font-bold text-sm tabular-nums flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      {player.maxStreak}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Temps moyen</span>
                    <span className="font-mono font-bold text-sm tabular-nums">
                      {player.totalAnswered > 0
                        ? `${(player.totalTimeMs / player.totalAnswered / 1000).toFixed(1)}s`
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Mini-Fiche Propre : "Ce que tu dois retenir" (Questions ratées) */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151f32] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <BookOpenCheck className="w-4 h-4" />
              <span>Fiche de Révision Personnalisée</span>
            </div>
            <h2
              className={`font-display font-extrabold text-slate-900 dark:text-white ${
                isBigMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
              }`}
            >
              Ce que tu dois retenir ({missedRecords.length}{' '}
              {missedRecords.length <= 1 ? 'question à revoir' : 'questions à revoir'})
            </h2>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="no-print self-start sm:self-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer cette fiche</span>
          </button>
        </div>

        {missedRecords.length === 0 ? (
          <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              Sans-faute intégral (100% de réussite) !
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Aucune question n&apos;a été ratée pendant ce duel. Passe au niveau de difficulté supérieur pour tester tes réflexes !
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {missedRecords.map((item, idx) => {
              const wrongAnswerText =
                item.chosenIndex !== null
                  ? item.card.options[item.chosenIndex]
                  : 'Temps écoulé (non répondu)';
              const rightAnswerText = item.card.options[item.card.correctIndex];

              return (
                <article
                  key={`${item.card.id}-${idx}`}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      Point #{idx + 1} · {item.card.category} ({item.card.tier || item.card.difficulty})
                    </span>
                    <span className="font-semibold">Manqué par {item.playerName}</span>
                  </div>

                  <h3
                    className={`font-display font-bold text-slate-900 dark:text-white ${
                      isBigMode ? 'text-xl' : 'text-base sm:text-lg'
                    }`}
                  >
                    {item.card.question}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold uppercase text-rose-600 dark:text-rose-400 block">
                          Piège choisi
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">
                          {wrongAnswerText}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                          Bonne réponse
                        </span>
                        <span className="text-slate-900 dark:text-white font-bold">
                          {rightAnswerText}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-start gap-2">
                    <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
                    <p
                      className={`text-slate-700 dark:text-slate-200 leading-relaxed ${
                        isBigMode ? 'text-[17.5px]' : 'text-[14px]'
                      }`}
                    >
                      <strong>L&apos;explication à retenir :</strong> {item.card.explanation}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

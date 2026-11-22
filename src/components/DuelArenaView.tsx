import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  CloudFog,
  Flame,
  Smartphone,
  Sparkles,
  Swords,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  BossProfile,
  Deck,
  GameMode,
  JokerCard,
  JokerType,
  MissedQuestionRecord,
  PlayerMatchState,
  QuestionCard,
} from '../types';
import { soundFX } from '../utils/sound';

interface DuelArenaViewProps {
  deck: Deck;
  gameMode: GameMode;
  boss: BossProfile;
  initialP1: PlayerMatchState;
  initialP2: PlayerMatchState;
  isBigMode: boolean;
  onFinishDuel: (
    p1: PlayerMatchState,
    p2: PlayerMatchState,
    missed: MissedQuestionRecord[],
    wasSuddenDeath: boolean
  ) => void;
  onActiveTextChange: (text: string) => void;
}

type ArenaPhase = 'PLAYING_CARD' | 'CARD_RESULT' | 'PASS_TRANSITION' | 'SUDDEN_DEATH_INTRO';

const DEFAULT_TIME_SEC = 12;
const SABOTAGED_TIME_SEC = 6;
const SUDDEN_DEATH_TIME_SEC = 8;

export const DuelArenaView: React.FC<DuelArenaViewProps> = ({
  deck,
  gameMode,
  boss,
  initialP1,
  initialP2,
  isBigMode,
  onFinishDuel,
  onActiveTextChange,
}) => {
  const [p1, setP1] = useState<PlayerMatchState>(initialP1);
  const [p2, setP2] = useState<PlayerMatchState>(initialP2);
  const [cardIndex, setCardIndex] = useState(0);
  const [isSuddenDeath, setIsSuddenDeath] = useState(false);
  const [sdPassTurn, setSdPassTurn] = useState<0 | 1>(0); // In Pass & Play sudden death, P1 then P2 answers
  const [sdP1Result, setSdP1Result] = useState<{ correct: boolean; timeMs: number } | null>(null);

  const [phase, setPhase] = useState<ArenaPhase>('PLAYING_CARD');
  const [missedRecords, setMissedRecords] = useState<MissedQuestionRecord[]>([]);

  // Active sabotage / buffs on current turn
  const [activeBlurForCurrentTurn, setActiveBlurForCurrentTurn] = useState(false);
  const [blurRemainingMs, setBlurRemainingMs] = useState(0);
  const [activeChronoHalfForCurrentTurn, setActiveChronoHalfForCurrentTurn] = useState(false);
  const [activeDoubleMiseForCurrentTurn, setActiveDoubleMiseForCurrentTurn] = useState(false);

  // Sabotage queued for opponent's NEXT turn (Pass & Play) or Boss
  const [queuedBlurAgainstOpponent, setQueuedBlurAgainstOpponent] = useState(false);
  const [queuedChronoAgainstOpponent, setQueuedChronoAgainstOpponent] = useState(false);

  // Boss Solo real-time state
  const [bossStatusText, setBossStatusText] = useState<string>('Analyse la carte...');
  const [bossAnswered, setBossAnswered] = useState(false);
  const [bossCorrect, setBossCorrect] = useState<boolean | null>(null);
  const [bossLastPoints, setBossLastPoints] = useState<number>(0);
  const [bossSabotagedByBlur, setBossSabotagedByBlur] = useState(false);
  const [bossSabotagedByChrono, setBossSabotagedByChrono] = useState(false);

  // Current turn answer state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [lastPointsEarned, setLastPointsEarned] = useState<number>(0);

  // Timer state
  const maxTurnSeconds = isSuddenDeath
    ? SUDDEN_DEATH_TIME_SEC
    : activeChronoHalfForCurrentTurn
      ? SABOTAGED_TIME_SEC
      : DEFAULT_TIME_SEC;

  const [timeLeftSec, setTimeLeftSec] = useState<number>(DEFAULT_TIME_SEC);
  const turnStartRef = useRef<number>(Date.now());
  const bossTimeoutRef = useRef<number | null>(null);

  // Determine whose turn it is in Pass & Play (Even index = P1, Odd index = P2)
  const activePlayerIndex: 0 | 1 =
    gameMode === 'BOSS_SOLO'
      ? 0
      : isSuddenDeath
        ? sdPassTurn
        : (cardIndex % 2 === 0 ? 0 : 1);

  const activePlayer = activePlayerIndex === 0 ? p1 : p2;
  const currentCard: QuestionCard = isSuddenDeath
    ? deck.suddenDeathCard
    : deck.cards[cardIndex] || deck.cards[0];

  // Report current card text to parent for TTS speechSynthesis
  useEffect(() => {
    if (phase === 'PLAYING_CARD' || phase === 'CARD_RESULT') {
      const choicesText = currentCard.options
        .map((opt, idx) => `Réponse ${['A', 'B', 'C', 'D'][idx]} : ${opt}.`)
        .join(' ');
      const explText = phase === 'CARD_RESULT' ? `Explication : ${currentCard.explanation}` : '';
      onActiveTextChange(
        `Question ${isSuddenDeath ? 'Mort Subite' : cardIndex + 1} : ${currentCard.question}. ${choicesText} ${explText}`
      );
    }
  }, [currentCard, phase, cardIndex, isSuddenDeath, onActiveTextChange]);

  // Initialize a new card turn
  const startCardTurn = (
    applyBlur = false,
    applyChronoHalf = false
  ) => {
    soundFX.playCardDraw();
    setSelectedOption(null);
    setLastPointsEarned(0);
    setActiveDoubleMiseForCurrentTurn(false);
    setActiveBlurForCurrentTurn(applyBlur);
    setBlurRemainingMs(applyBlur ? 3000 : 0);
    setActiveChronoHalfForCurrentTurn(applyChronoHalf);

    const turnSec = isSuddenDeath
      ? SUDDEN_DEATH_TIME_SEC
      : applyChronoHalf
        ? SABOTAGED_TIME_SEC
        : DEFAULT_TIME_SEC;
    setTimeLeftSec(turnSec);
    turnStartRef.current = Date.now();
    setPhase('PLAYING_CARD');

    // In BOSS_SOLO mode, schedule Boss AI real-time thinking & occasional Boss Joker usage
    if (gameMode === 'BOSS_SOLO') {
      setBossAnswered(false);
      setBossCorrect(null);
      setBossLastPoints(0);
      setBossSabotagedByBlur(false);
      setBossSabotagedByChrono(false);
      setBossStatusText(`${boss.name} lit l'énoncé...`);

      // Check if Boss uses an unused offensive Joker on player (25% chance after round 2)
      if (!isSuddenDeath && cardIndex >= 2) {
        const availableBossJokers = p2.jokers.filter(
          (j) => !j.used && (j.type === 'BROUILLARD' || j.type === 'CHRONO_HALF')
        );
        if (availableBossJokers.length > 0 && Math.random() < 0.28) {
          const chosen = availableBossJokers[0];
          setP2((prev) => ({
            ...prev,
            jokers: prev.jokers.map((j) => (j.id === chosen.id ? { ...j, used: true } : j)),
          }));
          soundFX.playJoker();
          if (chosen.type === 'BROUILLARD') {
            setActiveBlurForCurrentTurn(true);
            setBlurRemainingMs(3000);
          } else if (chosen.type === 'CHRONO_HALF') {
            setActiveChronoHalfForCurrentTurn(true);
            setTimeLeftSec(SABOTAGED_TIME_SEC);
          }
        }
      }
    }
  };

  useEffect(() => {
    startCardTurn(false, false);
    return () => {
      if (bossTimeoutRef.current) window.clearTimeout(bossTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3-second countdown for Brouillard blur effect
  useEffect(() => {
    if (!activeBlurForCurrentTurn || phase !== 'PLAYING_CARD') return;
    const timer = window.setInterval(() => {
      setBlurRemainingMs((prev) => {
        if (prev <= 200) {
          setActiveBlurForCurrentTurn(false);
          window.clearInterval(timer);
          return 0;
        }
        return prev - 200;
      });
    }, 200);
    return () => window.clearInterval(timer);
  }, [activeBlurForCurrentTurn, phase]);

  // Main turn countdown timer
  useEffect(() => {
    if (phase !== 'PLAYING_CARD') return;
    const interval = window.setInterval(() => {
      const elapsedSec = (Date.now() - turnStartRef.current) / 1000;
      const remaining = Math.max(0, maxTurnSeconds - elapsedSec);
      setTimeLeftSec(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
        handleAnswerSubmission(null);
      }
    }, 100);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, maxTurnSeconds, cardIndex, isSuddenDeath, sdPassTurn]);

  // Simulate Boss AI answering in real time during PLAYING_CARD
  useEffect(() => {
    if (gameMode !== 'BOSS_SOLO' || phase !== 'PLAYING_CARD' || bossAnswered) return;

    const baseDelay =
      boss.minThinkMs + Math.random() * (boss.maxThinkMs - boss.minThinkMs);
    const delayWithBlur = bossSabotagedByBlur ? baseDelay + 2200 : baseDelay;
    const maxAllowedMs = (bossSabotagedByChrono ? SABOTAGED_TIME_SEC : maxTurnSeconds) * 1000;

    const timer = window.setTimeout(() => {
      if (delayWithBlur >= maxAllowedMs) {
        // Boss timed out due to player's Chrono /2 sabotage!
        setBossAnswered(true);
        setBossCorrect(false);
        setBossLastPoints(0);
        setBossStatusText(`${boss.name} a manqué de temps !`);
        setP2((prev) => ({
          ...prev,
          streak: 0,
          totalAnswered: prev.totalAnswered + 1,
          totalTimeMs: prev.totalTimeMs + maxAllowedMs,
        }));
        return;
      }

      const effectiveAccuracy = bossSabotagedByBlur
        ? Math.max(0.25, boss.accuracy - 0.25)
        : boss.accuracy;
      const isRight = Math.random() < effectiveAccuracy;

      setBossAnswered(true);
      setBossCorrect(isRight);
      setBossStatusText(`${boss.name} a verrouillé sa carte !`);

      setP2((prev) => {
        const nextStreak = isRight ? prev.streak + 1 : 0;
        const isOnFire = nextStreak >= 3;
        const speedBonus = Math.max(0, Math.round(((maxAllowedMs - delayWithBlur) / maxAllowedMs) * 50));
        let pts = isRight ? 100 + speedBonus : 0;
        if (isOnFire) pts = Math.round(pts * 1.5);
        setBossLastPoints(pts);

        return {
          ...prev,
          score: prev.score + pts,
          streak: nextStreak,
          maxStreak: Math.max(prev.maxStreak, nextStreak),
          correctCount: isRight ? prev.correctCount + 1 : prev.correctCount,
          totalAnswered: prev.totalAnswered + 1,
          totalTimeMs: prev.totalTimeMs + delayWithBlur,
        };
      });
    }, Math.min(delayWithBlur, maxAllowedMs));

    bossTimeoutRef.current = timer;
    return () => window.clearTimeout(timer);
  }, [
    gameMode,
    phase,
    bossAnswered,
    boss,
    bossSabotagedByBlur,
    bossSabotagedByChrono,
    maxTurnSeconds,
  ]);

  // Activate a Joker card during the turn
  const handleUseJoker = (joker: JokerCard) => {
    if (joker.used || phase !== 'PLAYING_CARD') return;
    soundFX.playJoker();

    // Mark joker as used for active player
    const markUsed = (playerState: PlayerMatchState): PlayerMatchState => ({
      ...playerState,
      jokers: playerState.jokers.map((j) => (j.id === joker.id ? { ...j, used: true } : j)),
    });

    if (activePlayerIndex === 0) {
      setP1(markUsed);
    } else {
      setP2(markUsed);
    }

    if (joker.type === 'DOUBLE_MISE') {
      setActiveDoubleMiseForCurrentTurn(true);
    } else if (joker.type === 'BROUILLARD') {
      if (gameMode === 'BOSS_SOLO') {
        setBossSabotagedByBlur(true);
        setBossStatusText(`${boss.name} est aveuglé par ton Brouillard !`);
      } else {
        setQueuedBlurAgainstOpponent(true);
      }
    } else if (joker.type === 'CHRONO_HALF') {
      if (gameMode === 'BOSS_SOLO') {
        setBossSabotagedByChrono(true);
        setBossStatusText(`Chrono /2 lancé contre ${boss.name} !`);
      } else {
        setQueuedChronoAgainstOpponent(true);
      }
    }
  };

  const handleAnswerSubmission = (optionIndex: number | null) => {
    if (phase !== 'PLAYING_CARD') return;

    const elapsedMs = Math.min(maxTurnSeconds * 1000, Date.now() - turnStartRef.current);
    const isCorrect = optionIndex !== null && optionIndex === currentCard.correctIndex;
    setSelectedOption(optionIndex);

    // Calculate score with speed bonus, Combo "En Feu" (x1.5 at 3+ streak), and "Double Mise" (x2 or -50)
    const updateActivePlayer = (prev: PlayerMatchState): PlayerMatchState => {
      const nextStreak = isCorrect ? prev.streak + 1 : 0;
      const isOnFire = nextStreak >= 3;
      const speedRatio = Math.max(0, (maxTurnSeconds * 1000 - elapsedMs) / (maxTurnSeconds * 1000));
      const speedBonus = Math.round(speedRatio * 50);

      let pointsDelta = 0;
      if (isCorrect) {
        pointsDelta = 100 + speedBonus;
        if (isOnFire) {
          pointsDelta = Math.round(pointsDelta * 1.5);
        }
        if (activeDoubleMiseForCurrentTurn) {
          pointsDelta = pointsDelta * 2;
        }
      } else if (activeDoubleMiseForCurrentTurn) {
        pointsDelta = -50;
      }

      setLastPointsEarned(pointsDelta);

      if (isCorrect) {
        soundFX.playCorrect(isOnFire);
      } else {
        soundFX.playWrong();
      }

      return {
        ...prev,
        score: Math.max(0, prev.score + pointsDelta),
        streak: nextStreak,
        maxStreak: Math.max(prev.maxStreak, nextStreak),
        correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
        totalAnswered: prev.totalAnswered + 1,
        totalTimeMs: prev.totalTimeMs + elapsedMs,
      };
    };

    if (activePlayerIndex === 0) {
      setP1(updateActivePlayer);
    } else {
      setP2(updateActivePlayer);
    }

    // Record missed question for "Ce que tu dois retenir" summary sheet
    if (!isCorrect) {
      setMissedRecords((prev) => [
        ...prev,
        {
          card: currentCard,
          playerName: activePlayer.name,
          chosenIndex: optionIndex,
        },
      ]);
    }

    // If BOSS_SOLO and Boss hasn't answered yet when player clicks, resolve Boss immediately
    if (gameMode === 'BOSS_SOLO' && !bossAnswered) {
      if (bossTimeoutRef.current) window.clearTimeout(bossTimeoutRef.current);
      const effectiveAcc = bossSabotagedByBlur ? Math.max(0.25, boss.accuracy - 0.25) : boss.accuracy;
      const isBossRight = Math.random() < effectiveAcc;
      setBossAnswered(true);
      setBossCorrect(isBossRight);
      setP2((prev) => {
        const nextStreak = isBossRight ? prev.streak + 1 : 0;
        const isOnFire = nextStreak >= 3;
        let pts = isBossRight ? 120 : 0;
        if (isOnFire) pts = Math.round(pts * 1.5);
        setBossLastPoints(pts);
        return {
          ...prev,
          score: prev.score + pts,
          streak: nextStreak,
          maxStreak: Math.max(prev.maxStreak, nextStreak),
          correctCount: isBossRight ? prev.correctCount + 1 : prev.correctCount,
          totalAnswered: prev.totalAnswered + 1,
          totalTimeMs: prev.totalTimeMs + elapsedMs + 500,
        };
      });
    }

    if (isSuddenDeath && gameMode === 'PASS_AND_PLAY' && sdPassTurn === 0) {
      setSdP1Result({ correct: isCorrect, timeMs: elapsedMs });
    }

    setPhase('CARD_RESULT');
  };

  // Proceed after viewing the card explanation
  const handleNextStep = () => {
    // Handle Sudden Death completion
    if (isSuddenDeath) {
      if (gameMode === 'PASS_AND_PLAY' && sdPassTurn === 0) {
        setSdPassTurn(1);
        setPhase('PASS_TRANSITION');
        return;
      }

      // Ensure tie is broken in Sudden Death
      let finalP1 = { ...p1 };
      let finalP2 = { ...p2 };
      if (finalP1.score === finalP2.score) {
        if (gameMode === 'PASS_AND_PLAY' && sdP1Result) {
          // Fastest player in Sudden Death wins +50 tiebreaker bonus
          finalP1.score += 50;
        } else {
          finalP1.score += 50;
        }
      }
      soundFX.playVictory();
      onFinishDuel(finalP1, finalP2, missedRecords, true);
      return;
    }

    const nextIdx = cardIndex + 1;
    if (nextIdx >= deck.cards.length) {
      // Check for tie -> Trigger Sudden Death!
      if (p1.score === p2.score) {
        setIsSuddenDeath(true);
        setPhase('SUDDEN_DEATH_INTRO');
        return;
      }
      soundFX.playVictory();
      onFinishDuel(p1, p2, missedRecords, false);
      return;
    }

    setCardIndex(nextIdx);
    if (gameMode === 'PASS_AND_PLAY') {
      setPhase('PASS_TRANSITION');
    } else {
      startCardTurn(false, false);
    }
  };

  // Render Question Text with 2 words blurred if BROUILLARD is active
  const renderQuestionWithBlur = (question: string, targets: string[]) => {
    if (!activeBlurForCurrentTurn || targets.length === 0) {
      return <span>{question}</span>;
    }

    const normalizedTargets = targets
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length >= 2);

    const tokens = question.split(/(\s+)/);
    let blurredCount = 0;

    return (
      <>
        {tokens.map((token, idx) => {
          const cleanToken = token.replace(/[.,?!;:'"()«»]/g, '').toLowerCase();
          const shouldBlur =
            blurredCount < 2 &&
            cleanToken.length >= 3 &&
            (normalizedTargets.some((t) => cleanToken.includes(t) || t.includes(cleanToken)) ||
              (normalizedTargets.length === 0 && cleanToken.length >= 6));

          if (shouldBlur) {
            blurredCount++;
            return (
              <span
                key={idx}
                className="inline-block px-1.5 mx-0.5 rounded bg-sky-500/20 text-transparent blur-[6px] select-none transition-all duration-300"
                title="Mot flouté par le Joker Brouillard !"
              >
                {token}
              </span>
            );
          }
          return <span key={idx}>{token}</span>;
        })}
      </>
    );
  };

  const getJokerIcon = (type: JokerType) => {
    if (type === 'BROUILLARD') return <CloudFog className="w-4 h-4 text-sky-400 shrink-0" />;
    if (type === 'CHRONO_HALF') return <Clock className="w-4 h-4 text-rose-400 shrink-0" />;
    return <Flame className="w-4 h-4 text-amber-400 shrink-0" />;
  };

  return (
    <div className="w-full max-w-[920px] mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* 1. HUD Tactique Supérieur : Scores, Barres et Combo "En Feu" */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151f32] p-3 sm:p-4 shadow-xs">
        {/* Joueur 1 */}
        <div
          className={`col-span-5 p-2.5 rounded-xl border transition-all ${
            activePlayerIndex === 0
              ? p1.streak >= 3
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-indigo-500 bg-indigo-500/10'
              : 'border-transparent'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
              {p1.name}
            </span>
            {p1.streak >= 3 && (
              <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 whitespace-nowrap">
                <Flame className="w-3.5 h-3.5 fill-amber-500" /> EN FEU x1.5
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-mono font-extrabold text-lg sm:text-2xl tabular-nums text-indigo-600 dark:text-indigo-400">
              {p1.score} <span className="text-xs font-normal">pts</span>
            </span>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Combo {p1.streak}/3
            </span>
          </div>
          {/* Barre de combo */}
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                p1.streak >= 3 ? 'bg-amber-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(100, (p1.streak / 3) * 100)}%` }}
            />
          </div>
        </div>

        {/* Compteur central Manche & Chrono */}
        <div className="col-span-2 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isSuddenDeath ? 'MORT SUBITE' : `Carte ${cardIndex + 1}/12`}
          </span>
          <div
            className={`mt-1 px-2.5 py-1 rounded-xl font-mono font-extrabold text-base sm:text-xl tabular-nums border ${
              timeLeftSec <= 3.5
                ? 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : activeChronoHalfForCurrentTurn
                  ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
            }`}
          >
            {Math.ceil(timeLeftSec)}s
          </div>
        </div>

        {/* Joueur 2 ou Boss IA */}
        <div
          className={`col-span-5 p-2.5 rounded-xl border transition-all text-right ${
            activePlayerIndex === 1
              ? p2.streak >= 3
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-indigo-500 bg-indigo-500/10'
              : 'border-transparent'
          }`}
        >
          <div className="flex items-center justify-between gap-1 flex-row-reverse">
            <span className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate flex items-center gap-1">
              {gameMode === 'BOSS_SOLO' && <Bot className="w-4 h-4 text-rose-500 shrink-0" />}
              <span>{p2.name}</span>
            </span>
            {p2.streak >= 3 && (
              <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 whitespace-nowrap">
                <Flame className="w-3.5 h-3.5 fill-amber-500" /> EN FEU x1.5
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between flex-row-reverse mt-1">
            <span className="font-mono font-extrabold text-lg sm:text-2xl tabular-nums text-rose-600 dark:text-rose-400">
              {p2.score} <span className="text-xs font-normal">pts</span>
            </span>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Combo {p2.streak}/3
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ml-auto ${
                p2.streak >= 3 ? 'bg-amber-500' : 'bg-rose-600'
              }`}
              style={{ width: `${Math.min(100, (p2.streak / 3) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bandeau d'activité temps réel du Boss en mode Solo */}
      {gameMode === 'BOSS_SOLO' && (
        <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="truncate">{bossStatusText}</span>
          </div>
          {phase === 'CARD_RESULT' && (
            <span
              className={`font-mono font-bold shrink-0 ${
                bossCorrect
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {bossCorrect ? `Boss : Correct (+${bossLastPoints} pts)` : 'Boss : Raté (0 pt)'}
            </span>
          )}
        </div>
      )}

      {/* ÉCRAN DE TRANSITION PASS & PLAY ("Passe le tel à Joueur 2") */}
      {phase === 'PASS_TRANSITION' && (
        <div className="rounded-2xl border-2 border-indigo-500 bg-white dark:bg-[#1e293b] p-6 sm:p-10 text-center space-y-6 shadow-xl my-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Smartphone className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Mode Pass &amp; Play · Changement de Duelliste
            </div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
              Passe le téléphone à {activePlayer.name} !
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              {isSuddenDeath
                ? 'Ultime question de Mort Subite : sois plus précis et plus rapide que ton adversaire !'
                : `C'est au tour de ${activePlayer.name} d'affronter la carte ${cardIndex + 1}/12.`}
            </p>
          </div>

          {(queuedBlurAgainstOpponent || queuedChronoAgainstOpponent) && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-sm font-bold flex items-center justify-center gap-2 max-w-md mx-auto">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Attention : un Joker de sabotage a été posé sur cette manche !
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              const applyBlur = queuedBlurAgainstOpponent;
              const applyChrono = queuedChronoAgainstOpponent;
              setQueuedBlurAgainstOpponent(false);
              setQueuedChronoAgainstOpponent(false);
              startCardTurn(applyBlur, applyChrono);
            }}
            className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-display font-bold text-lg shadow-lg inline-flex items-center gap-2 cursor-pointer"
          >
            <Swords className="w-5 h-5" />
            <span>Je suis prêt ({activePlayer.name})</span>
          </button>
        </div>
      )}

      {/* ÉCRAN D'INTRODUCTION MORT SUBITE */}
      {phase === 'SUDDEN_DEATH_INTRO' && (
        <div className="rounded-2xl border-2 border-rose-500 bg-white dark:bg-[#1e293b] p-6 sm:p-10 text-center space-y-6 shadow-xl my-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-600/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="text-xs font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-400">
              Égalité Parfaite ({p1.score} pts partout)
            </div>
            <h2 className="font-display font-extrabold text-3xl text-slate-900 dark:text-white">
              MORT SUBITE !
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Une seule carte finale de 8 secondes pour départager les deux duellistes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => startCardTurn(false, false)}
            className="px-8 py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-display font-bold text-lg shadow-lg inline-flex items-center gap-2 cursor-pointer"
          >
            <Flame className="w-5 h-5" />
            <span>Révéler la Carte Mort Subite</span>
          </button>
        </div>
      )}

      {/* CARTE DE QUESTION ACTIVE & RÉSULTAT */}
      {(phase === 'PLAYING_CARD' || phase === 'CARD_RESULT') && (
        <div
          className={`rounded-2xl border-2 p-5 sm:p-7 transition-all shadow-lg ${
            isSuddenDeath
              ? 'bg-white dark:bg-[#1e293b] border-rose-500 shadow-rose-500/10'
              : activeDoubleMiseForCurrentTurn
                ? 'bg-white dark:bg-[#1e293b] border-amber-500 ring-2 ring-amber-400/30'
                : activePlayer.streak >= 3
                  ? 'bg-white dark:bg-[#1e293b] border-amber-500'
                  : 'bg-white dark:bg-[#1e293b] border-indigo-500/80 dark:border-indigo-400/80'
          }`}
        >
          {/* En-tête de la carte : Matière + État des Jokers actifs */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <span>{currentCard.category}</span>
              <span>·</span>
              <span>Niveau {currentCard.difficulty}</span>
              <span>·</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                Tour de {activePlayer.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {activeBlurForCurrentTurn && (
                <span className="text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1">
                  <CloudFog className="w-3.5 h-3.5" />
                  Brouillard ({(blurRemainingMs / 1000).toFixed(1)}s)
                </span>
              )}
              {activeChronoHalfForCurrentTurn && (
                <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Chrono /2 (6s)
                </span>
              )}
              {activeDoubleMiseForCurrentTurn && (
                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Double Mise x2
                </span>
              )}
            </div>
          </div>

          {/* Énoncé de la question (haute lisibilité + Mode BIG) */}
          <h2
            className={`font-display font-bold text-slate-900 dark:text-white leading-snug mb-6 ${
              isBigMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
            }`}
          >
            {renderQuestionWithBlur(currentCard.question, currentCard.blurTargets)}
          </h2>

          {/* Les 4 Choix de réponse (QCM) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentCard.options.map((option, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx];
              const isCorrectOption = idx === currentCard.correctIndex;
              const isChosenOption = idx === selectedOption;

              let btnStyle =
                'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-slate-900 dark:text-slate-100';

              if (phase === 'CARD_RESULT') {
                if (isCorrectOption) {
                  btnStyle =
                    'border-emerald-600 bg-emerald-500/15 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/30';
                } else if (isChosenOption && !isCorrectOption) {
                  btnStyle =
                    'border-rose-600 bg-rose-500/15 text-rose-950 dark:text-rose-200';
                } else {
                  btnStyle =
                    'border-slate-200 dark:border-slate-800 opacity-55 text-slate-500';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={phase !== 'PLAYING_CARD'}
                  onClick={() => handleAnswerSubmission(idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 cursor-pointer disabled:cursor-default ${btnStyle}`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg font-mono font-bold text-sm flex items-center justify-center shrink-0 mt-0.5 ${
                      phase === 'CARD_RESULT' && isCorrectOption
                        ? 'bg-emerald-600 text-white'
                        : phase === 'CARD_RESULT' && isChosenOption && !isCorrectOption
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {letter}
                  </span>
                  <span
                    className={`font-semibold flex-1 leading-snug ${
                      isBigMode ? 'text-[19px]' : 'text-[16px]'
                    }`}
                  >
                    {option}
                  </span>
                  {phase === 'CARD_RESULT' && isCorrectOption && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  {phase === 'CARD_RESULT' && isChosenOption && !isCorrectOption && (
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Barre de Cartes Joker en bas de la carte (pendant PLAYING_CARD) */}
          {phase === 'PLAYING_CARD' && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tes 2 Cartes Joker ({activePlayer.name}) :
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {activePlayer.jokers.map((joker) => (
                  <button
                    key={joker.id}
                    type="button"
                    disabled={joker.used}
                    onClick={() => handleUseJoker(joker)}
                    title={joker.description}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      joker.used
                        ? 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-50 line-through cursor-not-allowed'
                        : 'border-amber-500/80 bg-amber-500/10 hover:bg-amber-500/20 text-slate-900 dark:text-amber-200 shadow-xs'
                    }`}
                  >
                    {getJokerIcon(joker.type)}
                    <span>{joker.name}</span>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 hidden md:inline">
                      ({joker.type === 'DOUBLE_MISE' ? 'Sur ce tour' : 'Sabote l’adversaire'})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Explication pédagogique flash (pendant CARD_RESULT) */}
          {phase === 'CARD_RESULT' && (
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div
                className={`p-4 rounded-xl border ${
                  selectedOption === currentCard.correctIndex
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`font-display font-bold text-sm sm:text-base flex items-center gap-1.5 ${
                      selectedOption === currentCard.correctIndex
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {selectedOption === currentCard.correctIndex ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>Bonne réponse !</span>
                      </>
                    ) : selectedOption === null ? (
                      <>
                        <Clock className="w-5 h-5 shrink-0" />
                        <span>Temps écoulé !</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 shrink-0" />
                        <span>Piège déclenché ! (Ajouté à ta fiche de révision)</span>
                      </>
                    )}
                  </span>
                  <span className="font-mono font-extrabold text-sm sm:text-base tabular-nums">
                    {lastPointsEarned >= 0 ? `+${lastPointsEarned} pts` : `${lastPointsEarned} pts`}
                  </span>
                </div>
                <p
                  className={`text-slate-700 dark:text-slate-200 leading-relaxed ${
                    isBigMode ? 'text-[18px]' : 'text-[14.5px]'
                  }`}
                >
                  <strong>À retenir :</strong> {currentCard.explanation}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-display font-bold text-base flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <span>
                    {isSuddenDeath
                      ? gameMode === 'PASS_AND_PLAY' && sdPassTurn === 0
                        ? `Au tour de ${p2.name}`
                        : 'Voir le Vainqueur & la Fiche'
                      : cardIndex + 1 >= deck.cards.length
                        ? 'Terminer le Duel'
                        : 'Carte Suivante'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

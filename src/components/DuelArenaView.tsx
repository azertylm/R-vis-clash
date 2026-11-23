import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  CloudFog,
  Flame,
  Gauge,
  Smartphone,
  Sparkles,
  Swords,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  BossProfile,
  Deck,
  DifficultyTier,
  GameMode,
  JokerCard,
  JokerType,
  MissedQuestionRecord,
  PlayerMatchState,
  QuestionCard,
} from '../types';
import { DIFFICULTY_CONFIGS } from '../data/decks';
import { soundFX } from '../utils/sound';

interface DuelArenaViewProps {
  deck: Deck;
  gameMode: GameMode;
  difficultyTier: DifficultyTier;
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

export const DuelArenaView: React.FC<DuelArenaViewProps> = ({
  deck,
  gameMode,
  difficultyTier,
  boss,
  initialP1,
  initialP2,
  isBigMode,
  onFinishDuel,
  onActiveTextChange,
}) => {
  const diffConfig = DIFFICULTY_CONFIGS[difficultyTier];

  const [p1, setP1] = useState<PlayerMatchState>(initialP1);
  const [p2, setP2] = useState<PlayerMatchState>(initialP2);
  const [cardIndex, setCardIndex] = useState(0);
  const [isSuddenDeath, setIsSuddenDeath] = useState(false);
  const [sdPassTurn, setSdPassTurn] = useState<0 | 1>(0);
  const [sdP1Result, setSdP1Result] = useState<{ correct: boolean; timeMs: number } | null>(null);

  const [phase, setPhase] = useState<ArenaPhase>('PLAYING_CARD');
  const [missedRecords, setMissedRecords] = useState<MissedQuestionRecord[]>([]);

  // Active sabotage / buffs on current turn
  const [activeBlurForCurrentTurn, setActiveBlurForCurrentTurn] = useState(false);
  const [blurRemainingMs, setBlurRemainingMs] = useState(0);
  const [activeChronoHalfForCurrentTurn, setActiveChronoHalfForCurrentTurn] = useState(false);
  const [activeDoubleMiseForCurrentTurn, setActiveDoubleMiseForCurrentTurn] = useState(false);

  // Sabotage queued for opponent's NEXT turn (Pass & Play)
  const [queuedBlurAgainstOpponent, setQueuedBlurAgainstOpponent] = useState(false);
  const [queuedChronoAgainstOpponent, setQueuedChronoAgainstOpponent] = useState(false);

  // Boss Solo real-time state
  const [bossStatusText, setBossStatusText] = useState<string>('Analyse...');
  const [bossAnswered, setBossAnswered] = useState(false);
  const [bossCorrect, setBossCorrect] = useState<boolean | null>(null);
  const [bossLastPoints, setBossLastPoints] = useState<number>(0);
  const [bossSabotagedByBlur, setBossSabotagedByBlur] = useState(false);
  const [bossSabotagedByChrono, setBossSabotagedByChrono] = useState(false);

  // Current turn answer state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [lastPointsEarned, setLastPointsEarned] = useState<number>(0);

  // Timer state driven by selected DifficultyConfig
  const maxTurnSeconds = isSuddenDeath
    ? diffConfig.suddenDeathSeconds
    : activeChronoHalfForCurrentTurn
      ? diffConfig.sabotagedSeconds
      : diffConfig.turnSeconds;

  const [timeLeftSec, setTimeLeftSec] = useState<number>(diffConfig.turnSeconds);
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

  const cardTierLabel =
    currentCard.tier || (cardIndex < 4 ? 'FACILE' : cardIndex < 8 ? 'MOYEN' : 'DIFFICILE');

  // Auto-detect if all 4 options are compact enough to display in a 2x2 grid on mobile
  // so that everything fits on a single mobile screen without scrolling!
  const canUseTwoColumnsOnMobile = currentCard.options.every((opt) => opt.length <= 28);

  // Report current card text to parent for TTS speechSynthesis
  useEffect(() => {
    if (phase === 'PLAYING_CARD' || phase === 'CARD_RESULT') {
      const choicesText = currentCard.options
        .map((opt, idx) => `Réponse ${['A', 'B', 'C', 'D'][idx]} : ${opt}.`)
        .join(' ');
      const explText = phase === 'CARD_RESULT' ? `Explication : ${currentCard.explanation}` : '';
      onActiveTextChange(
        `Question ${isSuddenDeath ? 'Mort Subite' : cardIndex + 1} (${cardTierLabel}) : ${currentCard.question}. ${choicesText} ${explText}`
      );
    }
  }, [currentCard, phase, cardIndex, isSuddenDeath, cardTierLabel, onActiveTextChange]);

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
      ? diffConfig.suddenDeathSeconds
      : applyChronoHalf
        ? diffConfig.sabotagedSeconds
        : diffConfig.turnSeconds;
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
      setBossStatusText(`${boss.name} réfléchit...`);

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
            setTimeLeftSec(diffConfig.sabotagedSeconds);
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

    const rawDelay =
      boss.minThinkMs + Math.random() * (boss.maxThinkMs - boss.minThinkMs);
    const scaledDelay = rawDelay * diffConfig.bossSpeedFactor;
    const delayWithBlur = bossSabotagedByBlur ? scaledDelay + 2200 : scaledDelay;
    const maxAllowedMs =
      (bossSabotagedByChrono ? diffConfig.sabotagedSeconds : maxTurnSeconds) * 1000;

    const timer = window.setTimeout(() => {
      if (delayWithBlur >= maxAllowedMs) {
        setBossAnswered(true);
        setBossCorrect(false);
        setBossLastPoints(0);
        setBossStatusText('Hors délai !');
        setP2((prev) => ({
          ...prev,
          streak: 0,
          totalAnswered: prev.totalAnswered + 1,
          totalTimeMs: prev.totalTimeMs + maxAllowedMs,
        }));
        return;
      }

      const boostedAcc = Math.min(0.98, Math.max(0.3, boss.accuracy + diffConfig.bossAccuracyBoost));
      const effectiveAccuracy = bossSabotagedByBlur
        ? Math.max(0.25, boostedAcc - 0.25)
        : boostedAcc;
      const isRight = Math.random() < effectiveAccuracy;

      setBossAnswered(true);
      setBossCorrect(isRight);
      setBossStatusText('Réponse verrouillée');

      setP2((prev) => {
        const nextStreak = isRight ? prev.streak + 1 : 0;
        const isOnFire = nextStreak >= 3;
        const speedBonus = Math.max(
          0,
          Math.round(((maxAllowedMs - delayWithBlur) / maxAllowedMs) * 50)
        );
        let pts = isRight ? Math.round((100 + speedBonus) * diffConfig.scoreMultiplier) : 0;
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
    diffConfig,
  ]);

  // Activate a Joker card during the turn
  const handleUseJoker = (joker: JokerCard) => {
    if (joker.used || phase !== 'PLAYING_CARD') return;
    soundFX.playJoker();

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
        setBossStatusText('Sous Brouillard !');
      } else {
        setQueuedBlurAgainstOpponent(true);
      }
    } else if (joker.type === 'CHRONO_HALF') {
      if (gameMode === 'BOSS_SOLO') {
        setBossSabotagedByChrono(true);
        setBossStatusText(`Chrono /2 (${diffConfig.sabotagedSeconds}s) !`);
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

    const updateActivePlayer = (prev: PlayerMatchState): PlayerMatchState => {
      const nextStreak = isCorrect ? prev.streak + 1 : 0;
      const isOnFire = nextStreak >= 3;
      const speedRatio = Math.max(0, (maxTurnSeconds * 1000 - elapsedMs) / (maxTurnSeconds * 1000));
      const speedBonus = Math.round(speedRatio * 50);

      let pointsDelta = 0;
      if (isCorrect) {
        pointsDelta = Math.round((100 + speedBonus) * diffConfig.scoreMultiplier);
        if (isOnFire) {
          pointsDelta = Math.round(pointsDelta * 1.5);
        }
        if (activeDoubleMiseForCurrentTurn) {
          pointsDelta = pointsDelta * 2;
        }
      } else {
        pointsDelta = -diffConfig.wrongPenalty;
        if (activeDoubleMiseForCurrentTurn) {
          pointsDelta -= 50;
        }
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

    if (gameMode === 'BOSS_SOLO' && !bossAnswered) {
      if (bossTimeoutRef.current) window.clearTimeout(bossTimeoutRef.current);
      const boostedAcc = Math.min(0.98, Math.max(0.3, boss.accuracy + diffConfig.bossAccuracyBoost));
      const effectiveAcc = bossSabotagedByBlur ? Math.max(0.25, boostedAcc - 0.25) : boostedAcc;
      const isBossRight = Math.random() < effectiveAcc;
      setBossAnswered(true);
      setBossCorrect(isBossRight);
      setP2((prev) => {
        const nextStreak = isBossRight ? prev.streak + 1 : 0;
        const isOnFire = nextStreak >= 3;
        let pts = isBossRight ? Math.round(120 * diffConfig.scoreMultiplier) : 0;
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
    if (isSuddenDeath) {
      if (gameMode === 'PASS_AND_PLAY' && sdPassTurn === 0) {
        setSdPassTurn(1);
        setPhase('PASS_TRANSITION');
        return;
      }

      let finalP1 = { ...p1 };
      let finalP2 = { ...p2 };
      if (finalP1.score === finalP2.score) {
        if (gameMode === 'PASS_AND_PLAY' && sdP1Result) {
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

  // Keyboard shortcuts (1/2/3/4 or A/B/C/D to answer, Enter/Space for next card)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (phase === 'PLAYING_CARD') {
        const key = e.key.toUpperCase();
        if (key === '1' || key === 'A') handleAnswerSubmission(0);
        else if (key === '2' || key === 'B') handleAnswerSubmission(1);
        else if (key === '3' || key === 'C') handleAnswerSubmission(2);
        else if (key === '4' || key === 'D') handleAnswerSubmission(3);
      } else if (phase === 'CARD_RESULT' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleNextStep();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Render Question Text with guaranteed 2 words blurred if BROUILLARD is active
  const renderQuestionWithBlur = (question: string, targets: string[]) => {
    if (!activeBlurForCurrentTurn) {
      return <span>{question}</span>;
    }

    const normalizedTargets = (targets || [])
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length >= 2);

    const tokens = question.split(/(\s+)/);
    const matchedIndices = new Set<number>();

    tokens.forEach((token, idx) => {
      if (matchedIndices.size >= 2) return;
      const cleanToken = token.replace(/[.,?!;:'"()«»]/g, '').toLowerCase();
      if (
        cleanToken.length >= 3 &&
        normalizedTargets.some((t) => cleanToken.includes(t) || t.includes(cleanToken))
      ) {
        matchedIndices.add(idx);
      }
    });

    if (matchedIndices.size < 2) {
      const candidateIndices = tokens
        .map((t, idx) => ({
          idx,
          cleanLen: t.replace(/[.,?!;:'"()«»\s]/g, '').length,
        }))
        .filter((item) => item.cleanLen >= 4 && !matchedIndices.has(item.idx))
        .sort((a, b) => b.cleanLen - a.cleanLen);

      for (const cand of candidateIndices) {
        if (matchedIndices.size >= 2) break;
        matchedIndices.add(cand.idx);
      }
    }

    return (
      <>
        {tokens.map((token, idx) => {
          if (matchedIndices.has(idx)) {
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
    if (type === 'BROUILLARD') return <CloudFog className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    if (type === 'CHRONO_HALF') return <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    return <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  };

  return (
    <div className="w-full max-w-[900px] mx-auto px-2.5 sm:px-5 py-2 sm:py-3 flex flex-col justify-between min-h-[calc(100dvh-108px)] gap-2">
      {/* 1. HUD Tactique Compact : Scores, Manche, Chrono et État du Boss sur une seule barre */}
      <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151f32] px-2.5 py-1.5 sm:px-3.5 sm:py-2 shadow-xs shrink-0">
        {/* Joueur 1 */}
        <div
          className={`col-span-4 px-2 py-1 rounded-lg border transition-all ${
            activePlayerIndex === 0
              ? p1.streak >= 3
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-indigo-500 bg-indigo-500/10'
              : 'border-transparent'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
              {p1.name}
            </span>
            {p1.streak >= 3 ? (
              <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 whitespace-nowrap">
                <Flame className="w-3 h-3 fill-amber-500" /> x1.5
              </span>
            ) : (
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                {p1.streak}/3
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono font-extrabold text-sm sm:text-lg tabular-nums text-indigo-600 dark:text-indigo-400 leading-tight">
              {p1.score} <span className="text-[10px] font-normal">pts</span>
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-800 mt-0.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                p1.streak >= 3 ? 'bg-amber-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(100, (p1.streak / 3) * 100)}%` }}
            />
          </div>
        </div>

        {/* Compteur central Manche & Chrono */}
        <div className="col-span-4 flex items-center justify-center gap-2 text-center">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
              {isSuddenDeath ? 'MORT SUBITE' : `Carte ${cardIndex + 1}/${deck.cards.length}`}
            </span>
            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold leading-tight">
              {diffConfig.label}
            </span>
          </div>
          <div
            className={`px-2 py-0.5 rounded-lg font-mono font-extrabold text-sm sm:text-base tabular-nums border ${
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
          className={`col-span-4 px-2 py-1 rounded-lg border transition-all text-right ${
            activePlayerIndex === 1
              ? p2.streak >= 3
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-indigo-500 bg-indigo-500/10'
              : 'border-transparent'
          }`}
        >
          <div className="flex items-center justify-between gap-1 flex-row-reverse">
            <span className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate flex items-center gap-1">
              {gameMode === 'BOSS_SOLO' && <Bot className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
              <span className="truncate">{p2.name}</span>
            </span>
            {p2.streak >= 3 ? (
              <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 whitespace-nowrap">
                <Flame className="w-3 h-3 fill-amber-500" /> x1.5
              </span>
            ) : (
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                {p2.streak}/3
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between flex-row-reverse">
            <span className="font-mono font-extrabold text-sm sm:text-lg tabular-nums text-rose-600 dark:text-rose-400 leading-tight">
              {p2.score} <span className="text-[10px] font-normal">pts</span>
            </span>
            {gameMode === 'BOSS_SOLO' && (
              <span
                className={`text-[10px] font-semibold truncate max-w-[90px] ${
                  phase === 'CARD_RESULT'
                    ? bossCorrect
                      ? 'text-emerald-500'
                      : 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {phase === 'CARD_RESULT'
                  ? bossCorrect
                    ? `+${bossLastPoints}`
                    : 'Raté'
                  : bossStatusText}
              </span>
            )}
          </div>
          <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-800 mt-0.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ml-auto ${
                p2.streak >= 3 ? 'bg-amber-500' : 'bg-rose-600'
              }`}
              style={{ width: `${Math.min(100, (p2.streak / 3) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ÉCRAN DE TRANSITION PASS & PLAY ("Passe le tel à Joueur 2") */}
      {phase === 'PASS_TRANSITION' && (
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-indigo-500 bg-white dark:bg-[#1e293b] p-5 sm:p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Smartphone className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Mode Pass &amp; Play · Changement de Duelliste
            </div>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white">
              Passe le téléphone à {activePlayer.name} !
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              {isSuddenDeath
                ? 'Ultime question de Mort Subite : sois plus précis et plus rapide que ton adversaire !'
                : `C'est au tour de ${activePlayer.name} d'affronter la carte ${cardIndex + 1}/${deck.cards.length}.`}
            </p>
          </div>

          {(queuedBlurAgainstOpponent || queuedChronoAgainstOpponent) && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-2 max-w-md mx-auto">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Un Joker de sabotage a été posé sur cette manche !</span>
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
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-display font-bold text-base shadow-lg inline-flex items-center gap-2 cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            <span>Je suis prêt ({activePlayer.name})</span>
          </button>
        </div>
      )}

      {/* ÉCRAN D'INTRODUCTION MORT SUBITE */}
      {phase === 'SUDDEN_DEATH_INTRO' && (
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-rose-500 bg-white dark:bg-[#1e293b] p-5 sm:p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <Zap className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-400">
              Égalité Parfaite ({p1.score} pts partout)
            </div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
              MORT SUBITE !
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Une seule carte finale de {diffConfig.suddenDeathSeconds} secondes pour départager les deux duellistes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => startCardTurn(false, false)}
            className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-display font-bold text-base shadow-lg inline-flex items-center gap-2 cursor-pointer"
          >
            <Flame className="w-4 h-4" />
            <span>Révéler la Carte Mort Subite</span>
          </button>
        </div>
      )}

      {/* CARTE DE QUESTION ACTIVE & RÉSULTAT — Calibrée pour tenir sur 1 seul écran sans scroll */}
      {(phase === 'PLAYING_CARD' || phase === 'CARD_RESULT') && (
        <div
          className={`flex-1 flex flex-col justify-between rounded-2xl border-2 p-3 sm:p-5 transition-all shadow-md ${
            isSuddenDeath
              ? 'bg-white dark:bg-[#1e293b] border-rose-500 shadow-rose-500/10'
              : activeDoubleMiseForCurrentTurn
                ? 'bg-white dark:bg-[#1e293b] border-amber-500 ring-2 ring-amber-400/30'
                : activePlayer.streak >= 3
                  ? 'bg-white dark:bg-[#1e293b] border-amber-500'
                  : 'bg-white dark:bg-[#1e293b] border-indigo-500/80 dark:border-indigo-400/80'
          }`}
        >
          {/* En-tête ultra-compact de la carte */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span>{currentCard.category}</span>
                <span>·</span>
                <span>{cardTierLabel}</span>
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
                    Chrono /2 ({diffConfig.sabotagedSeconds}s)
                  </span>
                )}
                {activeDoubleMiseForCurrentTurn && (
                  <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Double x2
                  </span>
                )}
              </div>
            </div>

            {/* Énoncé de la question */}
            <h2
              className={`font-display font-bold text-slate-900 dark:text-white leading-snug mb-3 ${
                isBigMode ? 'text-xl sm:text-2xl' : 'text-[17px] sm:text-xl'
              }`}
            >
              {renderQuestionWithBlur(currentCard.question, currentCard.blurTargets)}
            </h2>
          </div>

          {/* Les 4 Choix de réponse (QCM) : 2x2 sur mobile si options courtes, sinon 1 col compacte */}
          <div
            className={`grid gap-2 sm:gap-2.5 my-auto ${
              canUseTwoColumnsOnMobile ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            {currentCard.options.map((option, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx];
              const isCorrectOption = idx === currentCard.correctIndex;
              const isChosenOption = idx === selectedOption;

              let btnStyle =
                'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-slate-900 dark:text-slate-100';

              if (phase === 'CARD_RESULT') {
                if (isCorrectOption) {
                  btnStyle =
                    'border-emerald-600 bg-emerald-500/15 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500/40';
                } else if (isChosenOption && !isCorrectOption) {
                  btnStyle =
                    'border-rose-600 bg-rose-500/15 text-rose-950 dark:text-rose-200';
                } else {
                  btnStyle =
                    'border-slate-200 dark:border-slate-800 opacity-50 text-slate-500';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={phase !== 'PLAYING_CARD'}
                  onClick={() => handleAnswerSubmission(idx)}
                  className={`w-full text-left px-3 py-2.5 sm:p-3.5 rounded-xl border-2 transition-all flex items-center gap-2.5 cursor-pointer disabled:cursor-default ${btnStyle}`}
                >
                  <span
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg font-mono font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 ${
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
                    className={`font-semibold flex-1 leading-tight ${
                      isBigMode ? 'text-[17px] sm:text-[18px]' : 'text-[14.5px] sm:text-[15.5px]'
                    }`}
                  >
                    {option}
                  </span>
                  {phase === 'CARD_RESULT' && isCorrectOption && (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {phase === 'CARD_RESULT' && isChosenOption && !isCorrectOption && (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Pied de carte : soit les 2 Cartes Joker (en jeu), soit Explication + Bouton Suivant sur la même boîte (en résultat) */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            {phase === 'PLAYING_CARD' ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                  Jokers :
                </span>
                <div className="flex items-center gap-2">
                  {activePlayer.jokers.map((joker) => (
                    <button
                      key={joker.id}
                      type="button"
                      disabled={joker.used}
                      onClick={() => handleUseJoker(joker)}
                      title={joker.description}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        joker.used
                          ? 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-50 line-through cursor-not-allowed'
                          : 'border-amber-500/80 bg-amber-500/10 hover:bg-amber-500/20 text-slate-900 dark:text-amber-200'
                      }`}
                    >
                      {getJokerIcon(joker.type)}
                      <span>{joker.shortLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className={`p-2.5 sm:p-3 rounded-xl border ${
                  selectedOption === currentCard.correctIndex
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 ${
                      selectedOption === currentCard.correctIndex
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {selectedOption === currentCard.correctIndex ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Bonne réponse !</span>
                      </>
                    ) : selectedOption === null ? (
                      <>
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>Temps écoulé !</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>Piège déclenché !</span>
                      </>
                    )}
                    <span className="font-mono font-extrabold tabular-nums ml-1">
                      ({lastPointsEarned >= 0 ? `+${lastPointsEarned}` : lastPointsEarned} pts)
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                  >
                    <span>
                      {isSuddenDeath
                        ? gameMode === 'PASS_AND_PLAY' && sdPassTurn === 0
                          ? `Tour ${p2.name}`
                          : 'Bilan'
                        : cardIndex + 1 >= deck.cards.length
                          ? 'Terminer'
                          : 'Suivant'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p
                  className={`text-slate-700 dark:text-slate-200 leading-snug ${
                    isBigMode ? 'text-[15.5px]' : 'text-[12.5px] sm:text-[13.5px]'
                  }`}
                >
                  <strong>À retenir :</strong> {currentCard.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

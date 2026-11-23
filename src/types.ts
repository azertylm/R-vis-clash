export type SchoolLevel = 'Collège' | 'Lycée';

export type DifficultyTier = 'FACILE' | 'MOYEN' | 'DIFFICILE' | 'EXPERT';

export interface DifficultyConfig {
  id: DifficultyTier;
  label: string;
  subtitle: string;
  turnSeconds: number;
  sabotagedSeconds: number;
  suddenDeathSeconds: number;
  scoreMultiplier: number;
  wrongPenalty: number;
  bossAccuracyBoost: number;
  bossSpeedFactor: number; // < 1 means faster boss thinking
}

export type JokerType = 'BROUILLARD' | 'CHRONO_HALF' | 'DOUBLE_MISE';

export interface JokerCard {
  id: string;
  type: JokerType;
  name: string;
  shortLabel: string;
  description: string;
  used: boolean;
}

export interface QuestionCard {
  id: string;
  category: string;
  difficulty: SchoolLevel;
  tier?: 'FACILE' | 'MOYEN' | 'DIFFICILE';
  question: string;
  blurTargets: string[]; // 2 words from `question` blurred for 3s when BROUILLARD is active
  options: string[]; // 4 options
  correctIndex: number; // 0-3
  explanation: string;
}

export interface Deck {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  level: SchoolLevel;
  accentColor: string;
  isCustom?: boolean;
  cards: QuestionCard[]; // 12 main cards
  suddenDeathCard: QuestionCard; // Tie-breaker card
}

export type GameMode = 'BOSS_SOLO' | 'PASS_AND_PLAY';

export type BossId = 'TOURISTE' | 'MAJOR' | 'PROF';

export interface BossProfile {
  id: BossId;
  name: string;
  title: string;
  accuracy: number; // 0 to 1
  minThinkMs: number;
  maxThinkMs: number;
  description: string;
  quote: string;
  jokers: JokerType[];
}

export interface MissedQuestionRecord {
  card: QuestionCard;
  playerName: string;
  chosenIndex: number | null; // null if timeout
}

export interface PlayerMatchState {
  name: string;
  score: number;
  streak: number;
  maxStreak: number;
  correctCount: number;
  totalAnswered: number;
  totalTimeMs: number;
  jokers: JokerCard[];
}

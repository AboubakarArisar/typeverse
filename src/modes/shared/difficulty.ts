import type { Difficulty } from '@/types';
import type { BackspacePolicy } from '@/engine/TypingEngine';

export interface DifficultyPreset {
  id: Difficulty;
  labelKey: string;
  /** Multiplier applied to a mode's base speed. */
  speed: number;
  /** Inclusive word-length window. */
  minLen: number;
  maxLen: number;
  /** Include punctuation and symbols in generated words. */
  symbols: boolean;
  backspace: BackspacePolicy;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyPreset> = {
  kid: {
    id: 'kid',
    labelKey: 'difficulty.kid',
    speed: 0.5,
    minLen: 2,
    maxLen: 5,
    symbols: false,
    backspace: { allowed: true, cost: 0 },
  },
  easy: {
    id: 'easy',
    labelKey: 'difficulty.easy',
    speed: 0.7,
    minLen: 3,
    maxLen: 6,
    symbols: false,
    backspace: { allowed: true, cost: 0 },
  },
  normal: {
    id: 'normal',
    labelKey: 'difficulty.normal',
    speed: 1,
    minLen: 4,
    maxLen: 8,
    symbols: false,
    backspace: { allowed: true, cost: 0 },
  },
  hard: {
    id: 'hard',
    labelKey: 'difficulty.hard',
    speed: 1.35,
    minLen: 5,
    maxLen: 12,
    symbols: false,
    backspace: { allowed: true, cost: 5 },
  },
  insane: {
    id: 'insane',
    labelKey: 'difficulty.insane',
    speed: 1.8,
    minLen: 6,
    maxLen: 15,
    symbols: true,
    backspace: { allowed: false, cost: 0 },
  },
};

export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[];

/** Map a measured WPM from the onboarding check to a starting difficulty (FR-UI-06). */
export function difficultyForWpm(wpm: number): Difficulty {
  if (wpm < 20) return 'easy';
  if (wpm < 45) return 'normal';
  if (wpm < 70) return 'hard';
  return 'insane';
}

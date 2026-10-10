export type ModeId =
  | 'word-rain'
  | 'type-beats'
  | 'zombie-survival'
  | 'typing-racer'
  | 'code-typer'
  | 'word-tower'
  | 'story'
  | 'zen';

export type KeycapColor = 'blue' | 'orange' | 'mint' | 'lime';
export type Difficulty = 'kid' | 'easy' | 'normal' | 'hard' | 'insane';
export type Theme = 'system' | 'light' | 'dark';

/** A keystroke as data (Command pattern) — recordable, replayable, testable. */
export interface KeyInput {
  /** Printable character, or '' for control keys. Already NFC-normalized. */
  readonly char: string;
  readonly code: string;
  /** performance.now() at the time of the event. */
  readonly t: number;
  readonly kind: 'char' | 'backspace' | 'enter' | 'escape' | 'space';
}

export interface ModeMeta {
  readonly id: ModeId;
  readonly nameKey: string;
  readonly descKey: string;
  readonly color: KeycapColor;
  readonly letter: string;
  readonly unlockLevel: number;
  /** 'canvas' modes draw to the canvas; 'overlay' modes render DOM text. */
  readonly surface: 'canvas' | 'overlay';
}

export interface SessionResult {
  mode: ModeId;
  date: string;
  durationMs: number;
  score: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  maxCombo: number;
  language: string;
  difficulty: Difficulty;
  /** Mode-specific lines shown on the result screen, e.g. 'Wave 7'. */
  highlights?: { label: string; value: string }[];
}

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  soundPack: string;
  theme: Theme;
  reducedMotion: boolean;
  fontScale: number;
  language: string;
  kidMode: boolean;
  difficulty: Difficulty;
}

export interface SaveFile {
  version: number;
  profile: { name?: string; createdAt: string; xp: number; level: number; onboarded?: boolean };
  settings: Settings;
  unlocks: string[];
  bests: Partial<Record<ModeId, { score: number; wpm: number; date: string }>>;
  sessions: SessionResult[];
  keyStats: Record<string, { hits: number; misses: number }>;
  story: Record<string, { chapter: number; flags: string[] }>;
}

export interface LanguagePack {
  id: string;
  name: string;
  dir: 'ltr' | 'rtl';
  font?: string;
  words: { easy: string[]; normal: string[]; hard: string[]; kid: string[] };
  sentences: string[];
  zen: string[];
  blocklist?: string[];
}

export interface CodePack {
  id: string;
  name: string;
  license: string;
  snippets: { id: string; difficulty: 'beginner' | 'intermediate' | 'advanced'; lines: string[] }[];
}

export interface StoryNode {
  id: string;
  chapter: number;
  text: string;
  /** Typed choices: the word the player types -> next node id. */
  choices?: { type: string; label: string; next: string }[];
  /** Branch on performance instead of choice. */
  gate?: { minAccuracy: number; pass: string; fail: string };
  next?: string;
  flag?: string;
}

export interface Story {
  id: string;
  title: string;
  author: string;
  license: string;
  start: string;
  nodes: StoryNode[];
}

export interface BeatChart {
  id: string;
  title: string;
  bpm: number;
  offsetMs: number;
  license: string;
  notes: { beat: number; char: string }[];
}

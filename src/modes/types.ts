import type { Difficulty, KeyInput, ModeId, ModeMeta, SessionResult, Settings } from '@/types';
import type { EventBus } from '@/engine/EventBus';
import type { Rng } from '@/engine/Rng';
import type { TypingEngine } from '@/engine/TypingEngine';
import type { AudioService } from '@/services/audio';
import type { ContentService } from '@/services/content';

export type ModeState = 'intro' | 'countdown' | 'playing' | 'paused' | 'result';

const TRANSITIONS: Record<ModeState, readonly ModeState[]> = {
  intro: ['countdown'],
  countdown: ['playing', 'paused'],
  playing: ['paused', 'result'],
  paused: ['playing', 'result', 'intro'],
  result: ['intro'],
};

export function canTransition(from: ModeState, to: ModeState): boolean {
  return TRANSITIONS[from].includes(to);
}

export interface ModeContext {
  canvas: HTMLCanvasElement;
  overlay: HTMLElement;
  engine: TypingEngine;
  bus: EventBus;
  audio: AudioService;
  content: ContentService;
  settings: Readonly<Settings>;
  rng: Rng;
  difficulty: Difficulty;
}

export interface GameMode {
  readonly id: ModeId;
  readonly meta: ModeMeta;
  init(ctx: ModeContext): Promise<void>;
  start(): void;
  update(dt: number): void;
  render(alpha: number): void;
  onInput(input: KeyInput): void;
  pause(): void;
  resume(): void;
  getResult(): SessionResult;
  dispose(): void;
}

export type ModeFactory = () => GameMode;

export interface ModeEntry {
  meta: ModeMeta;
  load: () => Promise<ModeFactory>;
}

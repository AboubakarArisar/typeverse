import { signal, type Signal } from '@preact/signals';
import type { KeyInput, ModeId, ModeMeta, SessionResult } from '@/types';
import { finalScore } from './scoring';
import { canTransition, type GameMode, type ModeContext, type ModeState } from '../types';

export interface HudChip {
  label: string;
  value: string;
}

export interface HudState {
  score: number;
  combo: number;
  multiplier: number;
  wpm: number;
  accuracy: number;
  chips: HudChip[];
  /** Optional progress/lives meter: filled out of total. */
  meter?: { label: string; filled: number; total: number };
}

const EMPTY_HUD: HudState = {
  score: 0,
  combo: 0,
  multiplier: 1,
  wpm: 0,
  accuracy: 1,
  chips: [],
};

/**
 * Shared plumbing for the eight modes: state machine, elapsed time from the
 * fixed timestep (never the wall clock), HUD signal and result assembly.
 */
export abstract class BaseMode implements GameMode {
  abstract readonly id: ModeId;
  abstract readonly meta: ModeMeta;

  readonly hud: Signal<HudState> = signal(EMPTY_HUD);

  protected ctx!: ModeContext;
  protected elapsedMs = 0;
  protected state: ModeState = 'intro';
  private ended = false;
  private hudAcc = 0;

  async init(ctx: ModeContext): Promise<void> {
    this.ctx = ctx;
    await this.onInit();
  }

  start(): void {
    this.transition('countdown');
    this.transition('playing');
    this.onStart();
    this.syncHud();
  }

  update(dt: number): void {
    if (this.state !== 'playing') return;
    this.elapsedMs += dt;
    this.onUpdate(dt);
    this.hudAcc += dt;
    if (this.hudAcc >= 100) {
      this.hudAcc = 0;
      this.syncHud();
    }
  }

  render(alpha: number): void {
    this.onRender(alpha);
  }

  onInput(input: KeyInput): void {
    if (this.state !== 'playing') return;
    this.onKey(input);
    this.syncHud();
  }

  pause(): void {
    if (!canTransition(this.state, 'paused')) return;
    this.state = 'paused';
    this.onPause();
  }

  resume(): void {
    if (!canTransition(this.state, 'playing')) return;
    this.state = 'playing';
    this.onResume();
  }

  getResult(): SessionResult {
    const m = this.ctx.engine.metrics.snapshot(this.elapsedMs);
    return {
      mode: this.id,
      // Wall clock is fine for the result timestamp; game logic still only uses dt.
      // eslint-disable-next-line no-restricted-globals
      date: new Date().toISOString(),
      durationMs: Math.round(this.elapsedMs),
      score: finalScore(this.ctx.engine.score, m.accuracy),
      wpm: m.wpm,
      rawWpm: m.rawWpm,
      accuracy: m.accuracy,
      maxCombo: this.ctx.engine.maxCombo,
      language: this.ctx.settings.language,
      difficulty: this.ctx.difficulty,
      highlights: this.highlights(),
    };
  }

  dispose(): void {
    this.onDispose();
    this.ctx?.engine.reset();
    this.ctx?.overlay.replaceChildren();
  }

  // ---- for subclasses ------------------------------------------------------

  /** End the session: emits sessionEnd once so ProgressService and the UI react. */
  protected finish(): void {
    if (this.ended) return;
    this.ended = true;
    this.state = 'result';
    this.syncHud();
    this.ctx.bus.emit('sessionEnd', this.getResult());
  }

  protected get engine() {
    return this.ctx.engine;
  }

  protected transition(to: ModeState): void {
    if (!canTransition(this.state, to)) {
      if (import.meta.env.DEV) throw new Error(`Invalid transition ${this.state} to ${to}`);
      return;
    }
    this.state = to;
  }

  protected syncHud(): void {
    const engine = this.ctx.engine;
    const m = engine.metrics.snapshot(this.elapsedMs);
    this.hud.value = {
      score: engine.score,
      combo: engine.combo,
      multiplier: engine.multiplier,
      wpm: m.wpm,
      accuracy: m.accuracy,
      chips: this.chips(),
      meter: this.meter(),
    };
  }

  protected chips(): HudChip[] {
    return [];
  }

  protected meter(): HudState['meter'] {
    return undefined;
  }

  protected highlights(): { label: string; value: string }[] {
    return this.chips();
  }

  protected abstract onInit(): Promise<void>;
  protected abstract onStart(): void;
  protected abstract onUpdate(dt: number): void;
  protected abstract onRender(alpha: number): void;
  protected abstract onKey(input: KeyInput): void;

  protected onPause(): void {}
  protected onResume(): void {}
  protected onDispose(): void {}
}

import type { KeyInput } from '@/types';
import { EventBus } from './EventBus';
import { MetricsCalculator } from './MetricsCalculator';

export interface Target {
  readonly id: number;
  readonly text: string;
  /** Characters correctly typed so far. */
  typed: number;
  /** Higher wins when several targets start with the same character. */
  priority: number;
}

export interface BackspacePolicy {
  allowed: boolean;
  /** Points deducted per backspace. */
  cost: number;
}

export interface EngineOptions {
  ignoreCase: boolean;
  ignoreDiacritics: boolean;
  backspace: BackspacePolicy;
  /** Points per correct character of a completed word. */
  pointsPerChar: number;
}

export const DEFAULT_OPTIONS: EngineOptions = {
  ignoreCase: true,
  ignoreDiacritics: false,
  backspace: { allowed: true, cost: 0 },
  pointsPerChar: 10,
};

export const COMBO_TIERS = [
  { combo: 50, multiplier: 4 },
  { combo: 25, multiplier: 3 },
  { combo: 10, multiplier: 2 },
] as const;

export function comboMultiplier(combo: number): number {
  for (const tier of COMBO_TIERS) if (combo >= tier.combo) return tier.multiplier;
  return 1;
}

export type TypeOutcome =
  | { kind: 'correct'; target: Target }
  | { kind: 'wrong'; expected: string | null }
  | { kind: 'complete'; target: Target; points: number }
  | { kind: 'locked'; target: Target }
  | { kind: 'backspace'; target: Target | null; cost: number }
  | { kind: 'released' }
  | { kind: 'ignored' };

/**
 * Pure typing logic: active targets, target locking, per-character comparison,
 * combo, score and live metrics. No DOM, no timers - fully unit-testable.
 */
export class TypingEngine {
  readonly bus: EventBus;
  readonly metrics = new MetricsCalculator();

  private options: EngineOptions;
  private targets = new Map<number, Target>();
  private lockedId: number | null = null;
  private nextId = 1;
  private comboCount = 0;
  private bestCombo = 0;
  private scoreValue = 0;

  constructor(bus = new EventBus(), options: Partial<EngineOptions> = {}) {
    this.bus = bus;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  configure(options: Partial<EngineOptions>): void {
    this.options = { ...this.options, ...options };
  }

  // ---- targets -------------------------------------------------------------

  addTarget(text: string, priority = 0): Target {
    const target: Target = { id: this.nextId++, text: text.normalize('NFC'), typed: 0, priority };
    this.targets.set(target.id, target);
    return target;
  }

  removeTarget(id: number): void {
    this.targets.delete(id);
    if (this.lockedId === id) this.lockedId = null;
  }

  getTarget(id: number): Target | undefined {
    return this.targets.get(id);
  }

  get locked(): Target | null {
    return this.lockedId === null ? null : (this.targets.get(this.lockedId) ?? null);
  }

  get activeTargets(): readonly Target[] {
    return [...this.targets.values()];
  }

  setPriority(id: number, priority: number): void {
    const t = this.targets.get(id);
    if (t) t.priority = priority;
  }

  /** Release the lock and clear its partial progress (FR-ENG-03). */
  release(): void {
    const t = this.locked;
    if (!t) return;
    t.typed = 0;
    this.lockedId = null;
    this.bus.emit('targetReleased', { id: t.id });
  }

  clearTargets(): void {
    this.targets.clear();
    this.lockedId = null;
  }

  reset(): void {
    this.clearTargets();
    this.metrics.reset();
    this.comboCount = 0;
    this.bestCombo = 0;
    this.scoreValue = 0;
    this.nextId = 1;
  }

  // ---- state ---------------------------------------------------------------

  get combo(): number {
    return this.comboCount;
  }

  get maxCombo(): number {
    return this.bestCombo;
  }

  get multiplier(): number {
    return comboMultiplier(this.comboCount);
  }

  get score(): number {
    return this.scoreValue;
  }

  addScore(points: number): void {
    this.scoreValue = Math.max(0, this.scoreValue + points);
  }

  // ---- input ---------------------------------------------------------------

  handle(input: KeyInput): TypeOutcome {
    switch (input.kind) {
      case 'escape':
        this.release();
        return { kind: 'released' };
      case 'backspace':
        return this.backspace();
      case 'char':
      case 'space':
        return this.type(input.char, input.t);
      default:
        return { kind: 'ignored' };
    }
  }

  /** Type a single character at time `t` (performance.now from the input command). */
  type(char: string, t = 0): TypeOutcome {
    if (!char) return { kind: 'ignored' };
    const typed = this.norm(char);
    const locked = this.locked;

    if (locked) {
      const expected = locked.text[locked.typed];
      const other =
        expected !== undefined && this.norm(expected) !== typed
          ? this.findCandidate(typed, locked)
          : null;
      if (!other) return this.typeInto(locked, char, typed, t);
      // Another target shares the typed prefix and fits this key: move the lock there.
      other.typed = locked.typed;
      locked.typed = 0;
      this.lockedId = other.id;
      this.bus.emit('targetReleased', { id: locked.id });
      this.bus.emit('targetLocked', { id: other.id, text: other.text });
      return this.typeInto(other, char, typed, t);
    }

    const candidate = this.findCandidate(typed);
    if (!candidate) {
      this.onWrong(null, char, t);
      return { kind: 'wrong', expected: null };
    }
    this.lockedId = candidate.id;
    this.bus.emit('targetLocked', { id: candidate.id, text: candidate.text });
    const outcome = this.typeInto(candidate, char, typed, t);
    return outcome.kind === 'correct' ? { kind: 'locked', target: candidate } : outcome;
  }

  private typeInto(target: Target, raw: string, typed: string, t: number): TypeOutcome {
    const expectedRaw = target.text[target.typed];
    if (expectedRaw === undefined) return { kind: 'ignored' };

    if (this.norm(expectedRaw) !== typed) {
      this.onWrong(expectedRaw, raw, t);
      return { kind: 'wrong', expected: expectedRaw };
    }

    target.typed++;
    this.metrics.record(expectedRaw, true, t);
    this.bus.emit('charCorrect', { char: expectedRaw, t });

    if (target.typed < target.text.length) return { kind: 'correct', target };
    return this.completeTarget(target, t);
  }

  private completeTarget(target: Target, t: number): TypeOutcome {
    const before = this.multiplier;
    this.comboCount++;
    this.bestCombo = Math.max(this.bestCombo, this.comboCount);
    const multiplier = this.multiplier;
    if (multiplier !== before) this.bus.emit('comboStep', { combo: this.comboCount, multiplier });

    const points = target.text.length * this.options.pointsPerChar * multiplier;
    this.addScore(points);
    this.removeTarget(target.id);
    this.bus.emit('wordComplete', {
      word: target.text,
      combo: this.comboCount,
      multiplier,
      points,
      t,
    });
    return { kind: 'complete', target, points };
  }

  private backspace(): TypeOutcome {
    const policy = this.options.backspace;
    if (!policy.allowed) return { kind: 'ignored' };
    const target = this.locked;
    if (policy.cost > 0) this.addScore(-policy.cost);
    if (!target || target.typed === 0)
      return { kind: 'backspace', target: null, cost: policy.cost };
    target.typed--;
    this.metrics.undoCorrect();
    if (target.typed === 0) this.release();
    return { kind: 'backspace', target, cost: policy.cost };
  }

  private onWrong(expected: string | null, got: string, t: number): void {
    this.metrics.record(expected ?? got, false, t);
    if (this.comboCount > 0) this.bus.emit('comboBreak', { combo: this.comboCount });
    this.comboCount = 0;
    this.bus.emit('charWrong', { expected, got, t });
  }

  /**
   * Highest-priority target whose next character is `typed`. With `from`, only
   * targets that share `from`'s typed prefix count (retargeting); otherwise the
   * first character is matched.
   */
  private findCandidate(typed: string, from: Target | null = null): Target | null {
    const n = from?.typed ?? 0;
    let best: Target | null = null;
    for (const target of this.targets.values()) {
      if (target === from) continue;
      const next = target.text[n];
      if (next === undefined || this.norm(next) !== typed) continue;
      if (from && !this.sharesPrefix(target, from, n)) continue;
      if (!best || target.priority > best.priority) best = target;
    }
    return best;
  }

  private sharesPrefix(a: Target, b: Target, n: number): boolean {
    for (let i = 0; i < n; i++) {
      if (this.norm(a.text[i] as string) !== this.norm(b.text[i] as string)) return false;
    }
    return true;
  }

  private norm(char: string): string {
    let out = char.normalize('NFC');
    if (this.options.ignoreCase) out = out.toLowerCase();
    if (this.options.ignoreDiacritics) out = out.normalize('NFD').replace(/\p{M}/gu, '');
    return out;
  }
}

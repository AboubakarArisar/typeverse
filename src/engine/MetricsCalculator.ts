export interface Metrics {
  wpm: number;
  rawWpm: number;
  /** 0..1 */
  accuracy: number;
  correctChars: number;
  typedChars: number;
  errors: number;
  /** Standard deviation of inter-keystroke intervals, normalized to 0..1 (1 = perfectly even). */
  consistency: number;
}

const CHARS_PER_WORD = 5;

/** Pure stats over a stream of keystrokes. No DOM, no clock of its own. */
export class MetricsCalculator {
  private correct = 0;
  private typed = 0;
  private errs = 0;
  private startT = 0;
  private lastT = 0;
  private gaps: number[] = [];
  private keyErrors = new Map<string, { hits: number; misses: number }>();

  reset(): void {
    this.correct = 0;
    this.typed = 0;
    this.errs = 0;
    this.startT = 0;
    this.lastT = 0;
    this.gaps.length = 0;
    this.keyErrors.clear();
  }

  record(char: string, ok: boolean, t: number): void {
    if (this.startT === 0) this.startT = t;
    else this.gaps.push(t - this.lastT);
    this.lastT = t;
    this.typed++;
    if (ok) this.correct++;
    else this.errs++;
    const key = char.toLowerCase();
    const stat = this.keyErrors.get(key) ?? { hits: 0, misses: 0 };
    if (ok) stat.hits++;
    else stat.misses++;
    this.keyErrors.set(key, stat);
  }

  /** Undo one correct character (backspace). */
  undoCorrect(): void {
    if (this.correct > 0) this.correct--;
    if (this.typed > 0) this.typed--;
  }

  elapsedMs(now: number): number {
    return this.startT === 0 ? 0 : Math.max(0, now - this.startT);
  }

  snapshot(now: number): Metrics {
    const minutes = this.elapsedMs(now) / 60_000;
    const wpm = minutes > 0 ? this.correct / CHARS_PER_WORD / minutes : 0;
    const rawWpm = minutes > 0 ? this.typed / CHARS_PER_WORD / minutes : 0;
    return {
      wpm: round1(wpm),
      rawWpm: round1(rawWpm),
      accuracy: this.typed === 0 ? 1 : this.correct / this.typed,
      correctChars: this.correct,
      typedChars: this.typed,
      errors: this.errs,
      consistency: this.consistency(),
    };
  }

  keyStats(): Record<string, { hits: number; misses: number }> {
    return Object.fromEntries(this.keyErrors);
  }

  private consistency(): number {
    if (this.gaps.length < 2) return 1;
    const mean = this.gaps.reduce((a, b) => a + b, 0) / this.gaps.length;
    if (mean <= 0) return 1;
    const variance = this.gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / this.gaps.length;
    const cv = Math.sqrt(variance) / mean;
    return Math.max(0, Math.min(1, 1 - cv / 2));
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

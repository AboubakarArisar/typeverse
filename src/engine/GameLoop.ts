export const STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250;

export interface LoopCallbacks {
  update(dtMs: number): void;
  render(alpha: number): void;
}

/**
 * Fixed-timestep logic at 60 Hz with interpolated rendering.
 * Auto-pauses when the tab is hidden so timers never run in the background.
 */
export class GameLoop {
  private rafId = 0;
  private acc = 0;
  private last = 0;
  private running = false;
  private cbs: LoopCallbacks | null = null;

  private readonly onVisibility = (): void => {
    if (document.hidden) this.stop();
    else if (this.cbs && !this.running) this.start(this.cbs);
  };

  start(cbs: LoopCallbacks): void {
    if (this.running) return;
    this.cbs = cbs;
    this.running = true;
    this.acc = 0;
    this.last = performance.now();
    document.addEventListener('visibilitychange', this.onVisibility);
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  dispose(): void {
    this.stop();
    this.cbs = null;
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  get isRunning(): boolean {
    return this.running;
  }

  private readonly frame = (now: number): void => {
    if (!this.running || !this.cbs) return;
    this.acc += Math.min(now - this.last, MAX_FRAME_MS);
    this.last = now;
    while (this.acc >= STEP_MS) {
      this.cbs.update(STEP_MS);
      this.acc -= STEP_MS;
    }
    this.cbs.render(this.acc / STEP_MS);
    this.rafId = requestAnimationFrame(this.frame);
  };
}

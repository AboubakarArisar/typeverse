import type { KeyInput, LanguagePack, ModeMeta } from '@/types';
import { BaseMode, type HudChip } from '../shared/BaseMode';
import { ObjectPool } from '../shared/ObjectPool';
import { fitCanvas, token, type Viewport } from '../shared/canvas';
import { modeRegistry } from '../registry';
import { t } from '@/services/i18n';
import type { GameMode } from '../types';

interface Ripple {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  life: number;
}

const RIPPLE_MS = 1400;
const RIPPLE_SPEED = 90;
/** Keystroke melody range: indexes into the pentatonic scale (E4..E5). */
const STEP_MIN = 2;
const STEP_MAX = 7;

/** Zen Mode (FR-ZM-01): endless calm passages, no score on screen, ripples and ambience. */
class Zen extends BaseMode {
  readonly id = 'zen' as const;
  readonly meta: ModeMeta = modeRegistry.zen.meta;

  private ctx2d!: CanvasRenderingContext2D;
  private view: Viewport = { width: 0, height: 0, dpr: 1 };
  private pack!: LanguagePack;
  private ripples!: ObjectPool<Ripple>;
  private live: Ripple[] = [];
  private lines = 0;
  private toneStep = 4;
  private resizeObserver: ResizeObserver | null = null;

  protected async onInit(): Promise<void> {
    const context = this.ctx.canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not available');
    this.ctx2d = context;
    this.view = fitCanvas(this.ctx.canvas);
    this.resizeObserver = new ResizeObserver(() => {
      this.view = fitCanvas(this.ctx.canvas);
    });
    this.resizeObserver.observe(this.ctx.canvas);

    this.pack = await this.ctx.content.language(this.ctx.settings.language);
    this.ripples = new ObjectPool<Ripple>(
      () => ({ active: false, x: 0, y: 0, radius: 0, life: 0 }),
      (r) => {
        r.active = false;
      },
      24,
    );
  }

  protected onStart(): void {
    this.nextLine();
    this.ctx.audio.ambient();
  }

  protected onUpdate(dt: number): void {
    const seconds = dt / 1000;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const r = this.live[i] as Ripple;
      r.life -= dt;
      r.radius += RIPPLE_SPEED * seconds;
      if (r.life <= 0) {
        this.live.splice(i, 1);
        this.ripples.release(r);
      }
    }
  }

  protected onRender(): void {
    const ctx = this.ctx2d;
    const { width, height } = this.view;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = token('--key-lime-side');
    ctx.lineWidth = 2;
    for (const r of this.live) {
      ctx.globalAlpha = Math.max(0, r.life / RIPPLE_MS) * 0.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  protected onKey(input: KeyInput): void {
    const outcome = this.engine.handle(input);
    if (outcome.kind === 'ignored' || outcome.kind === 'released') return;

    if (outcome.kind !== 'wrong') {
      // Wander up or down the scale by small steps so typing sounds like a melody.
      this.ctx.audio.chime(this.toneStep);
      const step = this.toneStep + (this.ctx.rng.int(-2, 2) || 1);
      this.toneStep = Math.min(STEP_MAX, Math.max(STEP_MIN, step));
      this.addRipple();
    }

    if (outcome.kind === 'complete') {
      this.lines++;
      this.nextLine();
      return;
    }
    this.renderLine();
  }

  /** Zen never shows a score; only the calm count of finished lines. */
  protected override chips(): HudChip[] {
    return [{ label: t('hud.lines'), value: String(this.lines) }];
  }

  protected override highlights(): { label: string; value: string }[] {
    return [{ label: t('zen.summary'), value: String(this.lines) }];
  }

  protected override onDispose(): void {
    this.resizeObserver?.disconnect();
    this.ctx.audio.stopMusic();
    this.live.length = 0;
  }

  private addRipple(): void {
    if (this.ctx.settings.reducedMotion) return;
    const r = this.ripples.get();
    r.active = true;
    r.x = this.ctx.rng.float(this.view.width * 0.2, this.view.width * 0.8);
    r.y = this.ctx.rng.float(this.view.height * 0.3, this.view.height * 0.8);
    r.radius = 4;
    r.life = RIPPLE_MS;
    this.live.push(r);
  }

  private nextLine(): void {
    this.engine.clearTargets();
    this.engine.addTarget(this.ctx.rng.pick(this.pack.zen));
    this.renderLine();
  }

  private renderLine(): void {
    const target = this.engine.activeTargets[0];
    if (!target) return;
    const done = escapeHtml(target.text.slice(0, target.typed));
    const current = escapeHtml(target.text.slice(target.typed, target.typed + 1)) || '&nbsp;';
    const rest = escapeHtml(target.text.slice(target.typed + 1));
    this.ctx.overlay.innerHTML = `
      <p class="passage"><span class="passage__done">${done}</span><span class="passage__current">${current}</span>${rest}</p>
      <p class="muted mono">${t('zen.hint')}</p>`;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function create(): GameMode {
  return new Zen();
}

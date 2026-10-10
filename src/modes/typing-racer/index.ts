import type { KeyInput, LanguagePack, ModeMeta } from '@/types';
import { BaseMode, type HudChip } from '../shared/BaseMode';
import { drawKeycap, fitCanvas, keycapPalette, token, type Viewport } from '../shared/canvas';
import { modeRegistry } from '../registry';
import { save } from '@/services/progress';
import { t } from '@/services/i18n';
import type { GameMode } from '../types';

interface Racer {
  name: string;
  wpm: number;
  progress: number;
  color: 'blue' | 'orange' | 'mint' | 'lime';
  variance: number;
}

const BOT_PROFILES = [30, 50, 70];
const SKID_MS = 300;
const MIN_WORDS = 30;
const MAX_WORDS = 80;
const CHARS_PER_WORD = 5;

/** Typing Racer (FR-TR-01): one passage, three bots, a ghost of your best run. */
class TypingRacer extends BaseMode {
  readonly id = 'typing-racer' as const;
  readonly meta: ModeMeta = modeRegistry['typing-racer'].meta;

  private ctx2d!: CanvasRenderingContext2D;
  private view: Viewport = { width: 0, height: 0, dpr: 1 };
  private pack!: LanguagePack;
  private passage = '';
  private racers: Racer[] = [];
  private skidMs = 0;
  private finishedAt: number | null = null;
  private place = 1;
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
    this.passage = this.buildPassage();

    const ghostWpm = save.value?.bests['typing-racer']?.wpm ?? 0;
    this.racers = [
      { name: t('racer.you'), wpm: 0, progress: 0, color: 'blue', variance: 0 },
      ...BOT_PROFILES.map((wpm, i) => ({
        name: t('racer.bot', { n: i + 1 }),
        wpm,
        progress: 0,
        color: (['orange', 'mint', 'lime'] as const)[i] ?? 'orange',
        variance: this.ctx.rng.float(-0.08, 0.08),
      })),
    ];
    if (ghostWpm > 0) {
      this.racers.push({
        name: t('racer.ghost'),
        wpm: ghostWpm,
        progress: 0,
        color: 'mint',
        variance: 0,
      });
    }
  }

  protected onStart(): void {
    this.engine.addTarget(this.passage);
    this.renderPassage();
  }

  protected onUpdate(dt: number): void {
    if (this.skidMs > 0) this.skidMs -= dt;
    const minutes = dt / 60_000;
    const totalChars = this.passage.length;

    for (const racer of this.racers) {
      if (racer.wpm === 0 && racer.name === t('racer.you')) continue;
      const chars = racer.wpm * CHARS_PER_WORD * minutes * (1 + racer.variance);
      racer.progress = Math.min(1, racer.progress + chars / totalChars);
    }

    const you = this.racers[0];
    const target = this.engine.activeTargets[0];
    if (you && target) you.progress = target.typed / totalChars;

    if (you && you.progress >= 1 && this.finishedAt === null) {
      this.finishedAt = this.elapsedMs;
      this.place = 1 + this.racers.slice(1).filter((r) => r.progress >= 1).length;
      this.finish();
    }
  }

  protected onRender(): void {
    const ctx = this.ctx2d;
    const { width, height } = this.view;
    ctx.clearRect(0, 0, width, height);

    const laneHeight = Math.min(56, height / (this.racers.length + 1));
    ctx.font = `500 12px ${token('--font-mono') || 'monospace'}`;
    ctx.textBaseline = 'middle';

    this.racers.forEach((racer, i) => {
      const y = 20 + i * laneHeight;
      ctx.fillStyle = token('--surface-sunk');
      ctx.fillRect(0, y + laneHeight * 0.55, width, 3);

      ctx.fillStyle = token('--ink-muted');
      ctx.fillText(racer.name, 8, y + 8);

      const carWidth = 46;
      const x = 8 + racer.progress * Math.max(0, width - carWidth - 16);
      const skidding = i === 0 && this.skidMs > 0;
      const palette = keycapPalette(skidding ? 'orange' : racer.color);
      drawKeycap(ctx, x, y + laneHeight * 0.2, carWidth, laneHeight * 0.4, palette, 4);
    });

    if (this.skidMs > 0) {
      ctx.fillStyle = token('--error');
      ctx.font = `700 16px ${token('--font-display') || 'sans-serif'}`;
      ctx.fillText(t('racer.skid'), 8, height - 16);
    }
  }

  protected onKey(input: KeyInput): void {
    // A typo makes the car skid; the engine refuses to advance until it is fixed.
    if (this.skidMs > 0 && input.kind !== 'backspace') return;
    const outcome = this.engine.handle(input);
    if (outcome.kind === 'wrong') {
      this.skidMs = SKID_MS;
      this.ctx.audio.play('error');
    } else if (outcome.kind === 'correct' || outcome.kind === 'locked') {
      this.ctx.audio.play('key');
    }
    this.renderPassage();
  }

  protected override chips(): HudChip[] {
    const you = this.racers[0];
    return [
      { label: t('hud.progress'), value: `${Math.round((you?.progress ?? 0) * 100)}%` },
      { label: t('hud.place'), value: `${this.place}/${this.racers.length}` },
    ];
  }

  protected override onDispose(): void {
    this.resizeObserver?.disconnect();
  }

  private buildPassage(): string {
    const words: string[] = [];
    const wanted = this.ctx.rng.int(MIN_WORDS, MAX_WORDS);
    while (words.length < wanted) {
      words.push(...this.ctx.rng.pick(this.pack.sentences).split(' '));
    }
    return words.slice(0, wanted).join(' ');
  }

  /** The passage lives in the DOM overlay so it stays crisp and RTL-aware. */
  private renderPassage(): void {
    const target = this.engine.activeTargets[0];
    if (!target) return;
    const done = target.text.slice(0, target.typed);
    const current = target.text.slice(target.typed, target.typed + 1);
    const rest = target.text.slice(target.typed + 1);
    this.ctx.overlay.innerHTML = `<div class="overlay-bottom"><p class="passage"><span class="passage__done">${escapeHtml(done)}</span><span class="passage__current ${this.skidMs > 0 ? 'passage__wrong' : ''}">${escapeHtml(current)}</span>${escapeHtml(rest)}</p></div>`;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function create(): GameMode {
  return new TypingRacer();
}

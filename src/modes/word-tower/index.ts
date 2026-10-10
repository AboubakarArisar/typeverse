import type { KeyInput, LanguagePack, ModeMeta } from '@/types';
import { BaseMode, type HudChip } from '../shared/BaseMode';
import { drawKeycap, fitCanvas, keycapPalette, token, type Viewport } from '../shared/canvas';
import { modeRegistry } from '../registry';
import { t } from '@/services/i18n';
import type { GameMode } from '../types';

interface Block {
  word: string;
  width: number;
  color: 'blue' | 'orange' | 'mint' | 'lime';
}

const BLOCK_HEIGHT = 22;
const FLOOR_SIZE = 10;
const FLOOR_BONUS = 250;
const WOBBLE_LIMIT = 1;
const WOBBLE_PER_ERROR = 0.22;
const WOBBLE_DECAY = 0.12; // per second of clean typing
const SPRING = 7;
const DAMPING = 2.4;
const COLORS = ['blue', 'orange', 'mint', 'lime'] as const;

/** Word Builder Tower (FR-WB-01): blocks stack, errors add sway, too much sway topples it. */
class WordTower extends BaseMode {
  readonly id = 'word-tower' as const;
  readonly meta: ModeMeta = modeRegistry['word-tower'].meta;

  private ctx2d!: CanvasRenderingContext2D;
  private view: Viewport = { width: 0, height: 0, dpr: 1 };
  private pack!: LanguagePack;
  private wordPool: string[] = [];
  private blocks: Block[] = [];
  private wobble = 0;
  private sway = 0;
  private swayVelocity = 0;
  private floors = 0;
  private toppled = false;
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
    this.wordPool = this.ctx.content.wordPool(
      this.pack,
      this.ctx.difficulty,
      this.ctx.settings.kidMode,
    );
  }

  protected onStart(): void {
    this.nextWord();
  }

  protected onUpdate(dt: number): void {
    const seconds = dt / 1000;
    // Spring-damped sway: a feel, not a physics engine.
    const accel = -SPRING * this.sway - DAMPING * this.swayVelocity;
    this.swayVelocity += accel * seconds;
    this.sway += this.swayVelocity * seconds;
    this.wobble = Math.max(0, this.wobble - WOBBLE_DECAY * seconds);
    if (this.wobble >= WOBBLE_LIMIT && !this.toppled) this.topple();
  }

  protected onRender(alpha: number): void {
    const ctx = this.ctx2d;
    const { width, height } = this.view;
    ctx.clearRect(0, 0, width, height);

    const baseY = height - 30;
    const centerX = width / 2;
    const swayNow = this.sway + this.swayVelocity * alpha * 0.016;

    ctx.fillStyle = token('--line');
    ctx.fillRect(centerX - 120, baseY, 240, 6);

    this.blocks.forEach((block, i) => {
      const y = baseY - (i + 1) * BLOCK_HEIGHT;
      const lean = swayNow * (i + 1) * 3 * (this.toppled ? 6 : 1);
      drawKeycap(
        ctx,
        centerX - block.width / 2 + lean,
        y,
        block.width,
        BLOCK_HEIGHT - 3,
        keycapPalette(block.color),
        3,
      );
      if (i > 0 && (i + 1) % FLOOR_SIZE === 0) {
        ctx.fillStyle = token('--ink-muted');
        ctx.font = `500 11px ${token('--font-mono') || 'monospace'}`;
        ctx.fillText(`F${(i + 1) / FLOOR_SIZE}`, centerX + 130, y + BLOCK_HEIGHT / 2);
      }
    });

    const target = this.engine.activeTargets[0];
    if (target) {
      const size = 30 * this.ctx.settings.fontScale;
      ctx.font = `800 ${size}px ${token('--font-mono') || 'monospace'}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = token('--ink-muted');
      ctx.fillText(target.text.slice(0, target.typed), centerX - 60, 56);
      ctx.fillStyle = token('--ink');
      ctx.fillText(target.text.slice(target.typed), centerX + 40, 56);
      ctx.textAlign = 'start';
    }
  }

  protected onKey(input: KeyInput): void {
    if (input.kind === 'enter') {
      this.finish();
      return;
    }
    const outcome = this.engine.handle(input);
    if (outcome.kind === 'wrong') {
      this.wobble += WOBBLE_PER_ERROR;
      this.swayVelocity += this.ctx.rng.chance(0.5) ? 0.9 : -0.9;
      this.ctx.audio.play('error');
      return;
    }
    if (outcome.kind === 'complete') {
      this.addBlock(outcome.target.text);
      this.nextWord();
      return;
    }
    if (outcome.kind === 'correct' || outcome.kind === 'locked') this.ctx.audio.play('key');
  }

  protected override chips(): HudChip[] {
    return [
      { label: t('hud.height'), value: String(this.blocks.length) },
      { label: t('hud.floor'), value: String(this.floors) },
      { label: t('hud.wobble'), value: `${Math.round((this.wobble / WOBBLE_LIMIT) * 100)}%` },
    ];
  }

  protected override onDispose(): void {
    this.resizeObserver?.disconnect();
    this.blocks.length = 0;
  }

  private nextWord(): void {
    this.engine.clearTargets();
    this.engine.addTarget(this.ctx.rng.pick(this.wordPool));
  }

  private addBlock(word: string): void {
    this.ctx.audio.play('word');
    this.blocks.push({
      word,
      width: Math.min(220, 40 + word.length * 14),
      color: COLORS[this.blocks.length % COLORS.length] ?? 'orange',
    });
    this.swayVelocity += this.ctx.rng.float(-0.15, 0.15);

    if (this.blocks.length % FLOOR_SIZE === 0) {
      this.floors++;
      this.engine.addScore(FLOOR_BONUS);
      // Reaching a floor banks progress: the tower steadies.
      this.wobble = Math.max(0, this.wobble - 0.3);
      this.ctx.audio.play('levelUp');
    }
  }

  private topple(): void {
    this.toppled = true;
    this.ctx.audio.play('hit');
    this.ctx.overlay.innerHTML = `<p class="passage">${t('tower.topple')}</p>`;
    this.finish();
  }
}

export function create(): GameMode {
  return new WordTower();
}

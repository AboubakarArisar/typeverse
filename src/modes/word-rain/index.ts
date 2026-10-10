import type { KeyInput, LanguagePack, ModeMeta } from '@/types';
import { BaseMode, type HudChip, type HudState } from '../shared/BaseMode';
import { ObjectPool } from '../shared/ObjectPool';
import { DIFFICULTIES } from '../shared/difficulty';
import {
  drawKeycap,
  fitCanvas,
  keycapPalette,
  measureCached,
  roundRect,
  token,
  type Palette,
  type Viewport,
} from '../shared/canvas';
import { modeRegistry } from '../registry';
import { t } from '@/services/i18n';
import type { GameMode } from '../types';

type WordKind = 'normal' | 'gold' | 'red' | 'green' | 'boss';

interface FallingWord {
  active: boolean;
  targetId: number;
  text: string;
  kind: WordKind;
  x: number;
  y: number;
  prevY: number;
  speed: number;
  width: number;
  wobble: number;
}

interface Particle {
  active: boolean;
  char: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  palette: Palette;
}

const LIVES = 3;
const BASE_SPEED = 42; // px per second at difficulty 1
const BASE_SPAWN_MS = 2200;
const SPEED_CAP = 3;
const SCORE_STEP = 500;
const FREEZE_MS = 3000;
const BOSS_MULTIPLIER = 5;
const GRAVITY = 900;

const KIND_COLOR: Record<WordKind, 'blue' | 'orange' | 'mint' | 'lime'> = {
  normal: 'blue',
  gold: 'orange',
  red: 'orange',
  green: 'mint',
  boss: 'lime',
};

/** Word Rain (FR-WR-01). Falling words, three lives, power-ups, rising speed. */
class WordRain extends BaseMode {
  readonly id = 'word-rain' as const;
  readonly meta: ModeMeta = modeRegistry['word-rain'].meta;

  private ctx2d!: CanvasRenderingContext2D;
  private view: Viewport = { width: 0, height: 0, dpr: 1 };
  private pack!: LanguagePack;
  private pool!: ObjectPool<FallingWord>;
  private particles!: ObjectPool<Particle>;
  private words: FallingWord[] = [];
  private live: Particle[] = [];
  private byTarget = new Map<number, FallingWord>();
  private wordPool: string[] = [];

  private lives = LIVES;
  private spawnTimer = 0;
  private freezeMs = 0;
  private flashMs = 0;
  private notice = '';
  private noticeMs = 0;
  private speedScale = 1;
  private spawnScale = 1;
  private nextCurveScore = SCORE_STEP;
  private resizeObserver: ResizeObserver | null = null;

  protected async onInit(): Promise<void> {
    const canvas = this.ctx.canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not available');
    this.ctx2d = context;
    this.view = fitCanvas(canvas);
    this.resizeObserver = new ResizeObserver(() => {
      this.view = fitCanvas(canvas);
    });
    this.resizeObserver.observe(canvas);

    this.pack = await this.ctx.content.language(this.ctx.settings.language);
    this.wordPool = this.ctx.content.wordPool(
      this.pack,
      this.ctx.difficulty,
      this.ctx.settings.kidMode,
    );

    this.pool = new ObjectPool<FallingWord>(
      () => ({
        active: false,
        targetId: 0,
        text: '',
        kind: 'normal',
        x: 0,
        y: 0,
        prevY: 0,
        speed: 0,
        width: 0,
        wobble: 0,
      }),
      (w) => {
        w.active = false;
        w.wobble = 0;
      },
      16,
    );
    this.particles = new ObjectPool<Particle>(
      () => ({
        active: false,
        char: '',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        palette: keycapPalette('blue'),
      }),
      (p) => {
        p.active = false;
      },
      48,
    );

    this.engine.configure({
      backspace: DIFFICULTIES[this.ctx.difficulty].backspace,
      pointsPerChar: 10,
    });
  }

  protected onStart(): void {
    this.lives = LIVES;
    this.spawnTimer = 0;
    this.spawn();
  }

  protected onUpdate(dt: number): void {
    const seconds = dt / 1000;
    if (this.freezeMs > 0) this.freezeMs -= dt;
    if (this.flashMs > 0) this.flashMs -= dt;
    if (this.noticeMs > 0) this.noticeMs -= dt;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = (BASE_SPAWN_MS / DIFFICULTIES[this.ctx.difficulty].speed) * this.spawnScale;
    }

    const frozen = this.freezeMs > 0;
    const floor = this.view.height - 48;
    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i] as FallingWord;
      w.prevY = w.y;
      if (!frozen) w.y += w.speed * seconds;
      if (w.wobble > 0) w.wobble = Math.max(0, w.wobble - dt);
      this.engine.setPriority(w.targetId, w.y);
      if (w.y >= floor) this.loseLife(w, i);
    }

    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i] as Particle;
      p.life -= dt;
      p.x += p.vx * seconds;
      p.y += p.vy * seconds;
      p.vy += GRAVITY * seconds;
      if (p.life <= 0) {
        this.live.splice(i, 1);
        this.particles.release(p);
      }
    }

    this.applyCurve();
  }

  protected onRender(alpha: number): void {
    const ctx = this.ctx2d;
    const { width, height } = this.view;
    ctx.clearRect(0, 0, width, height);

    // Ground line
    ctx.fillStyle = token('--line');
    ctx.fillRect(0, height - 42, width, 4);

    ctx.textBaseline = 'middle';
    ctx.font = `800 ${this.fontSize()}px ${token('--font-mono') || 'monospace'}`;

    const locked = this.engine.locked;
    for (const w of this.words) {
      const y = w.prevY + (w.y - w.prevY) * alpha;
      const shake = w.wobble > 0 ? Math.sin(w.wobble * 0.08) * 4 : 0;
      const typed = this.engine.getTarget(w.targetId)?.typed ?? 0;
      this.drawWord(w, w.x + shake, y, typed, locked?.id === w.targetId);
    }

    ctx.globalAlpha = 1;
    for (const p of this.live) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 500));
      drawKeycap(ctx, p.x, p.y, 16, 16, p.palette, 2);
      ctx.fillStyle = token('--on-key');
      ctx.font = `700 11px ${token('--font-display') || 'sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.fillText(p.char, p.x + 8, p.y + 9);
    }
    ctx.globalAlpha = 1;

    if (this.flashMs > 0) {
      ctx.fillStyle = token('--error');
      ctx.globalAlpha = Math.min(0.25, this.flashMs / 400);
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }

    if (this.noticeMs > 0 && this.notice) {
      ctx.fillStyle = token('--ink');
      ctx.textAlign = 'center';
      ctx.font = `700 20px ${token('--font-display') || 'sans-serif'}`;
      ctx.fillText(this.notice, width / 2, 60);
    }
    ctx.textAlign = 'start';
  }

  protected onKey(input: KeyInput): void {
    const outcome = this.engine.handle(input);
    switch (outcome.kind) {
      case 'locked':
      case 'correct':
        this.ctx.audio.play('key');
        break;
      case 'complete': {
        const word = this.byTarget.get(outcome.target.id);
        if (word) this.completeWord(word);
        break;
      }
      case 'wrong': {
        this.ctx.audio.play('error');
        const locked = this.engine.locked;
        const word = locked ? this.byTarget.get(locked.id) : undefined;
        if (word) word.wobble = 180;
        break;
      }
      default:
        break;
    }
  }

  protected override chips(): HudChip[] {
    return [{ label: t('hud.lives'), value: String(this.lives) }];
  }

  protected override meter(): HudState['meter'] {
    return { label: t('hud.lives'), filled: this.lives, total: LIVES };
  }

  protected override onDispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.words.length = 0;
    this.live.length = 0;
    this.byTarget.clear();
  }

  // ---- internals -----------------------------------------------------------

  private fontSize(): number {
    return 24 * this.ctx.settings.fontScale * (this.ctx.settings.kidMode ? 1.3 : 1);
  }

  private spawn(): void {
    const rng = this.ctx.rng;
    const kind = this.rollKind();
    const text = kind === 'boss' ? rng.pick(this.pack.sentences) : rng.pick(this.wordPool);
    const word = this.pool.get();
    const ctx = this.ctx2d;
    ctx.font = `800 ${this.fontSize()}px ${token('--font-mono') || 'monospace'}`;

    word.active = true;
    word.text = text;
    word.kind = kind;
    word.width = measureCached(ctx, text) + 28;
    word.x = rng.float(12, Math.max(14, this.view.width - word.width - 12));
    word.y = -40;
    word.prevY = -40;
    word.wobble = 0;
    word.speed =
      BASE_SPEED *
      DIFFICULTIES[this.ctx.difficulty].speed *
      this.speedScale *
      (kind === 'boss' ? 0.45 : 1);

    const target = this.engine.addTarget(text, word.y);
    word.targetId = target.id;
    this.byTarget.set(target.id, word);
    this.words.push(word);
  }

  private rollKind(): WordKind {
    const rng = this.ctx.rng;
    if (rng.chance(0.04)) return 'boss';
    if (rng.chance(0.05)) return 'gold';
    if (rng.chance(0.04)) return 'red';
    if (rng.chance(0.04) && this.lives < LIVES) return 'green';
    return 'normal';
  }

  private completeWord(word: FallingWord): void {
    this.ctx.audio.play('word');
    this.burst(word);
    switch (word.kind) {
      case 'gold':
        this.freezeMs = FREEZE_MS;
        this.announce(t('wordRain.freeze'));
        break;
      case 'red':
        this.clearScreen(word);
        this.announce(t('wordRain.clear'));
        break;
      case 'green':
        this.lives = Math.min(LIVES, this.lives + 1);
        this.announce(t('wordRain.extraLife'));
        break;
      case 'boss':
        this.engine.addScore(word.text.length * 10 * (BOSS_MULTIPLIER - 1));
        this.announce(t('wordRain.boss'));
        break;
      default:
        break;
    }
    this.remove(word);
  }

  private clearScreen(except: FallingWord): void {
    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i] as FallingWord;
      if (w === except) continue;
      this.burst(w);
      this.engine.removeTarget(w.targetId);
      this.remove(w);
    }
  }

  private loseLife(word: FallingWord, index: number): void {
    this.lives--;
    this.flashMs = 400;
    this.ctx.audio.play('hit');
    this.announce(t('wordRain.lifeLost'));
    this.engine.removeTarget(word.targetId);
    this.byTarget.delete(word.targetId);
    this.words.splice(index, 1);
    this.pool.release(word);
    this.syncHud();
    if (this.lives <= 0) this.finish();
  }

  private remove(word: FallingWord): void {
    const index = this.words.indexOf(word);
    if (index >= 0) this.words.splice(index, 1);
    this.byTarget.delete(word.targetId);
    this.pool.release(word);
  }

  /** Word burst: letters fly off as tiny keycaps (flash only in reduced motion). */
  private burst(word: FallingWord): void {
    if (this.ctx.settings.reducedMotion) {
      this.flashMs = 120;
      return;
    }
    const palette = keycapPalette(KIND_COLOR[word.kind]);
    const step = word.width / Math.max(1, word.text.length);
    for (let i = 0; i < word.text.length && i < 24; i++) {
      const p = this.particles.get();
      p.active = true;
      p.char = word.text[i] as string;
      p.x = word.x + i * step;
      p.y = word.y;
      p.vx = this.ctx.rng.float(-120, 120);
      p.vy = this.ctx.rng.float(-260, -80);
      p.life = 520;
      p.palette = palette;
      this.live.push(p);
    }
  }

  private announce(text: string): void {
    this.notice = text;
    this.noticeMs = 900;
  }

  /** Speed +5% and spawn interval -4% every 500 points, capped at 3x speed. */
  private applyCurve(): void {
    while (this.engine.score >= this.nextCurveScore) {
      this.speedScale = Math.min(SPEED_CAP, this.speedScale * 1.05);
      this.spawnScale = Math.max(0.3, this.spawnScale * 0.96);
      this.nextCurveScore += SCORE_STEP;
    }
  }

  private drawWord(
    word: FallingWord,
    x: number,
    y: number,
    typed: number,
    isLocked: boolean,
  ): void {
    const ctx = this.ctx2d;
    const size = this.fontSize();
    const height = size + 18;
    const palette = keycapPalette(KIND_COLOR[word.kind]);
    drawKeycap(ctx, x, y, word.width, height, palette);

    if (isLocked) {
      ctx.strokeStyle = token('--key-blue-side');
      ctx.lineWidth = 3;
      roundRect(ctx, x - 3, y - 3, word.width + 6, height + 6, height * 0.24);
      ctx.stroke();
    }

    const textY = y + height / 2;
    ctx.font = `800 ${size}px ${token('--font-mono') || 'monospace'}`;
    const done = word.text.slice(0, typed);
    const rest = word.text.slice(typed);
    ctx.fillStyle = token('--ink-muted');
    ctx.fillText(done, x + 14, textY);
    const doneWidth = measureCached(ctx, done);
    ctx.fillStyle = token('--on-key');
    ctx.fillText(rest, x + 14 + doneWidth, textY);

    if (typed > 0) {
      ctx.fillStyle = token('--key-mint-side');
      ctx.fillRect(x + 14, textY + size * 0.55, doneWidth, 3);
    }
  }
}

export function create(): GameMode {
  return new WordRain();
}

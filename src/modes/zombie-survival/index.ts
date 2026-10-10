import type { KeyInput, LanguagePack, ModeMeta } from '@/types';
import { BaseMode, type HudChip, type HudState } from '../shared/BaseMode';
import { ObjectPool } from '../shared/ObjectPool';
import { DIFFICULTIES } from '../shared/difficulty';
import { drawKeycap, fitCanvas, keycapPalette, token, type Viewport } from '../shared/canvas';
import { modeRegistry } from '../registry';
import { t } from '@/services/i18n';
import type { GameMode } from '../types';

type SubState = 'wave' | 'upgradePick' | 'boss';
type UpgradeId = 'shotgun' | 'slow' | 'barricade';

interface Walker {
  active: boolean;
  targetId: number;
  text: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  speed: number;
  boss: boolean;
  size: number;
}

const CENTER_RADIUS = 34;
const BASE_SPEED = 26;
const SHOTGUN_RADIUS = 140;
const SLOW_RADIUS = 180;
const SLOW_FACTOR = 0.7;
const BOSS_EVERY = 5;

const UPGRADES: { id: UpgradeId; nameKey: string; descKey: string }[] = [
  { id: 'shotgun', nameKey: 'zombie.shotgun', descKey: 'zombie.shotgunDesc' },
  { id: 'slow', nameKey: 'zombie.slow', descKey: 'zombie.slowDesc' },
  { id: 'barricade', nameKey: 'zombie.barricade', descKey: 'zombie.barricadeDesc' },
];

/** Zombie Survival (FR-ZS-01). Waves from all sides, upgrades, a boss every 5 waves. */
class ZombieSurvival extends BaseMode {
  readonly id = 'zombie-survival' as const;
  readonly meta: ModeMeta = modeRegistry['zombie-survival'].meta;

  private ctx2d!: CanvasRenderingContext2D;
  private view: Viewport = { width: 0, height: 0, dpr: 1 };
  private pack!: LanguagePack;
  private wordPool: string[] = [];
  private pool!: ObjectPool<Walker>;
  private walkers: Walker[] = [];
  private byTarget = new Map<number, Walker>();

  private sub: SubState = 'wave';
  private wave = 0;
  private toSpawn = 0;
  private spawnTimer = 0;
  private barricades = 0;
  private upgrades = new Set<UpgradeId>();
  private offered: UpgradeId[] = [];
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
    this.pool = new ObjectPool<Walker>(
      () => ({
        active: false,
        targetId: 0,
        text: '',
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        speed: 0,
        boss: false,
        size: 26,
      }),
      (w) => {
        w.active = false;
      },
      24,
    );
    this.engine.configure({ backspace: DIFFICULTIES[this.ctx.difficulty].backspace });
  }

  protected onStart(): void {
    this.startWave();
  }

  protected onUpdate(dt: number): void {
    if (this.sub === 'upgradePick') return;
    const seconds = dt / 1000;
    const cx = this.view.width / 2;
    const cy = this.view.height / 2;

    this.spawnTimer -= dt;
    if (this.toSpawn > 0 && this.spawnTimer <= 0) {
      this.spawnWalker(false);
      this.toSpawn--;
      this.spawnTimer = Math.max(350, 1400 - this.wave * 60);
    }

    for (let i = this.walkers.length - 1; i >= 0; i--) {
      const w = this.walkers[i] as Walker;
      w.prevX = w.x;
      w.prevY = w.y;
      const dx = cx - w.x;
      const dy = cy - w.y;
      const dist = Math.hypot(dx, dy) || 1;
      const slowed = this.upgrades.has('slow') && dist < SLOW_RADIUS ? SLOW_FACTOR : 1;
      w.x += (dx / dist) * w.speed * slowed * seconds;
      w.y += (dy / dist) * w.speed * slowed * seconds;
      this.engine.setPriority(w.targetId, 2000 - dist);
      if (dist <= CENTER_RADIUS + w.size * 0.5) this.hitPlayer(w, i);
    }

    if (this.toSpawn === 0 && this.walkers.length === 0) this.offerUpgrades();
  }

  protected onRender(alpha: number): void {
    const ctx = this.ctx2d;
    const { width, height } = this.view;
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;

    if (this.upgrades.has('slow')) {
      ctx.strokeStyle = token('--key-mint-side');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, SLOW_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }

    // The player, drawn as a keycap with the barricade count on it.
    drawKeycap(
      ctx,
      cx - CENTER_RADIUS,
      cy - CENTER_RADIUS,
      CENTER_RADIUS * 2,
      CENTER_RADIUS * 2,
      keycapPalette('blue'),
    );
    ctx.fillStyle = token('--on-key');
    ctx.font = `700 20px ${token('--font-display') || 'sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.barricades > 0 ? `+${this.barricades}` : 'YOU', cx, cy);

    const locked = this.engine.locked;
    const palette = keycapPalette('lime');
    const bossPalette = keycapPalette('orange');
    const fontSize = 16 * this.ctx.settings.fontScale;

    for (const w of this.walkers) {
      const x = w.prevX + (w.x - w.prevX) * alpha;
      const y = w.prevY + (w.y - w.prevY) * alpha;
      drawKeycap(
        ctx,
        x - w.size / 2,
        y - w.size / 2,
        w.size,
        w.size,
        w.boss ? bossPalette : palette,
        4,
      );
      // Friendly face so kid mode reads as slimes, not gore.
      ctx.fillStyle = token('--on-key');
      ctx.beginPath();
      ctx.arc(x - w.size * 0.16, y - w.size * 0.1, 2.5, 0, Math.PI * 2);
      ctx.arc(x + w.size * 0.16, y - w.size * 0.1, 2.5, 0, Math.PI * 2);
      ctx.fill();

      const typed = this.engine.getTarget(w.targetId)?.typed ?? 0;
      ctx.font = `800 ${fontSize}px ${token('--font-mono') || 'monospace'}`;
      ctx.fillStyle = locked?.id === w.targetId ? token('--key-blue-side') : token('--ink');
      ctx.fillText(w.text.slice(typed), x, y + w.size * 0.9);
      if (typed > 0) {
        ctx.fillStyle = token('--ink-muted');
        ctx.fillText(w.text.slice(0, typed), x, y + w.size * 0.9 + fontSize);
      }
    }
    ctx.textAlign = 'start';
  }

  protected onKey(input: KeyInput): void {
    if (this.sub === 'upgradePick') {
      const index = Number(input.char) - 1;
      const pick = this.offered[index];
      if (pick) this.takeUpgrade(pick);
      return;
    }

    const outcome = this.engine.handle(input);
    if (outcome.kind === 'wrong') {
      this.ctx.audio.play('error');
      return;
    }
    if (outcome.kind === 'complete') {
      const walker = this.byTarget.get(outcome.target.id);
      if (walker) this.kill(walker);
      return;
    }
    if (outcome.kind === 'correct' || outcome.kind === 'locked') this.ctx.audio.play('key');
  }

  protected override chips(): HudChip[] {
    return [
      { label: t('hud.wave'), value: String(this.wave) },
      { label: t('zombie.barricade'), value: String(this.barricades) },
    ];
  }

  protected override meter(): HudState['meter'] {
    return {
      label: t('zombie.barricade'),
      filled: this.barricades,
      total: Math.max(1, this.barricades),
    };
  }

  protected override onDispose(): void {
    this.resizeObserver?.disconnect();
    this.walkers.length = 0;
    this.byTarget.clear();
  }

  // ---- internals -----------------------------------------------------------

  private startWave(): void {
    this.wave++;
    this.sub = this.wave % BOSS_EVERY === 0 ? 'boss' : 'wave';
    this.ctx.overlay.replaceChildren();
    if (this.sub === 'boss') {
      this.toSpawn = 0;
      this.spawnBoss();
    } else {
      this.toSpawn = 3 + this.wave;
      this.spawnTimer = 0;
    }
  }

  private spawnWalker(boss: boolean): void {
    const rng = this.ctx.rng;
    const { width, height } = this.view;
    const edge = rng.int(0, 3);
    const walker = this.pool.get();
    const text = boss
      ? rng.pick(this.pack.sentences).split(' ').slice(0, 3).join(' ')
      : rng.pick(this.wordPool);

    walker.active = true;
    walker.boss = boss;
    walker.text = text;
    walker.size = boss ? 54 : 22 + Math.min(18, text.length * 2);
    walker.speed =
      (BASE_SPEED + this.wave * 2) * DIFFICULTIES[this.ctx.difficulty].speed * (boss ? 0.6 : 1);

    if (edge === 0) {
      walker.x = rng.float(0, width);
      walker.y = -30;
    } else if (edge === 1) {
      walker.x = width + 30;
      walker.y = rng.float(0, height);
    } else if (edge === 2) {
      walker.x = rng.float(0, width);
      walker.y = height + 30;
    } else {
      walker.x = -30;
      walker.y = rng.float(0, height);
    }
    walker.prevX = walker.x;
    walker.prevY = walker.y;

    const target = this.engine.addTarget(text, 0);
    walker.targetId = target.id;
    this.byTarget.set(target.id, walker);
    this.walkers.push(walker);
  }

  /** Boss: a sentence split into chunks, each chunk a separate target. */
  private spawnBoss(): void {
    const sentence = this.ctx.rng.pick(this.pack.sentences);
    const words = sentence.split(' ');
    const chunks = Math.min(4, Math.ceil(words.length / 3));
    for (let i = 0; i < chunks; i++) {
      this.spawnWalker(true);
      const walker = this.walkers[this.walkers.length - 1];
      if (!walker) continue;
      const slice = words.slice(i * 3, i * 3 + 3).join(' ') || sentence;
      this.engine.removeTarget(walker.targetId);
      this.byTarget.delete(walker.targetId);
      const target = this.engine.addTarget(slice, 0);
      walker.text = slice;
      walker.targetId = target.id;
      this.byTarget.set(target.id, walker);
    }
  }

  private kill(walker: Walker): void {
    this.ctx.audio.play('word');
    if (this.upgrades.has('shotgun')) {
      for (let i = this.walkers.length - 1; i >= 0; i--) {
        const other = this.walkers[i] as Walker;
        if (other === walker) continue;
        if (Math.hypot(other.x - walker.x, other.y - walker.y) <= SHOTGUN_RADIUS) {
          this.engine.removeTarget(other.targetId);
          this.remove(other);
        }
      }
    }
    this.remove(walker);
  }

  private remove(walker: Walker): void {
    const index = this.walkers.indexOf(walker);
    if (index >= 0) this.walkers.splice(index, 1);
    this.byTarget.delete(walker.targetId);
    this.pool.release(walker);
  }

  private hitPlayer(walker: Walker, index: number): void {
    this.engine.removeTarget(walker.targetId);
    this.byTarget.delete(walker.targetId);
    this.walkers.splice(index, 1);
    this.pool.release(walker);
    if (this.barricades > 0) {
      this.barricades--;
      this.ctx.audio.play('hit');
      this.syncHud();
      return;
    }
    this.finish();
  }

  private offerUpgrades(): void {
    this.sub = 'upgradePick';
    this.offered = UPGRADES.map((u) => u.id);
    this.ctx.overlay.innerHTML = `
      <div class="stack">
        <h2 class="section-label">${t('zombie.upgrade')}</h2>
        <ul class="passage">
          ${UPGRADES.map(
            (u, i) => `<li><strong>${i + 1}</strong> &mdash; ${t(u.nameKey)}: ${t(u.descKey)}</li>`,
          ).join('')}
        </ul>
      </div>`;
  }

  private takeUpgrade(id: UpgradeId): void {
    if (id === 'barricade') this.barricades++;
    else this.upgrades.add(id);
    this.ctx.audio.play('select');
    this.startWave();
    this.syncHud();
  }
}

export function create(): GameMode {
  return new ZombieSurvival();
}

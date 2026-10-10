import type { BeatChart, KeyInput, LanguagePack, ModeMeta } from '@/types';
import { BaseMode, type HudChip } from '../shared/BaseMode';
import { drawKeycap, fitCanvas, keycapPalette, token, type Viewport } from '../shared/canvas';
import { modeRegistry } from '../registry';
import { noteToFreq } from '@/services/audio';
import { t } from '@/services/i18n';
import type { GameMode } from '../types';
import { downloadBlob, renderWav, type RecordedNote } from './wav';

type Phase = 'menu' | 'free' | 'rhythm';
type Judgement = 'perfect' | 'good' | 'miss';

const PERFECT_MS = 40;
const GOOD_MS = 90;
const SCROLL_MS = 2000; // time a note is visible before the hit line
const HIT_LINE = 0.18; // fraction of width
const POINTS: Record<Judgement, number> = { perfect: 100, good: 50, miss: 0 };

/** Minor pentatonic, so any keystroke sounds musical. */
const SCALE = ['C4', 'Eb4', 'F4', 'G4', 'Bb4', 'C5', 'Eb5', 'F5'];
const LAYER_NOTES = ['C2', 'G2', 'C3', 'Eb3'];
const TEMPO_MIN = 80;
const TEMPO_MAX = 140;

interface LiveNote {
  beat: number;
  char: string;
  timeMs: number;
  hit: Judgement | null;
}

/** Type Beats (FR-TB-01, FR-TB-02): rhythm charts and a free-play instrument. */
class TypeBeats extends BaseMode {
  readonly id = 'type-beats' as const;
  readonly meta: ModeMeta = modeRegistry['type-beats'].meta;

  private ctx2d!: CanvasRenderingContext2D;
  private view: Viewport = { width: 0, height: 0, dpr: 1 };
  private phase: Phase = 'menu';
  private pack!: LanguagePack;
  private wordPool: string[] = [];
  private chartIds: string[] = [];
  private chart: BeatChart | null = null;
  private notes: LiveNote[] = [];
  private nextNote = 0;
  private judgement: Judgement | null = null;
  private judgementMs = 0;
  private counts: Record<Judgement, number> = { perfect: 0, good: 0, miss: 0 };
  private layers = 0;
  private tempo = TEMPO_MIN;
  private recorded: RecordedNote[] = [];
  private keyCount = 0;
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
    this.chartIds = this.ctx.content.listCharts();
  }

  protected onStart(): void {
    this.phase = 'menu';
    this.renderMenu();
  }

  protected onUpdate(dt: number): void {
    if (this.judgementMs > 0) this.judgementMs -= dt;
    if (this.phase !== 'rhythm') return;

    // Notes the player never hit become misses once they pass the window.
    for (const note of this.notes) {
      if (note.hit === null && this.elapsedMs - note.timeMs > GOOD_MS) {
        note.hit = 'miss';
        this.counts.miss++;
        this.engine.metrics.record(note.char, false, this.elapsedMs);
      }
    }
    const lastNote = this.notes[this.notes.length - 1];
    if (lastNote && this.elapsedMs > lastNote.timeMs + 1500) this.finish();
  }

  protected onRender(): void {
    const ctx = this.ctx2d;
    const { width, height } = this.view;
    ctx.clearRect(0, 0, width, height);
    if (this.phase === 'menu') return;
    if (this.phase === 'rhythm') this.renderRhythm();
    else this.renderFree();
  }

  protected onKey(input: KeyInput): void {
    if (this.phase === 'menu') {
      this.chooseFromMenu(input);
      return;
    }
    if (this.phase === 'free') {
      if (input.kind === 'enter') {
        void this.exportWav();
        return;
      }
      this.playFree(input);
      return;
    }
    this.judgeRhythm(input);
  }

  protected override chips(): HudChip[] {
    if (this.phase === 'free') {
      return [
        { label: t('hud.layers'), value: `${this.layers}/4` },
        { label: 'BPM', value: String(Math.round(this.tempo)) },
      ];
    }
    return [
      { label: t('beats.perfect'), value: String(this.counts.perfect) },
      { label: t('beats.good'), value: String(this.counts.good) },
      { label: t('beats.miss'), value: String(this.counts.miss) },
    ];
  }

  protected override onDispose(): void {
    this.resizeObserver?.disconnect();
    this.ctx.audio.stopMusic();
  }

  // ---- menu ----------------------------------------------------------------

  private renderMenu(): void {
    const options = [
      `<li><strong>1</strong> &mdash; ${t('beats.free')}</li>`,
      ...this.chartIds.map((id, i) => `<li><strong>${i + 2}</strong> &mdash; ${id}</li>`),
    ].join('');
    this.ctx.overlay.innerHTML = `
      <div class="stack">
        <h2 class="section-label">${t('beats.pickSong')}</h2>
        <ul class="passage">${options}</ul>
      </div>`;
  }

  private chooseFromMenu(input: KeyInput): void {
    const index = Number(input.char) - 1;
    if (!Number.isInteger(index) || index < 0) return;
    this.ctx.overlay.replaceChildren();
    if (index === 0) {
      this.startFree();
      return;
    }
    const id = this.chartIds[index - 1];
    if (id) void this.startRhythm(id);
    else this.renderMenu();
  }

  // ---- free play -----------------------------------------------------------

  private startFree(): void {
    this.phase = 'free';
    this.elapsedMs = 0;
    this.nextWord();
    this.ctx.overlay.innerHTML = `<p class="passage muted">${t('beats.stop')} &middot; Enter: ${t('beats.export')}</p>`;
  }

  private nextWord(): void {
    this.engine.clearTargets();
    this.engine.addTarget(this.ctx.rng.pick(this.wordPool));
  }

  private playFree(input: KeyInput): void {
    const outcome = this.engine.handle(input);
    if (outcome.kind === 'ignored' || outcome.kind === 'released') return;

    this.keyCount++;
    // Typing speed sets the tempo inside a musical range.
    const minutes = Math.max(this.elapsedMs, 1) / 60_000;
    const wpm = this.keyCount / 5 / minutes;
    this.tempo = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, TEMPO_MIN + wpm));

    const note = SCALE[this.keyCount % SCALE.length] as string;
    const freq = noteToFreq(note);
    this.ctx.audio.note(freq, 0.35);
    this.recorded.push({ time: this.elapsedMs / 1000, freq, duration: 0.35 });

    if (outcome.kind === 'complete') {
      this.layers = Math.min(LAYER_NOTES.length, this.layers + 1);
      const layerNote = LAYER_NOTES[this.layers - 1] as string;
      const layerFreq = noteToFreq(layerNote);
      this.ctx.audio.note(layerFreq, 0.8, 'sine');
      this.recorded.push({ time: this.elapsedMs / 1000, freq: layerFreq, duration: 0.8 });
      this.nextWord();
    }
  }

  private async exportWav(): Promise<void> {
    if (this.recorded.length === 0) return;
    downloadBlob(await renderWav(this.recorded), 'typeverse-beat.wav');
  }

  private renderFree(): void {
    const ctx = this.ctx2d;
    const { width, height } = this.view;
    const target = this.engine.activeTargets[0];
    const palette = keycapPalette('orange');

    for (let i = 0; i < LAYER_NOTES.length; i++) {
      const on = i < this.layers;
      const w = width * 0.6;
      const y = height * 0.12 + i * 26;
      ctx.globalAlpha = on ? 1 : 0.25;
      drawKeycap(ctx, (width - w) / 2, y, w, 16, palette, 3);
    }
    ctx.globalAlpha = 1;

    if (!target) return;
    const size = 40 * this.ctx.settings.fontScale;
    ctx.font = `800 ${size}px ${token('--font-mono') || 'monospace'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const done = target.text.slice(0, target.typed);
    ctx.fillStyle = token('--ink-muted');
    ctx.fillText(done, width / 2, height / 2 - 20);
    ctx.fillStyle = token('--ink');
    ctx.fillText(target.text.slice(target.typed), width / 2, height / 2 + 24);
    ctx.textAlign = 'start';
  }

  // ---- rhythm --------------------------------------------------------------

  private async startRhythm(id: string): Promise<void> {
    const chart = await this.ctx.content.chart(id);
    this.chart = chart;
    const beatMs = 60_000 / chart.bpm;
    this.notes = chart.notes.map((n) => ({
      beat: n.beat,
      char: n.char,
      timeMs: chart.offsetMs + n.beat * beatMs,
      hit: null,
    }));
    this.nextNote = 0;
    this.phase = 'rhythm';
    this.elapsedMs = 0;
    this.ctx.audio.music('C3');
  }

  private judgeRhythm(input: KeyInput): void {
    if (input.kind !== 'char' && input.kind !== 'space') return;
    const char = input.char.toLowerCase();
    let best: LiveNote | null = null;
    let bestDelta = Infinity;
    for (let i = this.nextNote; i < this.notes.length; i++) {
      const note = this.notes[i] as LiveNote;
      if (note.hit !== null) continue;
      const delta = Math.abs(note.timeMs - this.elapsedMs);
      if (delta > 400) break;
      if (note.char.toLowerCase() === char && delta < bestDelta) {
        best = note;
        bestDelta = delta;
      }
    }

    const judgement: Judgement =
      best === null
        ? 'miss'
        : bestDelta <= PERFECT_MS
          ? 'perfect'
          : bestDelta <= GOOD_MS
            ? 'good'
            : 'miss';

    if (best && judgement !== 'miss') {
      best.hit = judgement;
      this.engine.metrics.record(best.char, true, this.elapsedMs);
      this.engine.addScore(POINTS[judgement]);
      this.ctx.audio.note(SCALE[this.counts.perfect % SCALE.length] as string, 0.2);
    } else {
      this.counts.miss++;
      this.engine.metrics.record(char, false, this.elapsedMs);
      this.ctx.audio.play('error');
    }
    if (judgement !== 'miss') this.counts[judgement]++;
    this.judgement = judgement;
    this.judgementMs = 400;
    while (this.nextNote < this.notes.length && this.notes[this.nextNote]?.hit !== null) {
      this.nextNote++;
    }
  }

  private renderRhythm(): void {
    const ctx = this.ctx2d;
    const { width, height } = this.view;
    const lineX = width * HIT_LINE;
    const palette = keycapPalette('orange');

    ctx.fillStyle = token('--line');
    ctx.fillRect(lineX - 2, height * 0.2, 4, height * 0.4);

    const size = 28 * this.ctx.settings.fontScale;
    ctx.font = `800 ${size}px ${token('--font-mono') || 'monospace'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const note of this.notes) {
      const dt = note.timeMs - this.elapsedMs;
      if (dt < -400 || dt > SCROLL_MS) continue;
      const x = lineX + (dt / SCROLL_MS) * (width - lineX);
      const y = height * 0.38;
      ctx.globalAlpha = note.hit === null ? 1 : 0.25;
      drawKeycap(ctx, x - size * 0.7, y - size * 0.7, size * 1.4, size * 1.4, palette, 4);
      ctx.fillStyle = token('--on-key');
      ctx.fillText(note.char.toUpperCase(), x, y);
    }
    ctx.globalAlpha = 1;

    if (this.judgementMs > 0 && this.judgement) {
      ctx.fillStyle = this.judgement === 'miss' ? token('--error') : token('--ink');
      ctx.font = `700 24px ${token('--font-display') || 'sans-serif'}`;
      ctx.fillText(t(`beats.${this.judgement}`), width / 2, height * 0.72);
    }

    if (this.chart) {
      ctx.fillStyle = token('--ink-muted');
      ctx.font = `500 14px ${token('--font-mono') || 'monospace'}`;
      ctx.fillText(this.chart.title, width / 2, height * 0.9);
    }
    ctx.textAlign = 'start';
  }
}

export function create(): GameMode {
  return new TypeBeats();
}

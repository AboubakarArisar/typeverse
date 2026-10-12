import { settings } from './settings';

export type Sfx = 'key' | 'error' | 'word' | 'combo' | 'levelUp' | 'menu' | 'select' | 'hit';

interface PackVoice {
  wave: OscillatorType;
  /** Base frequency in Hz. */
  freq: number;
  decay: number;
  /** Extra noise burst for mechanical packs. */
  noise: number;
}

interface SoundPack {
  id: string;
  name: string;
  voices: Record<Sfx, PackVoice>;
}

function voice(wave: OscillatorType, freq: number, decay: number, noise = 0): PackVoice {
  return { wave, freq, decay, noise };
}

export const SOUND_PACKS: SoundPack[] = [
  {
    id: 'classic',
    name: 'Classic',
    voices: {
      key: voice('square', 620, 0.05, 0.4),
      error: voice('sawtooth', 110, 0.16),
      word: voice('triangle', 880, 0.12),
      combo: voice('triangle', 990, 0.1),
      levelUp: voice('triangle', 523, 0.18),
      menu: voice('square', 440, 0.04, 0.2),
      select: voice('square', 330, 0.08, 0.5),
      hit: voice('sawtooth', 160, 0.1, 0.3),
    },
  },
  {
    id: 'typewriter',
    name: 'Typewriter',
    voices: {
      key: voice('square', 380, 0.04, 0.9),
      error: voice('square', 90, 0.2, 0.6),
      word: voice('square', 520, 0.1, 0.7),
      combo: voice('square', 700, 0.08, 0.4),
      levelUp: voice('triangle', 523, 0.2),
      menu: voice('square', 300, 0.03, 0.6),
      select: voice('square', 220, 0.09, 1),
      hit: voice('square', 140, 0.12, 0.8),
    },
  },
  {
    id: 'bubble',
    name: 'Bubble',
    voices: {
      key: voice('sine', 700, 0.08),
      error: voice('sine', 150, 0.18),
      word: voice('sine', 1100, 0.14),
      combo: voice('sine', 1300, 0.12),
      levelUp: voice('sine', 659, 0.2),
      menu: voice('sine', 500, 0.05),
      select: voice('sine', 400, 0.1),
      hit: voice('sine', 200, 0.1),
    },
  },
  {
    id: 'synth',
    name: 'Synth',
    voices: {
      key: voice('sawtooth', 540, 0.06),
      error: voice('sawtooth', 100, 0.2),
      word: voice('sawtooth', 820, 0.14),
      combo: voice('square', 1000, 0.1),
      levelUp: voice('sawtooth', 587, 0.22),
      menu: voice('sawtooth', 420, 0.05),
      select: voice('sawtooth', 280, 0.1),
      hit: voice('sawtooth', 180, 0.12),
    },
  },
];

/** The T-Y-P-E arpeggio played on level up. */
const LEVEL_UP_NOTES = [523.25, 659.25, 783.99, 1046.5];

/**
 * Zen chord loop, in semitones above C3: Cmaj7, Am7, Fmaj7, G6.
 * Every voicing stays in C major, so any pentatonic melody note fits over it.
 */
const ZEN_CHORDS = [
  [0, 7, 11, 16],
  [-3, 4, 7, 12],
  [-7, 0, 4, 9],
  [-5, 2, 4, 11],
];
const ZEN_CHORD_SEC = 8;
const ZEN_RELEASE_SEC = 4;
/** C major pentatonic from C4 upward, in semitones above C4. */
export const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const C3 = 130.81;
const C4 = 261.63;
const PAD_VOICES: readonly (readonly [OscillatorType, number])[] = [
  ['sine', -5],
  ['triangle', 5],
];
/** [frequency multiple, level] */
const BELL_PARTIALS: readonly (readonly [number, number])[] = [
  [1, 1],
  [2, 0.15],
];

const SEMITONE = 2 ** (1 / 12);
const A4 = 440;
const NOTE_INDEX: Record<string, number> = {
  C: -9,
  D: -7,
  E: -5,
  F: -4,
  G: -2,
  A: 0,
  B: 2,
};

/** 'C4' | 'A#3' -> Hz */
export function noteToFreq(note: string): number {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(note);
  if (!match) return A4;
  const [, letter = 'A', accidental, octave = '4'] = match;
  let semitones = (NOTE_INDEX[letter] ?? 0) + (Number(octave) - 4) * 12;
  if (accidental === '#') semitones += 1;
  if (accidental === 'b') semitones -= 1;
  return A4 * SEMITONE ** semitones;
}

/**
 * Adapter over Web Audio. Everything is synthesized, so there are no audio
 * downloads and nothing plays before the first user gesture.
 */
export class AudioService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicNodes = new Set<OscillatorNode>();
  private echo: AudioNode | null = null;
  private ambientTimer = 0;
  private nextChordAt = 0;
  private chordIndex = 0;
  private noiseBuffer: AudioBuffer | null = null;

  get pack(): SoundPack {
    return (
      SOUND_PACKS.find((p) => p.id === settings.value.soundPack) ?? (SOUND_PACKS[0] as SoundPack)
    );
  }

  /** Must be called from a user gesture; safe to call repeatedly. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const master = ctx.createGain();
    const sfx = ctx.createGain();
    const music = ctx.createGain();
    sfx.connect(master);
    music.connect(master);
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.sfxGain = sfx;
    this.musicGain = music;
    this.echo = createEcho(ctx, master);
    this.applyVolumes();
  }

  applyVolumes(): void {
    const s = settings.value;
    if (this.master) this.master.gain.value = s.masterVolume;
    if (this.sfxGain) this.sfxGain.gain.value = s.sfxVolume;
    if (this.musicGain) this.musicGain.gain.value = s.musicVolume * 0.4;
  }

  play(sfx: Sfx, detune = 0): void {
    if (sfx === 'levelUp') {
      LEVEL_UP_NOTES.forEach((f, i) => this.blip(f, 0.14, 'triangle', 0, i * 0.09));
      return;
    }
    const v = this.pack.voices[sfx];
    this.blip(v.freq * SEMITONE ** detune, v.decay, v.wave, v.noise);
  }

  /** A pitched tone, used by Type Beats and Zen. */
  note(note: string | number, duration = 0.3, wave: OscillatorType = 'triangle'): void {
    const freq = typeof note === 'number' ? note : noteToFreq(note);
    this.blip(freq, duration, wave, 0, 0, 0.18);
  }

  /** Slow ambient pad built from detuned sines. No files, no licensing. */
  music(root = 'C3'): void {
    this.stopMusic();
    const ctx = this.ctx;
    const bus = this.musicGain;
    if (!ctx || !bus) return;
    const base = noteToFreq(root);
    for (const ratio of [1, 1.5, 2, 2.9966]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = base * ratio;
      osc.detune.value = (ratio * 7) % 11;
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 3);
      osc.connect(gain).connect(bus);
      osc.start();
      this.track(osc);
    }
  }

  /**
   * Zen ambience: a slow Cmaj7-Am7-Fmaj7-G6 loop of soft filtered pads with a
   * sparse, quiet bell melody. Scheduled just ahead of the audio clock, so it
   * freezes with the context on pause.
   */
  ambient(): void {
    this.stopMusic();
    const ctx = this.ctx;
    if (!ctx) return;
    this.chordIndex = 0;
    this.nextChordAt = ctx.currentTime + 0.1;
    const schedule = (): void => {
      const now = this.ctx?.currentTime ?? Infinity;
      while (this.nextChordAt < now + 1) {
        const chord = ZEN_CHORDS[this.chordIndex % ZEN_CHORDS.length] as number[];
        this.padChord(chord, this.nextChordAt);
        this.melody(this.nextChordAt);
        this.chordIndex++;
        this.nextChordAt += ZEN_CHORD_SEC;
      }
    };
    schedule();
    this.ambientTimer = window.setInterval(schedule, 500);
  }

  /** Soft bell for Zen keystrokes: `step` indexes C major pentatonic from C4. */
  chime(step: number): void {
    const n = PENTATONIC.length;
    const semis = PENTATONIC[((step % n) + n) % n] as number;
    if (this.ctx && this.sfxGain) {
      this.bell(C4 * SEMITONE ** semis, this.ctx.currentTime, 0.14, this.sfxGain);
    }
  }

  stopMusic(): void {
    window.clearInterval(this.ambientTimer);
    this.ambientTimer = 0;
    for (const osc of this.musicNodes) {
      try {
        osc.stop();
      } catch {
        // already stopped
      }
    }
    this.musicNodes.clear();
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    void this.ctx?.resume();
  }

  dispose(): void {
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }

  private track(osc: OscillatorNode): void {
    this.musicNodes.add(osc);
    osc.onended = () => this.musicNodes.delete(osc);
  }

  /** One chord: each note is two slightly detuned voices through a dark low-pass. */
  private padChord(semis: number[], at: number): void {
    const ctx = this.ctx;
    const bus = this.musicGain;
    if (!ctx || !bus) return;
    const end = at + ZEN_CHORD_SEC + ZEN_RELEASE_SEC;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.3;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(0.07, at + 3);
    env.gain.setValueAtTime(0.07, at + ZEN_CHORD_SEC);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    filter.connect(env).connect(bus);
    for (const semi of semis) {
      for (const [wave, cents] of PAD_VOICES) {
        const osc = ctx.createOscillator();
        osc.type = wave;
        osc.frequency.value = C3 * SEMITONE ** semi;
        osc.detune.value = cents;
        osc.connect(filter);
        osc.start(at);
        osc.stop(end);
        this.track(osc);
      }
    }
  }

  /** A few sparse, quiet bell notes over each chord, wandering by small steps. */
  private melody(at: number): void {
    const bus = this.musicGain;
    if (!bus) return;
    let step = 4 + Math.floor(Math.random() * 3);
    for (let beat = 0; beat < ZEN_CHORD_SEC; beat += 2) {
      if (Math.random() < 0.45) continue;
      step = Math.max(0, Math.min(PENTATONIC.length - 1, step + Math.floor(Math.random() * 5) - 2));
      const freq = C4 * SEMITONE ** (PENTATONIC[step] as number);
      this.bell(freq, at + beat + Math.random() * 0.3, 0.05, bus);
    }
  }

  /** Bell tone: sine plus a faint octave, quick soft attack, long fade, sent to the echo. */
  private bell(freq: number, at: number, peak: number, bus: AudioNode): void {
    const ctx = this.ctx;
    if (!ctx || settings.value.masterVolume === 0) return;
    const decay = 2.2;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(peak, at + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    env.connect(bus);
    if (this.echo) env.connect(this.echo);
    for (const [mult, level] of BELL_PARTIALS) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * mult;
      gain.gain.value = level;
      osc.connect(gain).connect(env);
      osc.start(at);
      osc.stop(at + decay + 0.05);
    }
  }

  private blip(
    freq: number,
    decay: number,
    wave: OscillatorType,
    noise = 0,
    delay = 0,
    peak = 0.25,
  ): void {
    const ctx = this.ctx;
    const bus = this.sfxGain;
    if (!ctx || !bus || settings.value.masterVolume === 0) return;
    const at = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.6), at + decay);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(gain).connect(bus);
    osc.start(at);
    osc.stop(at + decay + 0.02);

    if (noise > 0) this.click(at, noise * 0.2, decay * 0.4);
  }

  private click(at: number, level: number, decay: number): void {
    const ctx = this.ctx;
    const bus = this.sfxGain;
    if (!ctx || !bus) return;
    if (!this.noiseBuffer) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    src.buffer = this.noiseBuffer;
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    src.connect(filter).connect(gain).connect(bus);
    src.start(at);
    src.stop(at + decay + 0.02);
  }
}

/** Soft feedback delay used as a cheap reverb tail. Returns its input node. */
function createEcho(ctx: AudioContext, out: AudioNode): AudioNode {
  const input = ctx.createGain();
  input.gain.value = 0.35;
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.42;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.4;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2200;
  input.connect(delay).connect(tone).connect(feedback).connect(delay);
  tone.connect(out);
  return input;
}

export const audio = new AudioService();

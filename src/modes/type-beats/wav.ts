export interface RecordedNote {
  /** Seconds from the start of the session. */
  time: number;
  freq: number;
  duration: number;
}

const SAMPLE_RATE = 44100;
const TAIL_SECONDS = 1;

/** Render recorded notes offline and encode them as a 16-bit mono WAV blob. */
export async function renderWav(notes: RecordedNote[]): Promise<Blob> {
  const last = notes.reduce((max, n) => Math.max(max, n.time + n.duration), 0);
  const length = Math.max(1, Math.ceil((last + TAIL_SECONDS) * SAMPLE_RATE));
  const ctx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = note.freq;
    gain.gain.setValueAtTime(0.0001, note.time);
    gain.gain.exponentialRampToValueAtTime(0.2, note.time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, note.time + note.duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(note.time);
    osc.stop(note.time + note.duration + 0.05);
  }

  const buffer = await ctx.startRendering();
  return encodeWav(buffer.getChannelData(0), SAMPLE_RATE);
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const writeText = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

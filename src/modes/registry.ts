import type { ModeId, ModeMeta } from '@/types';
import type { ModeEntry } from './types';

function meta(
  id: ModeId,
  color: ModeMeta['color'],
  letter: string,
  unlockLevel: number,
  surface: ModeMeta['surface'],
): ModeMeta {
  return {
    id,
    color,
    letter,
    unlockLevel,
    surface,
    nameKey: `mode.${id}.name`,
    descKey: `mode.${id}.desc`,
  };
}

/**
 * Mode order follows DESIGN_SYSTEM.md section 8 so neighbouring tiles differ in color.
 * Game code is only downloaded when a mode is chosen.
 */
export const modeRegistry: Record<ModeId, ModeEntry> = {
  'word-rain': {
    meta: meta('word-rain', 'blue', 'W', 1, 'canvas'),
    load: () => import('./word-rain').then((m) => m.create),
  },
  'type-beats': {
    meta: meta('type-beats', 'orange', 'B', 2, 'canvas'),
    load: () => import('./type-beats').then((m) => m.create),
  },
  'code-typer': {
    meta: meta('code-typer', 'mint', 'C', 3, 'overlay'),
    load: () => import('./code-typer').then((m) => m.create),
  },
  'zombie-survival': {
    meta: meta('zombie-survival', 'lime', 'Z', 4, 'canvas'),
    load: () => import('./zombie-survival').then((m) => m.create),
  },
  'typing-racer': {
    meta: meta('typing-racer', 'blue', 'R', 5, 'canvas'),
    load: () => import('./typing-racer').then((m) => m.create),
  },
  'word-tower': {
    meta: meta('word-tower', 'orange', 'T', 6, 'canvas'),
    load: () => import('./word-tower').then((m) => m.create),
  },
  story: {
    meta: meta('story', 'mint', 'S', 7, 'overlay'),
    load: () => import('./story').then((m) => m.create),
  },
  zen: {
    meta: meta('zen', 'lime', 'Z', 1, 'canvas'),
    load: () => import('./zen').then((m) => m.create),
  },
};

export const MODE_ORDER: ModeId[] = [
  'word-rain',
  'type-beats',
  'code-typer',
  'zombie-survival',
  'typing-racer',
  'word-tower',
  'story',
  'zen',
];

export const modeList = MODE_ORDER.map((id) => modeRegistry[id]);

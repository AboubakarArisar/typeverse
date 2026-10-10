import { get, set } from 'idb-keyval';
import type { SaveFile, Settings } from '@/types';
import { saveFileSchema } from '@/types/schemas';

const KEY = 'typeverse:save';
export const SAVE_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  soundPack: 'classic',
  theme: 'system',
  reducedMotion: false,
  fontScale: 1,
  language: 'en',
  kidMode: false,
  difficulty: 'normal',
};

export function emptySave(): SaveFile {
  return {
    version: SAVE_VERSION,
    profile: { createdAt: new Date().toISOString(), xp: 0, level: 1 },
    settings: { ...DEFAULT_SETTINGS },
    unlocks: [],
    bests: {},
    sessions: [],
    keyStats: {},
    story: {},
  };
}

/** version N -> N+1. Add an entry whenever SaveFile changes shape. */
const migrations: Record<number, (save: SaveFile) => SaveFile> = {};

function migrate(save: SaveFile): SaveFile {
  let current = save;
  while (current.version < SAVE_VERSION) {
    const step = migrations[current.version];
    if (!step) return { ...current, version: SAVE_VERSION };
    current = step(current);
  }
  return current;
}

/** The only module that touches IndexedDB (Repository pattern). */
export class StorageService {
  private cache: SaveFile | null = null;
  private writing: Promise<void> = Promise.resolve();

  async load(): Promise<SaveFile> {
    if (this.cache) return this.cache;
    let raw: unknown;
    try {
      raw = await get(KEY);
    } catch {
      raw = undefined; // private mode / blocked IndexedDB: play without saving
    }
    this.cache = this.parse(raw) ?? emptySave();
    return this.cache;
  }

  /** Merge a patch into the save and persist. Writes are serialized. */
  async save(patch: Partial<SaveFile>): Promise<SaveFile> {
    const current = await this.load();
    const next: SaveFile = { ...current, ...patch, version: SAVE_VERSION };
    this.cache = next;
    this.writing = this.writing.then(() => set(KEY, next)).catch(() => undefined);
    await this.writing;
    return next;
  }

  async exportJson(): Promise<string> {
    return JSON.stringify(await this.load(), null, 2);
  }

  /** Validate before trusting anything from a file (NFR-13). */
  async importJson(text: string): Promise<SaveFile> {
    const parsed = this.parse(JSON.parse(text) as unknown);
    if (!parsed) throw new Error('This file is not a valid Typeverse save.');
    this.cache = parsed;
    await set(KEY, parsed);
    return parsed;
  }

  async reset(): Promise<SaveFile> {
    const fresh = emptySave();
    this.cache = fresh;
    await set(KEY, fresh);
    return fresh;
  }

  private parse(raw: unknown): SaveFile | null {
    if (!raw || typeof raw !== 'object') return null;
    const result = saveFileSchema.safeParse(raw);
    if (!result.success) return null;
    return migrate(result.data as SaveFile);
  }
}

export const storage = new StorageService();

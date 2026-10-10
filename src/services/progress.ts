import { signal } from '@preact/signals';
import type { ModeId, SaveFile, SessionResult } from '@/types';
import { levelForXp, levelProgress, xpFor } from '@/modes/shared/scoring';
import { storage } from './storage';

export const UNLOCKS: { id: string; level: number; kind: 'theme' | 'sound' }[] = [
  { id: 'sound:typewriter', level: 3 },
  { id: 'theme:midnight', level: 5 },
  { id: 'sound:bubble', level: 8 },
  { id: 'sound:synth', level: 12 },
].map((u) => ({ ...u, kind: u.id.startsWith('theme') ? 'theme' : 'sound' }) as const);

const MAX_SESSIONS = 100;

export const save = signal<SaveFile | null>(null);
/** Set when the last recorded session caused a level up; cleared by the result screen. */
export const lastLevelUp = signal<number | null>(null);
export const lastXpEarned = signal(0);

/** Owns XP, levels, unlocks, bests and history. The only writer of progress. */
export class ProgressService {
  async init(): Promise<SaveFile> {
    const loaded = await storage.load();
    save.value = loaded;
    return loaded;
  }

  async record(
    result: SessionResult,
    keyStats: Record<string, { hits: number; misses: number }> = {},
  ): Promise<SaveFile> {
    const current = save.value ?? (await storage.load());
    const gained = xpFor(result.score, result.durationMs);
    const xp = current.profile.xp + gained;
    const level = levelForXp(xp);

    const bests = { ...current.bests };
    const best = bests[result.mode];
    if (!best || result.score > best.score) {
      bests[result.mode] = { score: result.score, wpm: result.wpm, date: result.date };
    }

    const mergedKeys = { ...current.keyStats };
    for (const [key, stat] of Object.entries(keyStats)) {
      const prev = mergedKeys[key] ?? { hits: 0, misses: 0 };
      mergedKeys[key] = { hits: prev.hits + stat.hits, misses: prev.misses + stat.misses };
    }

    const unlocks = new Set(current.unlocks);
    for (const u of UNLOCKS) if (level >= u.level) unlocks.add(u.id);

    lastXpEarned.value = gained;
    lastLevelUp.value = level > current.profile.level ? level : null;

    const next = await storage.save({
      profile: { ...current.profile, xp, level },
      bests,
      keyStats: mergedKeys,
      unlocks: [...unlocks],
      sessions: [result, ...current.sessions].slice(0, MAX_SESSIONS),
    });
    save.value = next;
    return next;
  }

  bestFor(mode: ModeId): { score: number; wpm: number } | null {
    return save.value?.bests[mode] ?? null;
  }

  isUnlocked(mode: { unlockLevel: number }): boolean {
    return (save.value?.profile.level ?? 1) >= mode.unlockLevel;
  }

  progress(): { level: number; into: number; need: number } {
    return levelProgress(save.value?.profile.xp ?? 0);
  }

  /** Keys sorted by error rate, worst first (needs at least a few samples). */
  weakestKeys(limit = 5): { key: string; rate: number; misses: number }[] {
    const stats = save.value?.keyStats ?? {};
    return Object.entries(stats)
      .filter(([, s]) => s.hits + s.misses >= 5)
      .map(([key, s]) => ({ key, rate: s.misses / (s.hits + s.misses), misses: s.misses }))
      .filter((k) => k.misses > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, limit);
  }
}

export const progress = new ProgressService();

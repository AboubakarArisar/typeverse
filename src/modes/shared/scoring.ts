/** Shared scoring rules from docs/GAME_MODES.md. */

/** Accuracy bonus applied once at session end, only above 90%. */
export function accuracyBonus(score: number, accuracy: number): number {
  if (accuracy <= 0.9) return 0;
  return Math.round(score * (accuracy - 0.9) * 2);
}

export function finalScore(score: number, accuracy: number): number {
  return score + accuracyBonus(score, accuracy);
}

/** XP = round(score / 50) + minutes * 10, halved for practice sessions. */
export function xpFor(score: number, durationMs: number, practice = false): number {
  const xp = Math.round(score / 50) + Math.round((durationMs / 60_000) * 10);
  return practice ? Math.floor(xp / 2) : xp;
}

/** Level thresholds grow quadratically: level n needs 100 * n * (n - 1) / 2 XP. */
export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function xpForLevel(level: number): number {
  return (100 * level * (level - 1)) / 2;
}

export function levelProgress(xp: number): { level: number; into: number; need: number } {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  return { level, into: xp - base, need: xpForLevel(level + 1) - base };
}

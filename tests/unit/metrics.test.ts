import { describe, expect, it } from 'vitest';
import { MetricsCalculator } from '../../src/engine/MetricsCalculator';
import { Rng } from '../../src/engine/Rng';
import { ObjectPool } from '../../src/modes/shared/ObjectPool';
import {
  accuracyBonus,
  finalScore,
  levelForXp,
  levelProgress,
  xpFor,
  xpForLevel,
} from '../../src/modes/shared/scoring';
import { DIFFICULTIES, difficultyForWpm } from '../../src/modes/shared/difficulty';

describe('MetricsCalculator (FR-ENG-04)', () => {
  it('computes WPM from correct characters at five chars per word', () => {
    const m = new MetricsCalculator();
    // 60 correct characters over exactly one minute = 12 WPM.
    for (let i = 0; i < 60; i++) m.record('a', true, i * 1000);
    const snapshot = m.snapshot(60_000);

    expect(snapshot.wpm).toBeCloseTo(12.2, 0);
    expect(snapshot.correctChars).toBe(60);
    expect(snapshot.accuracy).toBe(1);
  });

  it('separates raw WPM from net WPM when there are errors', () => {
    const m = new MetricsCalculator();
    for (let i = 0; i < 10; i++) m.record('a', i % 2 === 0, i * 100);
    const snapshot = m.snapshot(60_000);

    expect(snapshot.typedChars).toBe(10);
    expect(snapshot.errors).toBe(5);
    expect(snapshot.accuracy).toBe(0.5);
    expect(snapshot.rawWpm).toBeGreaterThan(snapshot.wpm);
  });

  it('tracks per-key hits and misses', () => {
    const m = new MetricsCalculator();
    m.record('A', true, 0);
    m.record('a', false, 10);
    m.record('b', true, 20);

    expect(m.keyStats()).toEqual({ a: { hits: 1, misses: 1 }, b: { hits: 1, misses: 0 } });
  });

  it('undoCorrect reverses one character for backspace', () => {
    const m = new MetricsCalculator();
    m.record('a', true, 0);
    m.undoCorrect();
    expect(m.snapshot(1000).correctChars).toBe(0);
  });

  it('reports perfect accuracy and consistency before any input', () => {
    const m = new MetricsCalculator();
    const snapshot = m.snapshot(0);
    expect(snapshot.accuracy).toBe(1);
    expect(snapshot.consistency).toBe(1);
    expect(snapshot.wpm).toBe(0);
  });

  it('scores even typing as more consistent than erratic typing', () => {
    const even = new MetricsCalculator();
    [0, 100, 200, 300, 400].forEach((t) => even.record('a', true, t));
    const erratic = new MetricsCalculator();
    [0, 20, 600, 630, 2000].forEach((t) => erratic.record('a', true, t));

    expect(even.snapshot(500).consistency).toBeGreaterThan(erratic.snapshot(2100).consistency);
  });

  it('reset clears everything', () => {
    const m = new MetricsCalculator();
    m.record('a', true, 0);
    m.reset();
    expect(m.snapshot(1000).typedChars).toBe(0);
    expect(m.keyStats()).toEqual({});
  });
});

describe('scoring rules', () => {
  it('gives no accuracy bonus at or below 90%', () => {
    expect(accuracyBonus(1000, 0.9)).toBe(0);
    expect(accuracyBonus(1000, 0.5)).toBe(0);
  });

  it('gives score * (accuracy - 0.9) * 2 above 90%', () => {
    expect(accuracyBonus(1000, 1)).toBe(200);
    expect(finalScore(1000, 1)).toBe(1200);
  });

  it('computes XP from score and minutes played, halved in practice', () => {
    expect(xpFor(500, 60_000)).toBe(20);
    expect(xpFor(500, 60_000, true)).toBe(10);
  });

  it('levels up on quadratic thresholds', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(300)).toBe(3);
  });

  it('reports progress inside the current level', () => {
    expect(levelProgress(150)).toEqual({ level: 2, into: 50, need: 200 });
  });
});

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
  });

  it('stays inside its ranges', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 200; i++) {
      const n = rng.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
      expect(rng.float(0, 1)).toBeLessThan(1);
    }
  });

  it('picks from an array and throws on an empty one', () => {
    const rng = new Rng(1);
    expect(['a', 'b']).toContain(rng.pick(['a', 'b']));
    expect(() => rng.pick([])).toThrow();
  });

  it('chance(0) is never true and chance(1) is always true', () => {
    const rng = new Rng(3);
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
  });
});

describe('ObjectPool', () => {
  it('reuses released objects instead of allocating', () => {
    let made = 0;
    const pool = new ObjectPool(
      () => ({ id: ++made, used: true }),
      (o) => {
        o.used = false;
      },
    );

    const first = pool.get();
    pool.release(first);
    const second = pool.get();

    expect(second).toBe(first);
    expect(made).toBe(1);
    expect(second.used).toBe(false);
  });

  it('prefills', () => {
    const pool = new ObjectPool(
      () => ({}),
      () => undefined,
      4,
    );
    expect(pool.size).toBe(4);
  });
});

describe('difficulty presets', () => {
  it('orders speed from kid to insane', () => {
    expect(DIFFICULTIES.kid.speed).toBeLessThan(DIFFICULTIES.normal.speed);
    expect(DIFFICULTIES.normal.speed).toBeLessThan(DIFFICULTIES.insane.speed);
  });

  it('disables backspace only on insane and charges on hard', () => {
    expect(DIFFICULTIES.insane.backspace.allowed).toBe(false);
    expect(DIFFICULTIES.hard.backspace.cost).toBe(5);
    expect(DIFFICULTIES.normal.backspace).toEqual({ allowed: true, cost: 0 });
  });

  it('maps a measured WPM to a starting difficulty', () => {
    expect(difficultyForWpm(10)).toBe('easy');
    expect(difficultyForWpm(30)).toBe('normal');
    expect(difficultyForWpm(50)).toBe('hard');
    expect(difficultyForWpm(90)).toBe('insane');
  });
});

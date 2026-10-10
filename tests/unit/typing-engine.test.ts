import { describe, expect, it, vi } from 'vitest';
import { TypingEngine, comboMultiplier } from '../../src/engine/TypingEngine';
import { EventBus } from '../../src/engine/EventBus';
import type { KeyInput } from '../../src/types';

function key(char: string, t = 0, kind: KeyInput['kind'] = 'char'): KeyInput {
  return { char, code: '', t, kind };
}

function typeAll(engine: TypingEngine, text: string, startT = 0): void {
  [...text].forEach((char, i) => engine.type(char, startT + i * 100));
}

describe('TypingEngine targets and locking (FR-ENG-02, FR-ENG-03)', () => {
  it('locks the highest-priority target whose first letter matches', () => {
    const engine = new TypingEngine();
    engine.addTarget('cat', 10); // nearer the ground
    engine.addTarget('car', 5);

    engine.type('c');

    expect(engine.locked?.text).toBe('cat');
  });

  it('counts a wrong letter as an error and keeps the lock', () => {
    const engine = new TypingEngine();
    engine.addTarget('cat', 10);
    engine.addTarget('car', 5);

    engine.type('c');
    const outcome = engine.type('r');

    expect(outcome).toEqual({ kind: 'wrong', expected: 'a' });
    expect(engine.locked?.text).toBe('cat');
    expect(engine.locked?.typed).toBe(1);
  });

  it('releases the lock and clears partial progress on Escape', () => {
    const engine = new TypingEngine();
    const target = engine.addTarget('cat');
    engine.type('c');
    expect(target.typed).toBe(1);

    engine.handle(key('', 0, 'escape'));

    expect(engine.locked).toBeNull();
    expect(target.typed).toBe(0);
  });

  it('reports a wrong keystroke when nothing matches', () => {
    const engine = new TypingEngine();
    engine.addTarget('cat');

    expect(engine.type('z')).toEqual({ kind: 'wrong', expected: null });
    expect(engine.locked).toBeNull();
  });

  it('completes a target and removes it', () => {
    const engine = new TypingEngine();
    engine.addTarget('go');

    engine.type('g');
    const outcome = engine.type('o');

    expect(outcome.kind).toBe('complete');
    expect(engine.activeTargets).toHaveLength(0);
  });

  it('ignores case by default and respects ignoreCase: false', () => {
    const insensitive = new TypingEngine();
    insensitive.addTarget('Go');
    expect(insensitive.type('g').kind).toBe('locked');

    const sensitive = new TypingEngine(new EventBus(), { ignoreCase: false });
    sensitive.addTarget('Go');
    expect(sensitive.type('g').kind).toBe('wrong');
  });

  it('can ignore diacritics when a language pack asks for it (FR-ENG-08)', () => {
    const engine = new TypingEngine(new EventBus(), { ignoreDiacritics: true });
    engine.addTarget('café');
    typeAll(engine, 'cafe');
    expect(engine.activeTargets).toHaveLength(0);
  });
});

describe('TypingEngine combo and score (FR-ENG-05)', () => {
  it('maps combo counts to multipliers', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(9)).toBe(1);
    expect(comboMultiplier(10)).toBe(2);
    expect(comboMultiplier(25)).toBe(3);
    expect(comboMultiplier(60)).toBe(4);
  });

  it('awards 10 points per character times the multiplier', () => {
    const engine = new TypingEngine();
    engine.addTarget('go');
    typeAll(engine, 'go');
    expect(engine.score).toBe(20);
  });

  it('resets the combo on any error but keeps the max', () => {
    const engine = new TypingEngine();
    engine.addTarget('go');
    typeAll(engine, 'go');
    expect(engine.combo).toBe(1);

    engine.addTarget('go');
    engine.type('x');

    expect(engine.combo).toBe(0);
    expect(engine.maxCombo).toBe(1);
  });
});

describe('TypingEngine backspace policy (FR-ENG-07)', () => {
  it('steps back one character when allowed', () => {
    const engine = new TypingEngine();
    const target = engine.addTarget('cat');
    engine.type('c');
    engine.type('a');

    engine.handle(key('', 0, 'backspace'));

    expect(target.typed).toBe(1);
  });

  it('does nothing when backspace is disallowed', () => {
    const engine = new TypingEngine(new EventBus(), {
      backspace: { allowed: false, cost: 0 },
    });
    const target = engine.addTarget('cat');
    engine.type('c');

    expect(engine.handle(key('', 0, 'backspace'))).toEqual({ kind: 'ignored' });
    expect(target.typed).toBe(1);
  });

  it('charges points when backspace has a cost', () => {
    const engine = new TypingEngine(new EventBus(), { backspace: { allowed: true, cost: 5 } });
    engine.addTarget('go');
    typeAll(engine, 'go'); // 20 points
    engine.handle(key('', 0, 'backspace'));

    expect(engine.score).toBe(15);
  });

  it('never drives the score below zero', () => {
    const engine = new TypingEngine(new EventBus(), { backspace: { allowed: true, cost: 5 } });
    engine.handle(key('', 0, 'backspace'));
    expect(engine.score).toBe(0);
  });
});

describe('TypingEngine events (FR-ENG-06)', () => {
  it('emits charCorrect, targetLocked, wordComplete and comboBreak', () => {
    const bus = new EventBus();
    const engine = new TypingEngine(bus);
    const locked = vi.fn();
    const correct = vi.fn();
    const complete = vi.fn();
    const wrong = vi.fn();
    const broke = vi.fn();
    bus.on('targetLocked', locked);
    bus.on('charCorrect', correct);
    bus.on('wordComplete', complete);
    bus.on('charWrong', wrong);
    bus.on('comboBreak', broke);

    engine.addTarget('go');
    typeAll(engine, 'go');
    engine.addTarget('go');
    engine.type('x');

    expect(locked).toHaveBeenCalledTimes(1);
    expect(correct).toHaveBeenCalledTimes(2);
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({ word: 'go', combo: 1, multiplier: 1, points: 20 }),
    );
    expect(wrong).toHaveBeenCalledTimes(1);
    expect(broke).toHaveBeenCalledWith({ combo: 1 });
  });

  it('unsubscribes handlers', () => {
    const bus = new EventBus();
    const fn = vi.fn();
    const off = bus.on('charCorrect', fn);
    off();
    bus.emit('charCorrect', { char: 'a', t: 0 });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('TypingEngine housekeeping', () => {
  it('reset clears targets, score and combo', () => {
    const engine = new TypingEngine();
    engine.addTarget('go');
    typeAll(engine, 'go');
    engine.reset();

    expect(engine.score).toBe(0);
    expect(engine.maxCombo).toBe(0);
    expect(engine.activeTargets).toHaveLength(0);
  });

  it('removing the locked target drops the lock', () => {
    const engine = new TypingEngine();
    const target = engine.addTarget('cat');
    engine.type('c');
    engine.removeTarget(target.id);
    expect(engine.locked).toBeNull();
  });

  it('setPriority changes which target wins the next lock', () => {
    const engine = new TypingEngine();
    const first = engine.addTarget('cat', 1);
    engine.addTarget('car', 2);
    engine.setPriority(first.id, 9);

    engine.type('c');
    expect(engine.locked?.text).toBe('cat');
  });
});

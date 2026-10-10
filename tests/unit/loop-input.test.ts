// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameLoop, STEP_MS } from '../../src/engine/GameLoop';
import { InputManager } from '../../src/engine/InputManager';
import type { KeyInput } from '../../src/types';

describe('GameLoop fixed timestep', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function driveFrames(times: number[]): { updates: number[]; alphas: number[] } {
    const updates: number[] = [];
    const alphas: number[] = [];
    const queue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      queue.push(cb);
      return queue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);

    const loop = new GameLoop();
    // The loop stamps its start time from performance.now(); drive frames relative to it.
    let now = performance.now();
    loop.start({
      update: (dt) => updates.push(dt),
      render: (alpha) => alphas.push(alpha),
    });

    for (const delta of times) {
      now += delta;
      queue.shift()?.(now);
    }
    loop.dispose();
    return { updates, alphas };
  }

  it('runs one 60 Hz update per elapsed step, never a variable one', () => {
    const { updates } = driveFrames([STEP_MS * 3 + 1]);
    expect(updates).toEqual([STEP_MS, STEP_MS, STEP_MS]);
  });

  it('clamps a long stall so the loop cannot spiral', () => {
    const { updates } = driveFrames([5000]);
    // The 250 ms clamp caps a five-second stall at ~15 updates, not 300.
    expect(updates.length).toBeLessThanOrEqual(15);
    expect(updates.length).toBeGreaterThanOrEqual(14);
  });

  it('passes an interpolation alpha below 1 to render', () => {
    const { alphas } = driveFrames([STEP_MS * 1.5 + 0.5]);
    expect(alphas[0]).toBeGreaterThan(0.4);
    expect(alphas[0]).toBeLessThan(1);
  });
});

describe('InputManager commands (FR-ENG-01)', () => {
  function setup(): { inputs: KeyInput[]; field: HTMLElement; manager: InputManager } {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const inputs: KeyInput[] = [];
    const manager = new InputManager();
    manager.attach(parent, (input) => inputs.push(input));
    const field = parent.querySelector<HTMLElement>('.tv-input-field');
    if (!field) throw new Error('no input field');
    return { inputs, field, manager };
  }

  it('turns printable keys into char commands', () => {
    const { inputs, field, manager } = setup();
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));

    expect(inputs.map((i) => [i.char, i.kind])).toEqual([
      ['a', 'char'],
      [' ', 'space'],
    ]);
    manager.detach();
  });

  it('maps Backspace, Enter and Escape to control commands', () => {
    const { inputs, field, manager } = setup();
    for (const key of ['Backspace', 'Enter', 'Escape']) {
      field.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }
    expect(inputs.map((i) => i.kind)).toEqual(['backspace', 'enter', 'escape']);
    manager.detach();
  });

  it('ignores shortcuts and Tab so the page stays navigable', () => {
    const { inputs, field, manager } = setup();
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(inputs).toHaveLength(0);
    manager.detach();
  });

  it('emits composed IME characters once, on compositionend', () => {
    const { inputs, field, manager } = setup();
    field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    field.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'u', bubbles: true, isComposing: true }),
    );
    field.dispatchEvent(new CompositionEvent('compositionend', { data: 'سا', bubbles: true }));

    expect(inputs.map((i) => i.char)).toEqual(['س', 'ا']);
    manager.detach();
  });

  it('removes its field on detach', () => {
    const { manager, field } = setup();
    manager.detach();
    expect(field.isConnected).toBe(false);
  });
});

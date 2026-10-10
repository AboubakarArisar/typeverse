# Design Patterns

Patterns used in the Typeverse codebase, where they live, and why. Use these when adding
features so the code stays consistent.

## Summary

| Pattern | Where | Solves |
|---|---|---|
| Game Loop (fixed timestep) | `engine/GameLoop.ts` | Same game speed on 60 Hz and 144 Hz screens |
| State Machine | `app/SceneManager.ts`, each mode's lifecycle | Clear transitions: intro → playing → paused → result |
| Strategy | `GameMode` interface, difficulty presets, scoring rules | Swap behavior without `if (mode === ...)` everywhere |
| Registry + Factory | `modes/registry.ts` | Add a mode by adding one file, lazy-loaded |
| Observer (Event Bus) | `engine/EventBus.ts` | Audio, stats, UI react to typing without tight coupling |
| Command | `InputManager` → `KeyInput` | Input can be recorded, replayed, tested, and remapped |
| Object Pool | `modes/shared/ObjectPool.ts` | No garbage-collection stutter from spawning words/zombies |
| Repository | `services/StorageService.ts` | One place for persistence, versioning, migration |
| Adapter | `AudioService` over Tone.js / Web Audio | Replace audio library without touching modes |
| Dependency Injection (via context) | `ModeContext` | Modes testable with fake services |
| Memento | Pause, Word Tower floors, Story checkpoints | Save and restore game state |
| Data-driven content | `content/*.json` + Zod schemas | Writers add words, stories, songs without code |

## 1. Game Loop with fixed timestep

Logic runs at a fixed 60 updates per second; rendering runs as fast as the screen allows and
interpolates. Fall speed and timers must never depend on frame rate.

```ts
const STEP = 1000 / 60;
let acc = 0, last = performance.now();

function frame(now: number) {
  acc += Math.min(now - last, 250);   // clamp to avoid spiral of death after tab switch
  last = now;
  while (acc >= STEP) { mode.update(STEP); acc -= STEP; }
  mode.render(acc / STEP);
  rafId = requestAnimationFrame(frame);
}
```

## 2. State Machine

Every scene and every mode moves through explicit states. Invalid transitions throw in dev.

```ts
type ModeState = 'intro' | 'countdown' | 'playing' | 'paused' | 'result';

const transitions: Record<ModeState, ModeState[]> = {
  intro: ['countdown'],
  countdown: ['playing', 'paused'],
  playing: ['paused', 'result'],
  paused: ['playing', 'result', 'intro'],
  result: ['intro'],
};
```

Zombie Survival adds sub-states (`wave`, `upgradePick`, `boss`); Type Beats adds
(`loading`, `syncing`). Keep them in the mode's own machine.

## 3. Strategy

The `GameMode` interface (see ARCHITECTURE.md) is a strategy: the SceneManager runs any
mode the same way. Smaller strategies:

```ts
interface ScoringStrategy { onWord(word: string, combo: number): number; final(r: RawResult): number; }
interface SpawnStrategy  { next(level: number, rng: Rng): SpawnSpec | null; }
interface BackspacePolicy { allowed: boolean; cost: number; }
```

Difficulty presets are just objects bundling strategies and numbers.

## 4. Registry + Factory (with lazy loading)

```ts
// modes/registry.ts
export const modeRegistry: Record<ModeId, ModeEntry> = {
  'word-rain':   { meta: wordRainMeta,   load: () => import('./word-rain').then(m => m.create) },
  'type-beats':  { meta: typeBeatsMeta,  load: () => import('./type-beats').then(m => m.create) },
  // ...
};

// usage
const create = await modeRegistry[id].load();
const mode = create();          // factory returns a fresh GameMode
await mode.init(ctx);
```

Menu tiles read only `meta`, so the Arcade never downloads game code until a mode is chosen.

## 5. Observer — Event Bus

Typed events keep systems decoupled. The typing engine never knows audio exists.

```ts
type Events = {
  charCorrect: { char: string; t: number };
  charWrong:   { expected: string; got: string; t: number };
  wordComplete:{ word: string; combo: number; t: number };
  comboBreak:  { combo: number };
  sessionEnd:  SessionResult;
};

bus.on('charWrong', e => audio.play('error'));
bus.on('charWrong', e => keyStats.miss(e.expected));
bus.on('sessionEnd', r => progress.record(r));
```

Rule: subscribers return quickly; heavy work goes to idle time (`requestIdleCallback`).
Always unsubscribe in `dispose()`.

## 6. Command — input as data

Each keystroke becomes an immutable `KeyInput { char, code, t, kind }`. Benefits:
- **Replays**: a session is a list of commands; ghost races replay them.
- **Tests**: feed scripted commands into `TypingEngine` with no DOM.
- **Remapping and IME**: handled once in `InputManager`, modes never see raw events.

## 7. Object Pool

Falling words, zombies, particles, and notes are reused rather than created each spawn.

```ts
class ObjectPool<T> {
  private free: T[] = [];
  constructor(private make: () => T, private reset: (o: T) => void) {}
  get(): T { return this.free.pop() ?? this.make(); }
  release(o: T) { this.reset(o); this.free.push(o); }
}
```

## 8. Repository — storage

`StorageService` is the only code that touches IndexedDB. It exposes
`load(): Promise<SaveFile>`, `save(patch)`, `export()`, `import(file)`, and runs version
migrations (`migrations[1→2]`, `[2→3]`, …). Imported files are validated with Zod first.

## 9. Adapter — audio

Modes call `audio.play('keyPress')`, `audio.note('C4', 0.1)`, `audio.music('zen-1')`. The
adapter maps those to Web Audio or Tone.js. If Tone.js is later replaced, modes don't change.

## 10. Dependency Injection through `ModeContext`

Modes receive everything they need in `init(ctx)` and never import singletons. In tests:

```ts
const ctx = makeTestContext({ audio: new SilentAudio(), rng: new Rng(42) });
const mode = createWordRain(); await mode.init(ctx);
```

## 11. Memento

Pausing snapshots the mode state; Word Tower saves a memento per floor; Story Mode stores
`{ chapter, node, flags }`. Mementos are plain JSON so they can be saved to storage.

## 12. Data-driven content

Anything a non-programmer might want to add lives in `content/` as JSON and is validated by
a schema in `src/types/schemas.ts`. Examples: language packs, code snippets, story graphs,
Type Beats charts, upgrade definitions for Zombie Survival.

## Anti-patterns to avoid

- `if (mode === 'word-rain')` checks outside the mode folder → use the interface.
- Allocating arrays or objects inside `update()` → use pools and preallocated buffers.
- Reading `Date.now()` in game logic → use the loop's `dt` and the command timestamp.
- Modes writing to storage directly → emit `sessionEnd`, let `ProgressService` save.
- Hardcoded colors or font sizes → use design tokens.
- Hardcoded UI strings → use `t('key')`.

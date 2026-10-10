import type { SessionResult } from '@/types';

export interface EngineEvents {
  charCorrect: { char: string; t: number };
  charWrong: { expected: string | null; got: string; t: number };
  wordComplete: { word: string; combo: number; multiplier: number; points: number; t: number };
  comboBreak: { combo: number };
  comboStep: { combo: number; multiplier: number };
  targetLocked: { id: number; text: string };
  targetReleased: { id: number };
  levelUp: { level: number };
  sessionEnd: SessionResult;
}

type Handler<T> = (payload: T) => void;

/** Typed publish/subscribe. Subscribers must return quickly. */
export class EventBus<E = EngineEvents> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(event: K, fn: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(fn as Handler<never>);
    return () => this.off(event, fn);
  }

  off<K extends keyof E>(event: K, fn: Handler<E[K]>): void {
    this.handlers.get(event)?.delete(fn as Handler<never>);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const fn of set) (fn as Handler<E[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}

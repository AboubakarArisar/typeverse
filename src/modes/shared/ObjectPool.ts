/** Reuse objects instead of allocating inside update()/render(). */
export class ObjectPool<T> {
  private free: T[] = [];

  constructor(
    private readonly make: () => T,
    private readonly reset: (o: T) => void,
    prefill = 0,
  ) {
    for (let i = 0; i < prefill; i++) this.free.push(make());
  }

  get(): T {
    return this.free.pop() ?? this.make();
  }

  release(o: T): void {
    this.reset(o);
    this.free.push(o);
  }

  get size(): number {
    return this.free.length;
  }
}

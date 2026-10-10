import { signal } from '@preact/signals';
import type { JSX } from 'preact';

interface ToastItem {
  id: number;
  text: string;
}

const items = signal<ToastItem[]>([]);
let nextId = 1;

export function toast(text: string, ms = 2400): void {
  const id = nextId++;
  items.value = [...items.value, { id, text }];
  window.setTimeout(() => {
    items.value = items.value.filter((i) => i.id !== id);
  }, ms);
}

/** Keycap-shaped notifications; also the app-wide polite live region. */
export function Toasts(): JSX.Element {
  return (
    <div class="toasts" role="status" aria-live="polite">
      {items.value.map((item) => (
        <div class="toast" key={item.id}>
          {item.text}
        </div>
      ))}
    </div>
  );
}

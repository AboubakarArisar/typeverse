import { signal } from '@preact/signals';
import type { ModeId } from '@/types';
import { MODE_ORDER } from '@/modes/registry';

export type Route =
  | { name: 'home' }
  | { name: 'arcade' }
  | { name: 'play'; mode: ModeId }
  | { name: 'stats' }
  | { name: 'settings' }
  | { name: 'kit' };

export const route = signal<Route>(parse(location.hash));

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  const [head, tail] = path.split('/');
  if (head === 'play' && tail && (MODE_ORDER as string[]).includes(tail)) {
    return { name: 'play', mode: tail as ModeId };
  }
  if (head === 'arcade') return { name: 'arcade' };
  if (head === 'stats') return { name: 'stats' };
  if (head === 'settings') return { name: 'settings' };
  if (head === 'kit') return { name: 'kit' };
  return { name: 'home' };
}

export function navigate(to: Route): void {
  const hash = toHash(to);
  if (location.hash === hash) route.value = to;
  else location.hash = hash;
}

export function toHash(to: Route): string {
  switch (to.name) {
    case 'play':
      return `#/play/${to.mode}`;
    case 'arcade':
      return '#/arcade';
    case 'stats':
      return '#/stats';
    case 'settings':
      return '#/settings';
    case 'kit':
      return '#/kit';
    default:
      return '#/';
  }
}

export function startRouter(): void {
  window.addEventListener('hashchange', () => {
    route.value = parse(location.hash);
  });
}

import { signal } from '@preact/signals';
import { en } from '@/i18n/en';

export type StringTable = Record<string, string>;

const tables: Record<string, () => Promise<StringTable>> = {
  en: async () => en,
};

export const locale = signal('en');
const table = signal<StringTable>(en);
export const dir = signal<'ltr' | 'rtl'>('ltr');

const RTL = new Set(['ur', 'ar', 'fa', 'he']);

/** All UI strings go through t(). Missing keys fall back to English, then the key. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const raw = table.value[key] ?? en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => String(vars[name] ?? m));
}

export async function setLocale(id: string): Promise<void> {
  const loader = tables[id];
  table.value = loader ? await loader() : en;
  locale.value = id;
  dir.value = RTL.has(id) ? 'rtl' : 'ltr';
  document.documentElement.lang = id;
  document.documentElement.dir = dir.value;
}

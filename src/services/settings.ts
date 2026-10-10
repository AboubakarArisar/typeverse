import { computed, signal } from '@preact/signals';
import type { Settings } from '@/types';
import { DEFAULT_SETTINGS, storage } from './storage';
import { save } from './progress';

export const settings = signal<Settings>({ ...DEFAULT_SETTINGS });

export const reducedMotion = computed(
  () =>
    settings.value.reducedMotion ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches),
);

/** Reactive settings; persists changes and applies theme, motion and font scale. */
export class SettingsService {
  load(loaded: Settings): void {
    settings.value = { ...DEFAULT_SETTINGS, ...loaded };
    this.apply();
  }

  async update(patch: Partial<Settings>): Promise<void> {
    settings.value = { ...settings.value, ...patch };
    this.apply();
    const next = await storage.save({ settings: settings.value });
    save.value = next;
  }

  apply(): void {
    const s = settings.value;
    const root = document.documentElement;
    if (s.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', s.theme);
    root.style.setProperty('--font-scale', String(s.fontScale));
    root.classList.toggle('reduced-motion', reducedMotion.value);
    root.dataset.kid = s.kidMode ? 'on' : 'off';
  }
}

export const settingsService = new SettingsService();

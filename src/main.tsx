import { render } from 'preact';
import '@/ui/styles/tokens.css';
import '@/ui/styles/app.css';
import { App } from '@/app/App';
import { startRouter } from '@/app/router';
import { progress } from '@/services/progress';
import { settingsService } from '@/services/settings';
import { setLocale } from '@/services/i18n';
import { audio } from '@/services/audio';
import { storage } from '@/services/storage';

async function boot(): Promise<void> {
  const saved = await progress.init();
  settingsService.load(saved.settings);
  await setLocale(saved.settings.language);

  startRouter();

  const root = document.getElementById('app');
  if (!root) throw new Error('Missing #app root');
  render(<App />, root);

  // Audio can only start after a gesture; unlock on the first one.
  const unlock = (): void => {
    audio.unlock();
    audio.applyVolumes();
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  // Reliability: flush the save when the tab goes away (NFR-11).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void storage.save({});
  });
}

void boot();

import type { JSX } from 'preact';
import { lazy, Suspense } from 'preact/compat';
import { route, navigate } from './router';
import { t } from '@/services/i18n';
import { Arcade } from '@/ui/screens/Arcade';
import { Play } from '@/ui/screens/Play';
import { Onboarding } from '@/ui/screens/Onboarding';
import { Toasts } from '@/ui/components/Toast';
import { Keycap } from '@/ui/components/Keycap';
import { KeycapButton } from '@/ui/components/KeycapButton';

const Stats = lazy(() => import('@/ui/screens/Stats').then((m) => ({ default: m.Stats })));
const SettingsScreen = lazy(() =>
  import('@/ui/screens/Settings').then((m) => ({ default: m.SettingsScreen })),
);
const Kit = lazy(() => import('@/ui/screens/Kit').then((m) => ({ default: m.Kit })));

const LOGO_KEYS: { letter: string; color: 'blue' | 'orange' | 'mint' | 'lime'; tilt: number }[] = [
  { letter: 'T', color: 'blue', tilt: -6 },
  { letter: 'Y', color: 'orange', tilt: 4 },
  { letter: 'P', color: 'mint', tilt: -3 },
  { letter: 'E', color: 'lime', tilt: 6 },
];

export function App(): JSX.Element {
  const current = route.value;

  return (
    <div class="shell">
      <header class="topbar">
        <a
          class="brand"
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            navigate({ name: 'home' });
          }}
        >
          <span class="brand__keys">
            {LOGO_KEYS.map((k) => (
              <Keycap key={k.letter} color={k.color} size={32} tilt={k.tilt} decorative>
                {k.letter}
              </Keycap>
            ))}
          </span>
          <span class="brand__verse">Verse</span>
        </a>
        <nav class="topbar__nav" aria-label={t('nav.arcade')}>
          <KeycapButton variant="secondary" onClick={() => navigate({ name: 'arcade' })}>
            {t('nav.arcade')}
          </KeycapButton>
          <KeycapButton variant="secondary" onClick={() => navigate({ name: 'stats' })}>
            {t('nav.stats')}
          </KeycapButton>
          <KeycapButton variant="secondary" onClick={() => navigate({ name: 'settings' })}>
            {t('nav.settings')}
          </KeycapButton>
        </nav>
      </header>

      <main class="grow">
        <Suspense fallback={<p class="mono muted">{t('play.loading')}</p>}>
          {current.name === 'home' ? <Onboarding /> : null}
          {current.name === 'arcade' ? <Arcade /> : null}
          {current.name === 'play' ? <Play mode={current.mode} key={current.mode} /> : null}
          {current.name === 'stats' ? <Stats /> : null}
          {current.name === 'settings' ? <SettingsScreen /> : null}
          {current.name === 'kit' ? <Kit /> : null}
        </Suspense>
      </main>

      <footer class="footer">
        {t('footer.madeWith')}{' '}
        <Keycap color="orange" size={32} tilt={-8} decorative>
          {'♥'}
        </Keycap>
        <span class="visually-hidden">{t('footer.love')}</span> {t('footer.by')}{' '}
        <a href="https://github.com/AboubakarArisar" target="_blank" rel="noopener noreferrer">
          Abou Bakar
        </a>
      </footer>

      <Toasts />
    </div>
  );
}

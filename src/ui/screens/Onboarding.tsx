import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { Difficulty, LanguagePack } from '@/types';
import { TypingEngine } from '@/engine/TypingEngine';
import { InputManager } from '@/engine/InputManager';
import { content } from '@/services/content';
import { settings, settingsService } from '@/services/settings';
import { storage } from '@/services/storage';
import { save } from '@/services/progress';
import { t } from '@/services/i18n';
import { difficultyForWpm, DIFFICULTIES } from '@/modes/shared/difficulty';
import { Keycap, type KeycapSize } from '@/ui/components/Keycap';
import { KeycapButton } from '@/ui/components/KeycapButton';
import { Bar, SectionLabel } from '@/ui/components/primitives';
import { toast } from '@/ui/components/Toast';

const CHECK_MS = 20_000;

/** First-run typing check: 20 seconds of plain sentences picks a starting difficulty. */
export function Onboarding({ onDone }: { onDone: () => void }): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(new TypingEngine());
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(CHECK_MS);
  const [line, setLine] = useState('');
  const [typed, setTyped] = useState(0);
  const [pack, setPack] = useState<LanguagePack | null>(null);

  useEffect(() => {
    void content.language(settings.value.language).then(setPack);
  }, []);

  const finish = async (difficulty?: Difficulty, wpm = 0): Promise<void> => {
    const current = save.value;
    if (current) {
      const next = await storage.save({
        profile: { ...current.profile, onboarded: true },
      });
      save.value = next;
    }
    if (difficulty) await settingsService.update({ difficulty });
    setRunning(false);
    onDone();
    if (difficulty) {
      toast(
        t('onboarding.done', {
          wpm: Math.round(wpm),
          difficulty: t(DIFFICULTIES[difficulty].labelKey),
        }),
      );
    }
  };

  useEffect(() => {
    if (!running || !pack) return;
    const host = hostRef.current;
    if (!host) return;

    const engine = engineRef.current;
    engine.reset();
    const nextLine = (): void => {
      engine.clearTargets();
      const text = pack.sentences[Math.floor(Math.random() * pack.sentences.length)] ?? '';
      engine.addTarget(text);
      setLine(text);
      setTyped(0);
    };
    nextLine();

    const input = new InputManager();
    input.attach(host, (key) => {
      const outcome = engine.handle(key);
      if (outcome.kind === 'complete') nextLine();
      else setTyped(engine.activeTargets[0]?.typed ?? 0);
    });

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const left = CHECK_MS - (Date.now() - startedAt);
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(timer);
        const wpm = engine.metrics.snapshot(CHECK_MS).wpm;
        void finish(difficultyForWpm(wpm), wpm);
      }
    }, 200);

    return () => {
      window.clearInterval(timer);
      input.detach();
    };
  }, [running, pack]);

  const nextKey = running ? (line[typed] ?? '').toLowerCase() : '';

  return (
    <div ref={hostRef} class="hero">
      <div class="hero__copy">
        <SectionLabel>{t('onboarding.eyebrow')}</SectionLabel>
        <h1 class="hero__title">
          {t('onboarding.headline')}{' '}
          <span class="hero__accent">{t('onboarding.headlineAccent')}</span>.
        </h1>
        <p class="hero__lede">{t('onboarding.subtitle')}</p>
        <div class="row">
          <KeycapButton onClick={() => setRunning(true)} disabled={!pack || running}>
            {t('onboarding.start')} <span aria-hidden="true">&rarr;</span>
          </KeycapButton>
          <KeycapButton variant="secondary" onClick={() => void finish()}>
            {t('onboarding.skip')}
          </KeycapButton>
        </div>
        <p class="muted hero__hint">{t('onboarding.body')}</p>
      </div>

      <div class="hero__art">
        {FLOATING_KEYS.map((k) => (
          <span key={k.letter} class={`hero__float hero__float--${k.letter.toLowerCase()}`}>
            <Keycap color={k.color} size={k.size} tilt={k.tilt} decorative>
              {k.letter}
            </Keycap>
          </span>
        ))}
        <div class="device">
          <div class="device__screen" aria-live="polite">
            <SectionLabel>{t('onboarding.title')}</SectionLabel>
            {running ? (
              <>
                <Bar
                  label={`${Math.ceil(remaining / 1000)}s`}
                  value={1 - remaining / CHECK_MS}
                  color="lime"
                />
                <p class="passage">
                  <span class="passage__done">{line.slice(0, typed)}</span>
                  <span class="passage__current">{line.slice(typed, typed + 1)}</span>
                  {line.slice(typed + 1)}
                </p>
              </>
            ) : (
              <p class="passage device__sample">
                {t('onboarding.sample')}
                <span class="device__caret" aria-hidden="true" />
              </p>
            )}
          </div>
          <div class="device__keys" aria-hidden="true">
            {KEY_ROWS.map((row) => (
              <div key={row} class="device__row">
                {[...row].map((ch) => (
                  <span key={ch} class={`device__key${ch === nextKey ? ' is-next' : ''}`}>
                    {ch}
                  </span>
                ))}
              </div>
            ))}
            <div class="device__row">
              <span class={`device__key device__key--space${nextKey === ' ' ? ' is-next' : ''}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

const FLOATING_KEYS: {
  letter: string;
  color: 'blue' | 'orange' | 'mint' | 'lime';
  size: KeycapSize;
  tilt: number;
}[] = [
  { letter: 'T', color: 'blue', size: 72, tilt: -12 },
  { letter: 'Y', color: 'orange', size: 72, tilt: -8 },
  { letter: 'P', color: 'mint', size: 72, tilt: 10 },
  { letter: 'E', color: 'lime', size: 72, tilt: 12 },
];

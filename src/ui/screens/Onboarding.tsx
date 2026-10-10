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
import { KeycapButton } from '@/ui/components/KeycapButton';
import { Bar, Panel, SectionLabel } from '@/ui/components/primitives';
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

  return (
    <div ref={hostRef}>
      <Panel class="stack">
        <SectionLabel>{t('onboarding.title')}</SectionLabel>
        {running ? (
          <>
            <Bar label={t('onboarding.title')} value={1 - remaining / CHECK_MS} color="lime" />
            <p class="passage">
              <span class="passage__done">{line.slice(0, typed)}</span>
              <span class="passage__current">{line.slice(typed, typed + 1)}</span>
              {line.slice(typed + 1)}
            </p>
          </>
        ) : (
          <>
            <p>{t('onboarding.body')}</p>
            <div class="row">
              <KeycapButton onClick={() => setRunning(true)} disabled={!pack}>
                {t('onboarding.start')}
              </KeycapButton>
              <KeycapButton variant="secondary" onClick={() => void finish()}>
                {t('onboarding.skip')}
              </KeycapButton>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

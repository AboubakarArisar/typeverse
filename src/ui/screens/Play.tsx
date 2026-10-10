import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { KeyInput, ModeId, SessionResult } from '@/types';
import { modeRegistry } from '@/modes/registry';
import type { GameMode } from '@/modes/types';
import { EventBus } from '@/engine/EventBus';
import { GameLoop } from '@/engine/GameLoop';
import { InputManager } from '@/engine/InputManager';
import { TypingEngine } from '@/engine/TypingEngine';
import { Rng } from '@/engine/Rng';
import { audio } from '@/services/audio';
import { content } from '@/services/content';
import { settings } from '@/services/settings';
import { progress } from '@/services/progress';
import { t } from '@/services/i18n';
import { navigate } from '@/app/router';
import { KeycapButton } from '@/ui/components/KeycapButton';
import { Panel, SectionLabel, StatChip, Meter } from '@/ui/components/primitives';
import type { HudState } from '@/modes/shared/BaseMode';
import { Result } from './Result';

interface PlayProps {
  mode: ModeId;
}

interface Runtime {
  mode: GameMode;
  loop: GameLoop;
  input: InputManager;
  engine: TypingEngine;
  bus: EventBus;
}

const EMPTY_HUD: HudState = { score: 0, combo: 0, multiplier: 1, wpm: 0, accuracy: 1, chips: [] };

/** Hosts one mode: canvas + overlay, the loop, input, pause menu and result. */
export function Play({ mode }: PlayProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);

  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const stage = stageRef.current;
    if (!canvas || !overlay || !stage) return;

    const bus = new EventBus();
    const engine = new TypingEngine(bus);
    const input = new InputManager();
    const loop = new GameLoop();
    const rng = new Rng(Math.floor(Math.random() * 2 ** 31) || 1);
    let unsubscribeHud: (() => void) | undefined;

    void (async () => {
      try {
        const create = await modeRegistry[mode].load();
        if (disposed) return;
        const instance = create();
        await instance.init({
          canvas,
          overlay,
          engine,
          bus,
          audio,
          content,
          settings: settings.value,
          rng,
          difficulty: settings.value.kidMode ? 'kid' : settings.value.difficulty,
        });
        if (disposed) {
          instance.dispose();
          return;
        }

        bus.on('sessionEnd', (session) => {
          loop.stop();
          input.detach();
          setResult(session);
          void progress.record(session, engine.metrics.keyStats());
        });
        bus.on('comboStep', () => audio.play('combo'));

        unsubscribeHud = subscribeHud(instance, setHud);

        input.attach(stage, (key: KeyInput) => {
          audio.unlock();
          if (key.kind === 'escape') {
            // Escape backs out of play (FR-UI-03) and clears the engine lock (FR-ENG-03).
            engine.release();
            setPaused(true);
            return;
          }
          instance.onInput(key);
        });

        instance.start();
        loop.start(instance);
        runtimeRef.current = { mode: instance, loop, input, engine, bus };
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      disposed = true;
      unsubscribeHud?.();
      const rt = runtimeRef.current;
      rt?.loop.dispose();
      rt?.input.detach();
      rt?.mode.dispose();
      rt?.bus.clear();
      audio.stopMusic();
      runtimeRef.current = null;
    };
  }, [mode, attempt]);

  // Pause and resume the running mode and its audio.
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt || result) return;
    if (paused) {
      rt.mode.pause();
      rt.loop.stop();
      audio.suspend();
    } else if (ready) {
      rt.mode.resume();
      rt.loop.start(rt.mode);
      rt.input.focus();
      audio.resume();
    }
  }, [paused, ready, result]);

  const meta = modeRegistry[mode].meta;

  const restart = (): void => {
    setResult(null);
    setPaused(false);
    setReady(false);
    setHud(EMPTY_HUD);
    setAttempt((n) => n + 1);
  };

  const quit = (): void => navigate({ name: 'arcade' });

  if (error) {
    return (
      <Panel class="stack">
        <SectionLabel>{t(meta.nameKey)}</SectionLabel>
        <p>{error}</p>
        <KeycapButton variant="secondary" onClick={quit}>
          {t('result.arcade')}
        </KeycapButton>
      </Panel>
    );
  }

  return (
    <div class="play">
      <div class="hud">
        <SectionLabel class="grow">{t(meta.nameKey)}</SectionLabel>
        <StatChip label={t('hud.score')} value={hud.score} color={meta.color} />
        <StatChip label={t('hud.wpm')} value={Math.round(hud.wpm)} />
        <StatChip label={t('hud.accuracy')} value={`${Math.round(hud.accuracy * 100)}%`} />
        {hud.multiplier > 1 ? (
          <span class="hud__combo" key={hud.multiplier}>
            x{hud.multiplier}
          </span>
        ) : null}
        {hud.chips.map((chip) => (
          <StatChip key={chip.label} label={chip.label} value={chip.value} />
        ))}
        {hud.meter ? (
          <Meter
            label={hud.meter.label}
            filled={hud.meter.filled}
            total={hud.meter.total}
            color={meta.color}
          />
        ) : null}
      </div>

      <div class="stage" ref={stageRef}>
        <canvas
          class="stage__canvas"
          ref={canvasRef}
          role="img"
          aria-label={t('a11y.gameCanvas')}
          hidden={meta.surface !== 'canvas'}
        />
        <div class="stage__overlay" ref={overlayRef} />

        {!ready && !result ? (
          <div class="scrim">
            <p class="mono">{t('play.loading')}</p>
          </div>
        ) : null}

        {paused && !result ? (
          <div class="scrim">
            <Panel class="stack">
              <SectionLabel>{t('pause.title')}</SectionLabel>
              <KeycapButton full onClick={() => setPaused(false)}>
                {t('pause.resume')}
              </KeycapButton>
              <KeycapButton full variant="secondary" onClick={restart}>
                {t('pause.restart')}
              </KeycapButton>
              <KeycapButton full variant="secondary" onClick={() => navigate({ name: 'settings' })}>
                {t('pause.settings')}
              </KeycapButton>
              <KeycapButton full variant="secondary" onClick={quit}>
                {t('pause.quit')}
              </KeycapButton>
            </Panel>
          </div>
        ) : null}

        {result ? (
          <div class="scrim">
            <Result result={result} color={meta.color} onAgain={restart} onArcade={quit} />
          </div>
        ) : null}
      </div>

      <p class="muted mono">{t('play.pauseHint')}</p>
    </div>
  );
}

/** Modes expose a HUD signal; mirror it into component state. */
function subscribeHud(mode: GameMode, setHud: (hud: HudState) => void): (() => void) | undefined {
  const withHud = mode as GameMode & { hud?: { subscribe(fn: (v: HudState) => void): () => void } };
  return withHud.hud?.subscribe(setHud);
}

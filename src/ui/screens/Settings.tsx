import { useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { Difficulty, Theme } from '@/types';
import { settings, settingsService } from '@/services/settings';
import { SOUND_PACKS, audio } from '@/services/audio';
import { storage } from '@/services/storage';
import { progress, save } from '@/services/progress';
import { t } from '@/services/i18n';
import { DIFFICULTY_IDS, DIFFICULTIES } from '@/modes/shared/difficulty';
import { KeycapButton } from '@/ui/components/KeycapButton';
import { Panel, SectionLabel } from '@/ui/components/primitives';
import { toast } from '@/ui/components/Toast';

const THEMES: Theme[] = ['system', 'light', 'dark'];
const LANGUAGES = [{ id: 'en', name: 'English' }];
const UNLOCK_LEVELS: Record<string, number> = {
  classic: 1,
  typewriter: 3,
  bubble: 8,
  synth: 12,
};

export function SettingsScreen(): JSX.Element {
  const s = settings.value;
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState(false);
  const level = save.value?.profile.level ?? 1;

  const set = (patch: Parameters<typeof settingsService.update>[0]): void => {
    void settingsService.update(patch).then(() => audio.applyVolumes());
  };

  const exportSave = async (): Promise<void> => {
    const json = await storage.exportJson();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'typeverse-save.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSave = async (e: JSX.TargetedEvent<HTMLInputElement>): Promise<void> => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    try {
      const imported = await storage.importJson(await file.text());
      save.value = imported;
      settingsService.load(imported.settings);
      toast(t('settings.importDone'));
    } catch {
      toast(t('settings.importFailed'));
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const reset = async (): Promise<void> => {
    const fresh = await storage.reset();
    save.value = fresh;
    settingsService.load(fresh.settings);
    await progress.init();
    setConfirming(false);
    toast(t('settings.resetDone'));
  };

  return (
    <div class="stack">
      <SectionLabel>{t('settings.title')}</SectionLabel>

      <div class="grid-2">
        <Panel class="stack">
          <h3>{t('settings.audio')}</h3>
          <Slider
            label={t('settings.master')}
            value={s.masterVolume}
            onInput={(v) => set({ masterVolume: v })}
          />
          <Slider
            label={t('settings.music')}
            value={s.musicVolume}
            onInput={(v) => set({ musicVolume: v })}
          />
          <Slider
            label={t('settings.sfx')}
            value={s.sfxVolume}
            onInput={(v) => set({ sfxVolume: v })}
          />
          <label class="field">
            <span class="field__label">{t('settings.soundPack')}</span>
            <select
              value={s.soundPack}
              onChange={(e) => {
                set({ soundPack: e.currentTarget.value });
                audio.play('select');
              }}
            >
              {SOUND_PACKS.map((pack) => {
                const needed = UNLOCK_LEVELS[pack.id] ?? 1;
                const locked = level < needed;
                return (
                  <option key={pack.id} value={pack.id} disabled={locked}>
                    {pack.name}
                    {locked ? ` - ${t('settings.locked', { level: needed })}` : ''}
                  </option>
                );
              })}
            </select>
          </label>
        </Panel>

        <Panel class="stack">
          <h3>{t('settings.display')}</h3>
          <label class="field">
            <span class="field__label">{t('settings.theme')}</span>
            <select
              value={s.theme}
              onChange={(e) => set({ theme: e.currentTarget.value as Theme })}
            >
              {THEMES.map((theme) => (
                <option key={theme} value={theme}>
                  {t(`settings.theme.${theme}`)}
                </option>
              ))}
            </select>
          </label>
          <label class="switch">
            <input
              type="checkbox"
              checked={s.reducedMotion}
              onChange={(e) => set({ reducedMotion: e.currentTarget.checked })}
            />
            <span>{t('settings.reducedMotion')}</span>
          </label>
          <Slider
            label={t('settings.fontScale')}
            value={s.fontScale}
            min={0.75}
            max={1.75}
            step={0.25}
            format={(v) => `${v.toFixed(2)}x`}
            onInput={(v) => set({ fontScale: v })}
          />
        </Panel>

        <Panel class="stack">
          <h3>{t('settings.gameplay')}</h3>
          <label class="field">
            <span class="field__label">{t('settings.language')}</span>
            <select value={s.language} onChange={(e) => set({ language: e.currentTarget.value })}>
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </label>
          <label class="field">
            <span class="field__label">{t('settings.difficulty')}</span>
            <select
              value={s.difficulty}
              onChange={(e) => set({ difficulty: e.currentTarget.value as Difficulty })}
            >
              {DIFFICULTY_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(DIFFICULTIES[id].labelKey)}
                </option>
              ))}
            </select>
          </label>
          <label class="switch">
            <input
              type="checkbox"
              checked={s.kidMode}
              onChange={(e) => set({ kidMode: e.currentTarget.checked })}
            />
            <span>
              {t('settings.kidMode')}
              <small class="muted">{t('settings.kidModeHint')}</small>
            </span>
          </label>
        </Panel>

        <Panel class="stack">
          <h3>{t('settings.data')}</h3>
          <KeycapButton variant="secondary" full onClick={() => void exportSave()}>
            {t('settings.export')}
          </KeycapButton>
          {/* Native file input stays hidden; the keycap opens it (DESIGN_SYSTEM: everything clickable is a keycap). */}
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => void importSave(e)}
          />
          <KeycapButton variant="secondary" full onClick={() => fileRef.current?.click()}>
            {t('settings.import')}
          </KeycapButton>
          {confirming ? (
            <div class="stack">
              <KeycapButton variant="danger" full onClick={() => void reset()}>
                {t('settings.resetConfirm')}
              </KeycapButton>
              <KeycapButton variant="secondary" full onClick={() => setConfirming(false)}>
                {t('nav.back')}
              </KeycapButton>
            </div>
          ) : (
            <KeycapButton variant="danger" full onClick={() => setConfirming(true)}>
              {t('settings.reset')}
            </KeycapButton>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onInput,
  min = 0,
  max = 1,
  step = 0.05,
  format = (v: number) => `${Math.round(v * 100)}%`,
}: {
  label: string;
  value: number;
  onInput: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
}): JSX.Element {
  return (
    <label class="field">
      <span class="field__label">
        {label} <span class="mono">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) => onInput(Number(e.currentTarget.value))}
      />
    </label>
  );
}

import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { modeList } from '@/modes/registry';
import { progress, save } from '@/services/progress';
import { t } from '@/services/i18n';
import { navigate } from '@/app/router';
import { audio } from '@/services/audio';
import { Bar, Panel, SectionLabel, StatChip } from '@/ui/components/primitives';
import { ModeTile } from '@/ui/components/ModeTile';
import { toast } from '@/ui/components/Toast';

const COLUMNS = 4;

/** Main menu: one keycap tile per mode, arrow-key navigation, staggered key drop. */
export function Arcade(): JSX.Element {
  const [focus, setFocus] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const level = progress.progress();
  const saved = save.value;

  useEffect(() => {
    const buttons = gridRef.current?.querySelectorAll<HTMLButtonElement>('.tile');
    buttons?.[focus]?.focus();
  }, [focus]);

  const move = (delta: number): void => {
    setFocus((current) => {
      const next = (current + delta + modeList.length) % modeList.length;
      audio.play('menu');
      return next;
    });
  };

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>): void => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        move(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        move(COLUMNS);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-COLUMNS);
        break;
      default:
        break;
    }
  };

  const open = (index: number): void => {
    const entry = modeList[index];
    if (!entry) return;
    if (!progress.isUnlocked(entry.meta)) {
      toast(t('arcade.locked', { level: entry.meta.unlockLevel }));
      audio.play('error');
      return;
    }
    audio.unlock();
    audio.play('select');
    navigate({ name: 'play', mode: entry.meta.id });
  };

  return (
    <div class="stack">
      <Panel class="row">
        <SectionLabel class="grow">{t('arcade.label')}</SectionLabel>
        <StatChip
          label={t('arcade.level', { level: level.level })}
          value={`${level.into}/${level.need}`}
        />
        <div style={{ minInlineSize: '180px' }}>
          <Bar label="XP" value={level.need === 0 ? 1 : level.into / level.need} color="lime" />
        </div>
      </Panel>

      <p class="muted mono">{t('arcade.hint')}</p>

      <div
        class="arcade__grid"
        ref={gridRef}
        role="group"
        aria-label={t('arcade.pickMode')}
        onKeyDown={onKeyDown}
      >
        {modeList.map((entry, index) => (
          <ModeTile
            key={entry.meta.id}
            meta={entry.meta}
            index={index}
            best={saved?.bests[entry.meta.id] ?? null}
            locked={!progress.isUnlocked(entry.meta)}
            focused={index === focus}
            onSelect={() => open(index)}
            onFocus={() => setFocus(index)}
          />
        ))}
      </div>
    </div>
  );
}

import type { JSX } from 'preact';
import type { ModeMeta } from '@/types';
import { t } from '@/services/i18n';
import { ModeArt, MODE_ACCENT } from './ModeArt';

interface ModeTileProps {
  meta: ModeMeta;
  index: number;
  best: { score: number; wpm: number } | null;
  locked: boolean;
  focused: boolean;
  onSelect: () => void;
  onFocus: () => void;
}

/** Arcade card: a 3D illustration in the mode accent, name, description and a play or level pill. */
export function ModeTile({
  meta,
  index,
  best,
  locked,
  focused,
  onSelect,
  onFocus,
}: ModeTileProps): JSX.Element {
  const name = t(meta.nameKey);
  const status = locked
    ? t('arcade.locked', { level: meta.unlockLevel })
    : best
      ? t('arcade.best', { score: best.score })
      : t('arcade.noBest');
  const zen = meta.id === 'zen';

  return (
    <button
      type="button"
      class={`tile tile--${MODE_ACCENT[meta.id]} ${locked ? 'tile--locked' : 'tile--open'}`}
      style={{ '--drop-delay': `${index * 60}ms` } as JSX.CSSProperties}
      onClick={onSelect}
      onFocus={onFocus}
      tabIndex={focused ? 0 : -1}
      aria-disabled={locked ? 'true' : undefined}
      aria-describedby={`tile-desc-${meta.id}`}
    >
      {locked ? (
        <span class="tile__badge" aria-hidden="true">
          <LockIcon /> {t('arcade.lockedBadge')}
        </span>
      ) : null}
      <span class="tile__art">
        <ModeArt mode={meta.id} />
      </span>
      <span class="tile__name">{name}</span>
      <span class="tile__desc">{t(meta.descKey)}</span>
      {locked ? (
        <span class="tile__pill" aria-hidden="true">
          {t('arcade.level', { level: meta.unlockLevel })}
        </span>
      ) : (
        <span class="tile__cta" aria-hidden="true">
          {t(zen ? 'arcade.relax' : 'arcade.play')} <span>&rarr;</span>
        </span>
      )}
      <span class={locked ? 'visually-hidden' : 'tile__best'} id={`tile-desc-${meta.id}`}>
        {status}
      </span>
    </button>
  );
}

function LockIcon(): JSX.Element {
  return (
    <svg class="tile__lock" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="2.5" y="7" width="11" height="8" rx="2" />
      <path d="M5 7V5a3 3 0 016 0v2" fill="none" stroke="currentColor" stroke-width="2" />
    </svg>
  );
}

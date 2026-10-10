import type { JSX } from 'preact';
import type { ModeMeta } from '@/types';
import { t } from '@/services/i18n';
import { Keycap } from './Keycap';

interface ModeTileProps {
  meta: ModeMeta;
  index: number;
  best: { score: number; wpm: number } | null;
  locked: boolean;
  focused: boolean;
  onSelect: () => void;
  onFocus: () => void;
}

const TILTS = [-4, 3, -2, 5, 4, -5, 2, -3];

/** Arcade menu tile: a big keycap in the mode color, the name and the best score. */
export function ModeTile({
  meta,
  index,
  best,
  locked,
  focused,
  onSelect,
  onFocus,
}: ModeTileProps): JSX.Element {
  const tilt = TILTS[index % TILTS.length] ?? 0;
  const name = t(meta.nameKey);
  const bestLabel = best
    ? t('arcade.best', { score: best.score })
    : locked
      ? t('arcade.locked', { level: meta.unlockLevel })
      : t('arcade.noBest');

  return (
    <button
      type="button"
      class={`tile ${locked ? 'tile--locked' : ''}`}
      style={{ '--drop-delay': `${index * 60}ms` } as JSX.CSSProperties}
      onClick={onSelect}
      onFocus={onFocus}
      tabIndex={focused ? 0 : -1}
      aria-disabled={locked ? 'true' : undefined}
      aria-describedby={`tile-desc-${meta.id}`}
    >
      <span class="tile__key">
        <Keycap color={meta.color} size={104} tilt={tilt} decorative>
          {meta.letter}
        </Keycap>
        {locked ? (
          <span class="tile__lock" aria-hidden="true">
            &#128274;
          </span>
        ) : null}
      </span>
      <span class="tile__name">{name}</span>
      <span class="tile__best" id={`tile-desc-${meta.id}`}>
        {bestLabel}
      </span>
      <span class="tile__desc">{t(meta.descKey)}</span>
    </button>
  );
}

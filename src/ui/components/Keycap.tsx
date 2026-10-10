import type { ComponentChildren, JSX } from 'preact';
import type { KeycapColor } from '@/types';

export type KeycapSize = 32 | 48 | 72 | 104;

interface KeycapProps {
  children: ComponentChildren;
  color?: KeycapColor;
  size?: KeycapSize;
  tilt?: number;
  locked?: boolean;
  /** Decorative keys are hidden from assistive tech and are not focusable. */
  decorative?: boolean;
  label?: string;
  onClick?: () => void;
  class?: string;
}

const COLOR_CLASS: Record<KeycapColor, string> = {
  blue: '',
  orange: 'keycap--orange',
  mint: 'keycap--mint',
  lime: 'keycap--lime',
};

/** The core component: a single letter or icon key. */
export function Keycap({
  children,
  color = 'blue',
  size = 72,
  tilt = 0,
  locked = false,
  decorative = false,
  label,
  onClick,
  class: className = '',
}: KeycapProps): JSX.Element {
  const style = {
    inlineSize: `${size}px`,
    fontSize: `${Math.round(size * 0.45)}px`,
    '--tilt': `${tilt}deg`,
  } as JSX.CSSProperties;
  const classes = ['keycap', COLOR_CLASS[color], size <= 48 ? 'keycap--sm' : '', className]
    .filter(Boolean)
    .join(' ');

  if (decorative) {
    return (
      <span class={classes} style={style} aria-hidden="true">
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      class={classes}
      style={style}
      onClick={onClick}
      aria-label={label}
      aria-disabled={locked ? 'true' : undefined}
      disabled={locked}
    >
      {children}
    </button>
  );
}

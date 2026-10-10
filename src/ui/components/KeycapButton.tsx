import type { ComponentChildren, JSX } from 'preact';
import type { KeycapColor } from '@/types';

interface KeycapButtonProps {
  children: ComponentChildren;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  color?: KeycapColor;
  disabled?: boolean;
  type?: 'button' | 'submit';
  full?: boolean;
  class?: string;
  /** Rendered as a small mono hint on the key, e.g. the shortcut letter. */
  hint?: string;
  ariaLabel?: string;
}

const COLOR_CLASS: Record<KeycapColor, string> = {
  blue: 'keybtn--blue',
  orange: 'keybtn--orange',
  mint: 'keybtn--mint',
  lime: 'keybtn--lime',
};

/** Rectangular key with a label. Primary is blue; secondary is surface + ink border. */
export function KeycapButton({
  children,
  onClick,
  variant = 'primary',
  color,
  disabled = false,
  type = 'button',
  full = false,
  class: className = '',
  hint,
  ariaLabel,
}: KeycapButtonProps): JSX.Element {
  const classes = [
    'keybtn',
    `keybtn--${variant}`,
    color ? COLOR_CLASS[color] : '',
    full ? 'keybtn--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      class={classes}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled ? 'true' : undefined}
      aria-label={ariaLabel}
    >
      <span class="keybtn__label">{children}</span>
      {hint ? <span class="keybtn__hint">{hint}</span> : null}
    </button>
  );
}

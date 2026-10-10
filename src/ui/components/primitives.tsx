import type { ComponentChildren, JSX } from 'preact';
import type { KeycapColor } from '@/types';

export function Panel({
  children,
  class: className = '',
  as: Tag = 'section',
  ...rest
}: {
  children: ComponentChildren;
  class?: string;
  as?: 'section' | 'div' | 'article';
  [key: string]: unknown;
}): JSX.Element {
  return (
    <Tag class={`panel ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/** The signature "— S T A T S —" header. */
export function SectionLabel({
  children,
  class: className = '',
}: {
  children: ComponentChildren;
  class?: string;
}): JSX.Element {
  return <h2 class={`section-label ${className}`}>{children}</h2>;
}

/** Pill with a mono label and value, e.g. WPM 72. */
export function StatChip({
  label,
  value,
  color,
  class: className = '',
}: {
  label: string;
  value: string | number;
  color?: KeycapColor;
  class?: string;
}): JSX.Element {
  return (
    <span class={`chip ${color ? `chip--${color}` : ''} ${className}`}>
      <span class="chip__label">{label}</span>
      <span class="chip__value">{value}</span>
    </span>
  );
}

/** Chunky segmented bar for lives, wobble and progress. */
export function Meter({
  label,
  filled,
  total,
  color = 'blue',
}: {
  label: string;
  filled: number;
  total: number;
  color?: KeycapColor;
}): JSX.Element {
  const segments = Array.from({ length: total }, (_, i) => i < filled);
  return (
    <div class="meter" role="group" aria-label={`${label}: ${filled} of ${total}`}>
      <span class="meter__label">{label}</span>
      <span class="meter__track">
        {segments.map((on, i) => (
          <span key={i} class={`meter__seg ${on ? `meter__seg--on meter__seg--${color}` : ''}`} />
        ))}
      </span>
      <span class="meter__value">
        {filled}/{total}
      </span>
    </div>
  );
}

/** Continuous version for percentages (wobble, race progress). */
export function Bar({
  label,
  value,
  color = 'blue',
}: {
  label: string;
  /** 0..1 */
  value: number;
  color?: KeycapColor;
}): JSX.Element {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      class="bar"
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span class="bar__label">{label}</span>
      <span class="bar__track">
        <span class={`bar__fill bar__fill--${color}`} style={{ inlineSize: `${pct}%` }} />
      </span>
      <span class="bar__value">{pct}%</span>
    </div>
  );
}

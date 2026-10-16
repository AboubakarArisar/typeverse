import type { JSX } from 'preact';
import type { ModeId } from '@/types';

/**
 * Arcade card accent per mode (DESIGN_SYSTEM.md section 8). Only the arcade art uses
 * these; in-game colors still come from ModeMeta.color.
 */
export const MODE_ACCENT: Record<ModeId, string> = {
  'word-rain': 'blue',
  'type-beats': 'orange',
  'code-typer': 'mint',
  'zombie-survival': 'lime',
  'typing-racer': 'red',
  'word-tower': 'gold',
  story: 'purple',
  zen: 'mint',
};

/**
 * One tilted 3D keycap shared by every illustration, so depth, lighting and
 * proportions match across cards. The icon sits on the key face.
 */
function Key({ children }: { children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <g class="art__key" transform="rotate(-8 80 62)">
      <rect class="art__side" x="48" y="38" width="64" height="64" rx="15" />
      <rect class="art__face" x="48" y="28" width="64" height="64" rx="15" />
      <g class="art__icon">{children}</g>
    </g>
  );
}

const ART: Record<ModeId, () => JSX.Element> = {
  'word-rain': () => (
    <>
      <g class="art__deco">
        <g transform="rotate(-18 30 74)">
          <rect class="art__chip" x="16" y="60" width="28" height="28" rx="7" />
          <text class="art__chip-text" x="30" y="79">
            A
          </text>
        </g>
        <g transform="rotate(16 132 82)">
          <rect class="art__chip" x="118" y="68" width="28" height="28" rx="7" />
          <text class="art__chip-text" x="132" y="87">
            S
          </text>
        </g>
        <path class="art__line" d="M44 22l6 10M118 18l-7 12M128 34l-10 5" />
      </g>
      <Key>
        <text class="art__glyph" x="80" y="71">
          W
        </text>
      </Key>
    </>
  ),
  'type-beats': () => (
    <>
      <path
        class="art__line art__deco"
        d="M14 62v4M22 54v20M30 46v36M38 56v16M122 56v16M130 46v36M138 54v20M146 62v4"
      />
      <Key>
        <path class="art__stroke" d="M74 74V44l18-5v29" />
        <circle class="art__fill" cx="69" cy="74" r="6" />
        <circle class="art__fill" cx="87" cy="69" r="6" />
      </Key>
    </>
  ),
  'code-typer': () => (
    <>
      <path
        class="art__line art__deco"
        d="M10 44h20M14 54h28M10 64h14M16 74h22M128 52h20M120 62h28M132 72h16M124 82h22"
      />
      <Key>
        <path class="art__stroke" d="M68 50l-10 10 10 10M92 50l10 10-10 10M84 46l-8 28" />
      </Key>
    </>
  ),
  'zombie-survival': () => (
    <>
      <g class="art__deco art__ghosts">
        <path d="M16 98V76a12 12 0 0124 0v22l-4-4-4 4-4-4-4 4-4-4z" />
        <path d="M124 98V70a13 13 0 0126 0v28l-4-4-5 4-4-4-4 4-5-4z" />
      </g>
      <Key>
        <path class="art__fill" d="M68 84l2-18h20l2 18z" />
        <path
          class="art__stroke art__stroke--claw"
          d="M70 66l-6-14M76 64l-2-18M83 64l3-18M89 66l8-12"
        />
      </Key>
    </>
  ),
  'typing-racer': () => (
    <>
      <path class="art__line art__deco" d="M6 50h34M2 62h40M10 74h30M12 86h24" />
      <Key>
        <path class="art__stroke" d="M64 84V40" />
        <path
          class="art__fill"
          d="M66 42h8v7h-8zM82 42h8v7h-8zM74 49h8v7h-8zM90 49h6v7h-6zM66 56h8v7h-8zM82 56h8v7h-8z"
        />
        <path class="art__thin" d="M66 42h30v21H66z" />
      </Key>
    </>
  ),
  'word-tower': () => (
    <>
      <g class="art__deco">
        <rect
          class="art__chip"
          x="18"
          y="30"
          width="18"
          height="18"
          rx="4"
          transform="rotate(-14 27 39)"
        />
        <rect
          class="art__chip"
          x="128"
          y="70"
          width="20"
          height="20"
          rx="4"
          transform="rotate(12 138 80)"
        />
      </g>
      <Key>
        <path class="art__fill" d="M62 72h36v10H62zM67 60h26v10H67zM72 48h16v10H72z" />
        <path class="art__stroke art__stroke--thin" d="M80 48V36" />
        <path class="art__fill" d="M80 36h10l-3 4 3 4H80z" />
      </Key>
    </>
  ),
  story: () => (
    <>
      <g class="art__deco art__sparkles">
        <path d="M26 30l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
        <path d="M136 72l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
        <path d="M140 26l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
      </g>
      <Key>
        <path
          class="art__fill"
          d="M80 50c-6-5-14-6-20-5v28c6-1 14 0 20 5zM80 50c6-5 14-6 20-5v28c-6-1-14 0-20 5z"
        />
        <path class="art__gutter" d="M80 50v28" />
      </Key>
    </>
  ),
  zen: () => (
    <>
      <g class="art__deco">
        <path class="art__leaf" d="M18 74c0-14 10-22 24-22 0 14-10 22-24 22z" />
        <path class="art__leaf" d="M120 40c4-10 14-14 24-12-3 10-13 15-24 12z" />
        <path class="art__line" d="M138 86v-14l8-2v12" />
      </g>
      <Key>
        <path class="art__fill" d="M62 78c0-20 14-32 36-32 0 22-14 32-36 32z" />
        <path class="art__gutter" d="M62 78c8-10 18-18 30-26" />
      </Key>
    </>
  ),
};

/** Decorative 3D illustration for an arcade card; hidden from assistive tech. */
export function ModeArt({ mode }: { mode: ModeId }): JSX.Element {
  const Art = ART[mode];
  return (
    <svg class="art" viewBox="0 0 160 112" aria-hidden="true" focusable="false">
      <Art />
    </svg>
  );
}

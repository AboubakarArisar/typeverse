# Design System — "Arcade Keycaps"

Everything in Typeverse grows from the logo: **chunky, colorful keycaps on a warm cream
background, with bold ink-black letters.** The UI should feel like a playful, tactile
keyboard, never like a corporate dashboard.

Tokens live in [`src/ui/styles/tokens.css`](../src/ui/styles/tokens.css). Never hardcode a
color, size, or radius that a token covers.

## 1. Brand principles

1. **Tactile.** Things look pressable and respond to presses: depth, squash, click sounds.
2. **Playful, not childish.** Slight tilts, bright fills, bold type, but clean layouts with breathing room.
3. **Ink on color.** Text on a colored surface is always dark ink. Never white text on keycap colors.
4. **One color, one meaning.** Each mode owns a keycap color; feedback colors are consistent everywhere.
5. **Calm background, loud actors.** Backgrounds stay cream or ink; color is for things you interact with.

## 2. Color

### 2.1 Keycap palette (from the logo)

| Token | Face | Side (shadow) | Logo letter | Used for |
|---|---|---|---|---|
| `--key-blue` | `#5B8CFF` | `#2F5BC9` | T | Word Rain, Typing Racer, primary actions, links |
| `--key-orange` | `#FF8A3D` | `#C9601F` | Y | Type Beats, Word Tower, highlights, combo |
| `--key-mint` | `#7CF5C8` | `#3FBF93` | P | Code Typer, Story Mode, success |
| `--key-lime` | `#C6F432` | `#8FB51C` | E | Zombie Survival, Zen Mode, XP and level-ups |

### 2.2 Neutrals

| Token | Light theme | Dark theme | Use |
|---|---|---|---|
| `--bg` | `#FFF4E0` cream | `#0B0F1E` ink | Page background |
| `--surface` | `#FFFFFF` | `#161B2E` | Cards, panels, modals |
| `--surface-sunk` | `#F5E8CF` | `#0F1426` | Inputs, wells, game HUD bars |
| `--ink` | `#0B0F1E` | `#FFF4E0` | Main text |
| `--ink-muted` | `#4A4F63` | `#AEB3C7` | Secondary text (≥ 4.5:1 on `--bg`) |
| `--line` | `#E4D6BB` | `#2A3150` | Borders, dividers |
| `--on-key` | `#0B0F1E` | `#0B0F1E` | Text on keycaps — same in both themes |

### 2.3 Feedback

| Meaning | Color | Always paired with |
|---|---|---|
| Correct char | `--key-mint` underline | Letter turns `--ink`, typed position advances |
| Wrong char | `--error` `#E5484D` | Letter shakes + strikethrough + error sound |
| Locked target | `--key-blue` ring | Ring thickness 3px + slight scale-up |
| Combo active | `--key-orange` | ×N badge text |
| Level up | `--key-lime` | "LEVEL UP" label + sound |

### 2.4 Color rules

- Keycap colors are **fills only**. Never use lime, mint, or orange as text on cream (contrast fails).
- Text on any keycap: `--on-key` (ink). Contrast ≥ 7:1 on all four faces.
- Never rely on color alone: pair with a label, icon, or shape change (NFR-07).
- Wrong vs correct differ in **lightness and shape** (red strikethrough vs mint underline), not hue only.

## 3. Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| Display / headings / keycap letters | **Space Grotesk** | 700 | Matches the T-Y-P-E keycaps |
| UI body, buttons | **Space Grotesk** | 500 | |
| Labels, stats, game words, code | **JetBrains Mono** | 500 / 800 | Matches "VERSE"; monospace makes typing targets easy to read |
| Urdu | **Noto Nastaliq Urdu** | 400–700 | Loaded only with the Urdu pack |
| Arabic | **Noto Naskh Arabic** | 400–700 | Loaded only with the Arabic pack |

All fonts self-hosted (OFL licensed). Fallback stacks:
`'Space Grotesk', 'Segoe UI', system-ui, sans-serif` and
`'JetBrains Mono', Consolas, 'Courier New', monospace`.

### Type scale (rem, base 16px)

| Token | Size | Use |
|---|---|---|
| `--fs-hero` | 4rem | Arcade title, result score |
| `--fs-h1` | 2.5rem | Screen titles |
| `--fs-h2` | 1.75rem | Section titles |
| `--fs-game` | 1.75rem | Falling words, typing targets (scales with settings) |
| `--fs-body` | 1rem | Body text |
| `--fs-label` | 0.8125rem | Mono labels, uppercase, letter-spacing 0.2em |

**The "VERSE" label style** (spaced uppercase mono flanked by short rules) is the signature
section header. Use it for screen subtitles and HUD labels: `— S T A T S —`.

## 4. Shape and depth: the Keycap

The keycap is the core component. Everything clickable is a keycap or derived from one.

```
 ┌───────────┐   face: keycap color, radius = 22% of size
 │     T     │   letter: Space Grotesk 700, --on-key
 └───────────┘
 ▀▀▀▀▀▀▀▀▀▀▀▀▀   side: darker shade, offset-y = 12% of size (box-shadow, no blur)
```

| Token | Value |
|---|---|
| `--radius-key` | 22% of the key's size (≈ 22px at 104px) |
| `--radius-panel` | 20px |
| `--radius-pill` | 999px |
| `--depth-1` | `0 6px 0` (small keys, buttons) |
| `--depth-2` | `0 12px 0` (tiles, logo keys) |
| `--tilt` | between −6° and +6°, only for decorative/hero keys and menu tiles |

### Keycap states

| State | Visual |
|---|---|
| Rest | Full depth shadow, optional tilt |
| Hover | Lift 2px (shadow grows), tilt eases toward 0° |
| Pressed | Translate down by the depth; shadow → 0; 60 ms; "clack" sound |
| Focus (keyboard) | 3px `--ink` outline, 3px offset, plus hover lift |
| Disabled / locked | Face desaturated to `--line`, lock icon, no depth |

### Components

| Component | Description |
|---|---|
| `Keycap` | Single letter or icon key. Sizes: 32, 48, 72, 104px. |
| `KeycapButton` | Rectangular key with label. Primary = blue, secondary = surface with ink border + depth. |
| `ModeTile` | Arcade menu tile: big keycap in the mode's color, mode name, best score in mono, slight tilt. |
| `Panel` | `--surface`, `--radius-panel`, 2px `--line` border, `--depth-1` shadow in `--line`. |
| `SectionLabel` | The "— V E R S E —" style header. |
| `StatChip` | Pill with mono label + value (WPM 72). |
| `Meter` | Chunky bar for lives, wobble, progress; segmented like keys. |
| `KeyboardHeatmap` | A keyboard of small keycaps tinted by error rate (lightness scale + numbers on hover). |
| `Toast` | Small keycap-shaped notification that pops in from the top. |
| `TargetWord` | Game word: mono, typed part in `--ink-muted` with mint underline, untyped in `--ink`. |

### Layout

- 8px spacing grid: `--space-1` 4px, `--space-2` 8px, `--space-3` 16px, `--space-4` 24px, `--space-5` 32px, `--space-6` 48px, `--space-7` 64px.
- Max content width 1120px. Arcade grid: 4 columns on desktop, 2 on tablets.
- Use logical properties (`margin-inline-start`) so RTL works automatically.

## 5. Motion

| Token | Value | Use |
|---|---|---|
| `--ease-pop` | `cubic-bezier(.34,1.56,.64,1)` | Keys popping in, toasts, combo badges |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | Panels, screen transitions |
| `--dur-press` | 60ms | Key press |
| `--dur-fast` | 150ms | Hover, small feedback |
| `--dur-base` | 250ms | Screen and panel transitions |

**Signature motions**
- **Key drop:** menu tiles drop in one by one, staggered 60ms, landing with a small bounce.
- **Word burst:** a completed word splits into its letters as tiny keycaps that pop and fade.
- **Wrong-key wobble:** target shakes ±4px three times in 180ms.
- **Combo pulse:** the ×N badge scales 1 → 1.2 → 1 on each step.

**Reduced motion:** replace shakes and bursts with a quick color flash; no tilts; transitions become 0–100ms fades.

## 6. Sound

Sound is part of the brand: keys should **clack**.

| Event | Sound |
|---|---|
| Correct key | Soft key click (pack-dependent) |
| Wrong key | Low dull thunk |
| Word complete | Bright "pop" |
| Combo step | Rising pitch on each multiplier |
| Level up | Short 4-note arpeggio (T-Y-P-E) |
| Menu move / select | Light tick / heavier clack |

Sound packs (unlockable): **Classic** (mechanical), **Typewriter**, **Bubble**, **Synth**.
Master/music/SFX volumes in settings; everything muted until the first user gesture.

## 7. Iconography and illustration

- Icons: rounded 2px-stroke line icons (e.g. Lucide), drawn in `--ink`.
- Illustrations (zombies, cars, tower blocks) use the four keycap colors, flat fills, a dark ink outline (3px), and the same rounded corners. Cartoon style, no gore.
- Particles and confetti are tiny keycaps.

## 8. Mode color map

| Mode | Color | Tile letter |
|---|---|---|
| Word Rain | Blue | W |
| Typing Racer | Blue | R |
| Type Beats | Orange | B |
| Word Builder Tower | Orange | T |
| Code Typer | Mint | C |
| Story Mode | Mint | S |
| Zombie Survival | Lime | Z |
| Zen Mode | Lime | Z with a leaf icon to tell it apart from Zombie |

Arcade grid order alternates colors so neighbours differ, just like the logo.

## 9. Logo usage

- Primary: four keycaps T-Y-P-E with "— V E R S E —" below, on cream.
- Compact (favicon, app icon): single blue **T** keycap on cream, or the four keycaps in a 2×2 grid at 64px and up.
- Dark backgrounds: same keycap colors; "VERSE" and rules switch to cream `#FFF4E0`.
- Minimum clear space: the height of one keycap's side shadow on every side.
- Don't: recolor keys, use white letters on keys, remove the side shadows, change the tilt directions, or put the logo on busy photos.

## 10. Accessibility checklist for every screen

- [ ] All text meets 4.5:1 (body) or 3:1 (≥ 24px bold)
- [ ] Visible focus ring on every interactive element
- [ ] Works with keyboard only; Escape always backs out
- [ ] No meaning by color alone
- [ ] Reduced-motion version checked
- [ ] Results announced to screen readers via an `aria-live` region
- [ ] Layout checked in RTL

<div align="center">

# Typeverse

**A universe of typing games.** Free, open source, ad-free, and playable in any browser.

[![CI](https://github.com/AboubakarArisar/typeverse/actions/workflows/ci.yml/badge.svg)](https://github.com/AboubakarArisar/typeverse/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-5B8CFF.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-installable-7CF5C8.svg)](#offline-and-install)
[![No tracking](https://img.shields.io/badge/tracking-none-C6F432.svg)](#privacy)

### [▶ Play it live](https://typeverse.aboubakarisar.tech)

</div>

---

Typeverse is a typing **arcade**, not a drill. One shared typing engine powers eight games, each
training a different skill: make music by typing, survive waves, race bots, build towers, type
real code, or just breathe in Zen mode.

No accounts. No ads. No analytics. Your progress lives in your own browser and nowhere else.

## Game modes

| Mode | Key | What you do |
|---|:---:|---|
| **Word Rain** | 🔵 W | Words fall from the top. Type them before they land. Three lives, rising speed, and power-up words that freeze, clear, or heal. |
| **Type Beats** | 🟠 B | Every keystroke is a note. Hit the chart on the beat, or play freely and export the result as a `.wav`. |
| **Code Typer** | 🟢 C | Real JavaScript, Python and HTML/CSS snippets. Indentation is free; brackets and symbols are scored separately. |
| **Zombie Survival** | 🟡 Z | Word-carrying walkers close in from every side. Clear waves, pick upgrades, face a boss every fifth wave. |
| **Typing Racer** | 🔵 R | Race three bots over a passage. A typo makes you skid until you fix it. Your best run comes back as a ghost. |
| **Word Tower** | 🟠 T | Each correct word drops a block. Each typo adds sway. Push too far and the tower topples. |
| **Story Mode** | 🟢 S | Type your way through an original adventure. Choices are typed, and accuracy decides how scenes turn out. |
| **Zen Mode** | 🟡 Z | No timer, no score on screen. Calm lines, soft tones, ripples. Stats are still recorded quietly. |

## Features

- **One engine, eight games.** Target locking, combo multipliers, live WPM and accuracy, per-key error tracking.
- **Progress that stays yours.** XP, levels, unlockable sound packs, best scores and your last 100 sessions in IndexedDB. Export or wipe it any time.
- **Stats that mean something.** WPM over time, accuracy trend, and a keyboard heatmap of the keys you actually miss.
- **Built for keyboards.** Every screen is fully usable without a mouse. Escape always backs out.
- **Accessible.** WCAG 2.2 AA menus, visible focus rings, `prefers-reduced-motion` honoured, results announced to screen readers, and never meaning by colour alone.
- **Ready for any script.** All UI strings go through `t()`, layout uses logical CSS properties, and input handles IME composition so Urdu, Arabic and accented Latin work.
- **Fast.** ~39 KB of gzipped JavaScript on first load; each mode is a 1–3 KB lazy chunk. Logic runs on a fixed 60 Hz timestep with pooled entities, so frame rate never changes the game.

### Offline and install

A service worker caches the app on your first visit. After that it loads and plays with the
network off, and installs as a standalone app from the browser's install button.

### Privacy

No cookies, no analytics, no third-party requests at runtime, and a strict Content-Security-Policy.
The only data that exists is the save file in your browser.

## Quick start

```bash
git clone https://github.com/AboubakarArisar/typeverse.git
cd typeverse
npm install
npm run dev     # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit tests (Vitest) |
| `npm run coverage` | Engine and scoring coverage — must stay above 80% |
| `npm run e2e` | Playwright smoke tests, one per mode |
| `npm run validate:content` | Check every JSON pack against its schema |
| `npm run lint` | ESLint + Prettier |

Visit `#/kit` in dev for a gallery of every UI component in light and dark themes.

## How it is built

```
src/
├─ engine/     TypingEngine, MetricsCalculator, EventBus, GameLoop, InputManager, Rng
├─ modes/      one folder per game + shared/ (BaseMode, ObjectPool, canvas, scoring)
├─ services/   storage, progress, content, settings, i18n, audio
├─ ui/         keycap components, screens, design tokens
└─ app/        shell and router
content/       language packs, code packs, stories and rhythm charts as JSON
```

**The engine is pure logic.** `TypingEngine` holds the active targets, decides which one a
keystroke locks onto, compares characters, and tracks combo and score — with no DOM anywhere, so
it is fully unit-testable. Modes never import singletons; everything they need arrives in a
`ModeContext`. Systems talk through a typed event bus, so the engine has no idea audio exists.

**Adding a mode** means copying `src/modes/_template/`, implementing the `GameMode` interface, and
registering it in `src/modes/registry.ts` with a lazy `import()`. The arcade menu only ever reads
a mode's metadata, so game code is downloaded when you pick it and not before.

**Content is data.** Word lists, code snippets, stories and rhythm charts are JSON validated with
Zod, so writers can add material without touching TypeScript.

### Design: "Arcade Keycaps"

Everything grows from the logo — chunky coloured keycaps with ink-black letters on warm cream.
Every clickable thing is a keycap or derived from one: solid side shadow, press-down on `:active`,
visible focus ring. Each mode owns one of four colours.

| | Face | Side | Used by |
|---|---|---|---|
| Blue | `#5B8CFF` | `#2F5BC9` | Word Rain, Typing Racer, primary actions |
| Orange | `#FF8A3D` | `#C9601F` | Type Beats, Word Tower, combo |
| Mint | `#7CF5C8` | `#3FBF93` | Code Typer, Story Mode, success |
| Lime | `#C6F432` | `#8FB51C` | Zombie Survival, Zen Mode, XP |

Text on a keycap is always ink, never white. All styling comes from the tokens in
`src/ui/styles/tokens.css` — no hardcoded colours, sizes or durations.

### Tech stack

Vite · TypeScript (strict) · Preact + Signals · Canvas 2D for games, DOM overlay for text-heavy
modes · Web Audio · IndexedDB via idb-keyval · Zod · uPlot · vite-plugin-pwa · Vitest ·
Playwright · ESLint + Prettier · GitHub Actions → GitHub Pages.

### Testing

56 unit tests cover the engine, metrics, scoring, RNG and content schemas — **95% line coverage**
on the engine and scoring. 14 Playwright tests boot every mode, type into it, and fail on any
console error. Both run on every push.

## Contributing

Issues and pull requests are welcome.

1. Branch: `feat/word-rain-powerups`, `fix/ime-urdu`, `content/pack-es`.
2. Keep pull requests small. Make sure `npm run lint`, `npm test` and `npm run build` pass.
3. Commit with [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `docs:`, `content:`.
4. TypeScript strict, no `any` without a comment saying why. Tokens only, no hardcoded styles. All
   UI strings through `t('key')`.
5. Only add assets you made or that are CC0, CC-BY or OFL — and add them to the credits below.

Good first issues: a new language pack, more code snippets, or an extra rhythm chart. All three
are JSON only.

## Roadmap

Shipped: all eight modes, progression, stats, settings, save export/import, the first-run typing
check, and an installable offline build.

Next up:

- [ ] Vendor the Space Grotesk and JetBrains Mono font files (currently falling back to system stacks)
- [ ] Urdu and Arabic language packs plus an RTL review
- [ ] Accessibility audit (axe plus a manual screen-reader pass)
- [ ] Performance pass on a low-end laptop, Lighthouse ≥ 90
- [ ] Unlockable cars and tracks for Typing Racer
- [ ] Daily challenge with a shareable result, seeded and local-only

Out of scope until there is a backend: multiplayer races, accounts, global leaderboards.

## Credits and licensing

All code is MIT. Every asset is original or openly licensed.

| What | Licence | By |
|---|---|---|
| Typeverse source | MIT | Aboubakar Isar and contributors |
| Logo, keycap marks, app icons | CC-BY-4.0 | Aboubakar Isar |
| Word lists, sentences, Zen lines, the story, rhythm charts | CC0-1.0 | written for Typeverse |
| Code snippets in Code Typer | MIT | written for Typeverse |
| All sound packs and ambience | CC0-1.0 | synthesized at runtime with Web Audio — no samples are shipped |
| Space Grotesk, JetBrains Mono | OFL-1.1 | not yet vendored; see the roadmap |
| Preact, Zod, uPlot, Vite | MIT | their respective authors |
| idb-keyval | Apache-2.0 | Jake Archibald |

No copyrighted lyrics, book passages or assets from other games are used anywhere in this project.

---

<div align="center">

**[MIT licensed](LICENSE)** · Built because typing practice should be something you want to open.

</div>

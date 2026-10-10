# Typeverse

> A universe of typing games. Free, open source, ad-free, and playable in any browser.

**Live:** https://typeverse.aboubakarisar.tech
**License:** MIT

Typeverse is a typing arcade: one shared typing engine powering several game modes, each
training a different skill. Make music by typing, survive zombie waves, race bots, build
towers, type real code, or just relax in Zen mode.

## Game modes (v1)

| Mode | Keycap color | One-line pitch |
|---|---|---|
| Word Rain | Blue | Words fall; type them before they land. Speed rises with score. |
| Type Beats | Orange | Every keystroke is a note. Type on the beat or compose freely. |
| Zombie Survival | Lime | Zombies carry words. Type to shoot. Survive the waves. |
| Typing Racer | Blue | Your WPM is your car's speed. Race against bots. |
| Code Typer | Mint | Type real code snippets with brackets and symbols. |
| Word Builder Tower | Orange | Each correct word stacks a block. Typos make it wobble. |
| Story Mode | Mint | Type your way through an interactive adventure. |
| Zen Mode | Lime | No timer, no score. Calm text, soft sounds. |

## Documentation

| Document | What's inside |
|---|---|
| [docs/SCOPE.md](docs/SCOPE.md) | What v1 includes, what it doesn't, and why |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Functional and non-functional requirements |
| [docs/GAME_MODES.md](docs/GAME_MODES.md) | Rules, scoring, and difficulty for each mode |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tech stack, modules, data flow, folder structure |
| [docs/DESIGN_PATTERNS.md](docs/DESIGN_PATTERNS.md) | Code patterns used and where |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Colors, type, keycap components, motion, sound |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Milestones from first commit to v1.0 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to set up, code style, adding a mode |
| [CREDITS.md](CREDITS.md) | Every asset and its license |

## Quick start

```bash
git clone https://github.com/<your-username>/typeverse.git
cd typeverse
npm install
npm run dev              # http://localhost:5173
npm run test             # unit tests (Vitest)
npm run coverage         # engine + scoring coverage, must stay above 80%
npm run e2e              # Playwright smoke tests, one per mode
npm run validate:content # check every JSON pack against its Zod schema
npm run lint
npm run build            # production build in /dist
```

Dev-only route: `#/kit` shows every UI component in light and dark themes.

## Status

All eight modes are playable, progress is saved locally, and the app builds to a PWA.

| Area | State |
|---|---|
| Engine, metrics, scoring | Done, 95% line coverage |
| 8 game modes | Playable end to end with a result screen |
| Progress, stats, settings, export/import | Done |
| Onboarding typing check | Done |
| Offline / installable | Service worker and manifest built by `vite-plugin-pwa` |
| Language packs | English only; Urdu and Arabic are still open (RTL support is wired up) |
| Fonts | Falling back to system stacks until the OFL files are vendored, see [CREDITS.md](CREDITS.md) |

Initial JS is about 39 KB gzipped (budget: 150 KB); each mode is a 1-3 KB lazy chunk.

## Principles

1. **Free forever.** No ads, no paywalls, no premium tier.
2. **Private by default.** No accounts, no tracking. Progress stays in your browser.
3. **Works everywhere.** Low-end laptops, slow connections, offline after first visit.
4. **Accessible.** Keyboard-only, screen-reader-friendly menus, reduced-motion support, colorblind-safe.
5. **Easy to extend.** Adding a new mode or language pack should take a contributor one afternoon.

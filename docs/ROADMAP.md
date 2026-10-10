# Roadmap

Estimates assume one developer working part-time (~15 hours/week). Each milestone ends with a
deploy to `typeverse.aboubakarisar.tech`.

## M0 — Foundation (week 1–2)

- [x] Repo, MIT license, Vite + TypeScript + Preact setup, ESLint, Prettier
- [x] GitHub Actions: lint, test, build, deploy to Pages; custom subdomain + HTTPS
- [x] `tokens.css`, `Keycap`, `KeycapButton`, `Panel`, `SectionLabel`, `StatChip`, `Meter`
- [ ] Fonts self-hosted (OFL files not vendored yet, see CREDITS.md)
- [x] Logo SVG and app icons exported
- [x] Empty Arcade screen with 8 locked mode tiles

## M1 — Core engine + Word Rain (week 3–5)

- [x] `InputManager` (incl. IME), `TypingEngine`, `MetricsCalculator`, `EventBus`, `GameLoop`, `Rng`
- [x] Unit tests for engine and metrics (≥ 80% coverage)
- [x] Word Rain fully playable: lives, speed curve, special words
- [x] Pause menu, Result screen
- [x] English language pack v1
- **Release v0.1 — first playable**

## M2 — Persistence + progression (week 6–7)

- [x] `StorageService` with IndexedDB, versioning, export/import
- [x] XP, levels, best scores, session history
- [x] Stats screen with WPM chart and keyboard heatmap
- [x] Settings screen; light/dark theme; reduced motion; font scale
- **Release v0.2**

## M3 — Type Beats + Zen (week 8–11)

- [x] `AudioService`, sound packs (Classic, Typewriter)
- [x] Type Beats Free mode (scales, layers, tempo from speed)
- [x] Type Beats Rhythm mode with 3 original/CC charts
- [x] Zen Mode with ripples and ambient track
- [x] `.wav` export from Free mode
- **Release v0.3**

## M4 — Zombie Survival + Typing Racer (week 12–15)

- [x] Object pools and shared sprite renderer
- [x] Zombie Survival: waves, upgrades, bosses, kid-mode slimes
- [x] Typing Racer: bots, skid, ghost race
- [ ] Typing Racer: unlockable cars and tracks
- **Release v0.4**

## M5 — Code Typer + Word Tower + Story (week 16–20)

- [x] Code Typer with JS, Python, HTML/CSS packs and symbol stats
- [x] Word Builder Tower with sway physics and floors
- [x] Story Mode engine (JSON graph) + first 5-chapter story
- **Release v0.5 — all 8 modes**

## M6 — Polish + launch (week 21–24)

- [x] PWA: offline and installable
- [x] Onboarding typing check
- [ ] Urdu and Arabic language packs, RTL review
- [ ] Accessibility audit (axe + manual screen reader pass)
- [ ] Performance pass on a low-end laptop; Lighthouse ≥ 90
- [x] Playwright smoke tests for every mode
- [x] Landing section, CREDITS.md, CONTRIBUTING.md, good-first-issue labels
- **Release v1.0 🚀** — announce on Reddit (r/typing, r/webgames), Hacker News "Show HN", itch.io, Product Hunt

## Build status (M0-M5 complete)

Everything through M5 is implemented and green: `lint`, 56 unit tests, 14 Playwright smoke
tests, and a production build. What is left for M6:

- Vendor the OFL font files (see CREDITS.md) and add `@font-face` rules
- Urdu and Arabic language packs plus an RTL review
- Accessibility audit (axe plus a manual screen-reader pass)
- Performance pass on a low-end laptop and a Lighthouse run
- Unlockable cars and tracks for Typing Racer (base race is done)

## After v1.0

- v1.1: Daily Challenge (seeded, local results, shareable emoji summary)
- v1.2: More language packs from the community; more sound packs
- v1.3: Custom text practice (paste your own text)
- v2.0: Multiplayer duel and live races, optional accounts, leaderboards

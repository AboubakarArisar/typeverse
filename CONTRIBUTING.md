# Contributing to Typeverse

Thanks for helping make typing fun and free for everyone.

## Ways to contribute

- **Code:** fix bugs, build features, add a game mode
- **Content:** word lists, language packs, code snippets, stories, rhythm charts
- **Art and sound:** CC0/CC-BY sound packs, illustrations in the keycap style
- **Testing:** play on different devices and keyboards, report bugs
- **Translation:** UI strings into your language

## Setup

```bash
npm install
npm run dev      # start dev server
npm run test     # unit tests (Vitest)
npm run e2e      # end-to-end tests (Playwright)
npm run lint
```

## Workflow

1. Find or open an issue. Comment that you're working on it.
2. Fork, then create a branch: `feat/word-rain-powerups`, `fix/ime-urdu`, `content/pack-es`.
3. Keep PRs small and focused. Reference requirement IDs (e.g. `FR-WR-01`).
4. Make sure `lint`, `test`, and `build` pass.
5. Use [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `docs:`, `content:`.

## Code rules

- TypeScript strict; no `any` without a comment explaining why.
- Follow [docs/DESIGN_PATTERNS.md](docs/DESIGN_PATTERNS.md): modes use the `GameMode` interface,
  no allocation in `update()`, talk to other systems through the event bus.
- Follow [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md): tokens only, ink text on keycaps,
  keyboard accessible, reduced-motion support.
- All UI strings through `t('key')`.

## Adding a new game mode

1. Copy `src/modes/_template/` to `src/modes/<your-mode>/`.
2. Fill in `meta.ts` (id, name, keycap color, description, unlock level).
3. Implement `create()` returning a `GameMode`.
4. Register it in `src/modes/registry.ts` with a lazy `import()`.
5. Add rules to `docs/GAME_MODES.md`.
6. Add a unit test for scoring and a Playwright test that plays for 10 seconds.

## Adding a language pack

1. Copy `content/languages/en.json` to `content/languages/<code>.json`.
2. Set `dir` (`ltr` or `rtl`) and `font` if the script needs one (Noto fonts preferred).
3. Provide word lists for `kid`, `easy`, `normal`, `hard` (at least 300 words each) and 50+ sentences.
4. Run `npm run validate:content`.
5. Only original or public-domain text, please.

## Asset licensing

Only add assets you made yourself or that are CC0, CC-BY, or OFL. Record source and license in
`CREDITS.md`. Never add copyrighted song lyrics, book passages, or game assets.

## Code of conduct

Be kind, assume good intent, and help newcomers. Harassment of any kind isn't tolerated.

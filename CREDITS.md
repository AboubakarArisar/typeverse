# Credits

Everything shipped with Typeverse is original or openly licensed. If you add an asset, add a
row here in the same PR.

## Code

| Item | License | Source |
|---|---|---|
| Typeverse source | MIT | this repository |
| Preact, @preact/signals | MIT | https://preactjs.com |
| idb-keyval | Apache-2.0 | https://github.com/jakearchibald/idb-keyval |
| Zod | MIT | https://zod.dev |
| uPlot | MIT | https://github.com/leeoniya/uPlot |
| Vite, vite-plugin-pwa (Workbox) | MIT | https://vitejs.dev |
| Vitest, Playwright, ESLint, Prettier, TypeScript | MIT / Apache-2.0 | dev dependencies only |

## Art

| Item | License | Author |
|---|---|---|
| Typeverse logo, keycap marks, app icons (`public/icons/`, `favicon.ico`, `apple-touch-icon.png`) | CC-BY-4.0 | Aboubakar Isar |
| In-game illustrations (keycap blocks, cars, walkers) | CC-BY-4.0 | drawn in code with Canvas 2D, Typeverse contributors |

## Sound

| Item | License | Author |
|---|---|---|
| All sound packs (Classic, Typewriter, Bubble, Synth) | CC0-1.0 | synthesized at runtime with the Web Audio API; no samples are shipped |
| Zen and Type Beats ambience | CC0-1.0 | generated from oscillators at runtime |

## Text content

| Item | License | Author |
|---|---|---|
| `content/languages/en.json` word lists, sentences and Zen lines | CC0-1.0 | written for Typeverse |
| `content/stories/the-lost-key.json` | CC0-1.0 | written for Typeverse |
| `content/code/*.json` snippets | MIT | written for Typeverse |
| `content/charts/*.json` rhythm charts | CC0-1.0 | written for Typeverse |

## Fonts

Space Grotesk and JetBrains Mono are both SIL Open Font License 1.1. **They are not yet vendored
in this repository** — the app currently falls back to the system stacks declared in
`tokens.css`. To self-host them (required before launch, NFR-08):

1. Download the OFL builds of [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk)
   and [JetBrains Mono](https://www.jetbrains.com/lp/mono/).
2. Put the `.woff2` files in `public/fonts/`.
3. Add `@font-face` rules with `font-display: swap` to `src/ui/styles/app.css`.
4. Copy each font's `OFL.txt` to `public/fonts/` and add a row to this table.

| Font | License | Source |
|---|---|---|
| Space Grotesk | OFL-1.1 | pending vendoring (see above) |
| JetBrains Mono | OFL-1.1 | pending vendoring (see above) |
| Noto Nastaliq Urdu / Noto Naskh Arabic | OFL-1.1 | loaded only with the Urdu / Arabic packs (not yet shipped) |

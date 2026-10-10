# Scope

## Vision

A free, open-source typing arcade where people improve their typing by playing, not by
drilling. One engine, many modes, zero cost to the player.

## Target users

| User | Need | What Typeverse gives them |
|---|---|---|
| Students (10–18) | Learn typing without boredom | Games, levels, kid-friendly word lists |
| Office workers | Get faster at real-world typing | Stats, weak-key tracking, Zen practice |
| Developers | Type symbols and code faster | Code Typer mode |
| Teachers | A free tool for computer class | No sign-up, works on school PCs, kid mode |
| Non-English speakers | Practice in their own language | Language packs, including RTL scripts |

## In scope for v1.0

**Game modes (8):** Word Rain, Type Beats, Zombie Survival, Typing Racer (vs bots), Code Typer,
Word Builder Tower, Story Mode, Zen Mode. Details in [GAME_MODES.md](GAME_MODES.md).

**Shared platform features:**
- Core typing engine shared by all modes (input, accuracy, WPM, combos)
- Main menu ("Arcade") with a keycap tile per mode
- Per-player stats: WPM history, accuracy, weakest keys, keyboard heatmap
- XP and levels; unlockable themes and key-sound packs
- Settings: volume, sound pack, theme (light/dark), reduced motion, font size, kid mode
- Language packs: English at launch; Urdu and Arabic (RTL) as first community packs
- Local persistence only (IndexedDB); export/import save as a JSON file
- Installable PWA, works offline after first load
- Responsive layout for desktop and laptop; tablets with a physical keyboard

## Out of scope for v1.0

| Feature | Why not now | When |
|---|---|---|
| Multiplayer duel / live races | Needs servers, matchmaking, anti-cheat | v2 |
| Accounts and cloud sync | Needs backend and privacy work | v2 |
| Global leaderboards | Needs backend and anti-cheat | v2 |
| Daily Challenge with global ranking | Depends on leaderboards | v1.x (local-only version possible) |
| Touch-screen typing (phones) | Game feel depends on physical keys | Later, if requested |
| User-made level editor | Nice to have, large effort | v2 |
| Monetization of any kind | Against project principles | Never |

## Success criteria for v1.0

- All 8 modes playable end to end, with a result screen
- First load under 2 seconds on a typical 4G connection; 60 fps on a 5-year-old laptop
- Lighthouse score ≥ 90 for Performance, Accessibility, Best Practices
- Zero network requests after load (no analytics, no trackers)
- At least 2 language packs besides English
- A new contributor can add a mode by following CONTRIBUTING.md

## Constraints

- **Budget:** $0. Static hosting only (GitHub Pages or Cloudflare Pages) on `typeverse.aboubakarisar.tech`.
- **Team:** one main developer plus open-source contributors.
- **Assets:** only original or openly licensed (CC0 / CC-BY / OFL) sounds, fonts, and art.
- **Content:** word lists and story text must be original or public domain.

## Assumptions

- Players have a physical keyboard.
- Modern evergreen browsers (Chrome, Edge, Firefox, Safari, last 2 versions).
- Audio may be blocked until first user interaction; the game must handle this.

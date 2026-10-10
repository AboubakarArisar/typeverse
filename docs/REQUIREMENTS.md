# Requirements

IDs are used in issues and PRs (e.g. "Implements FR-ENG-03"). Priority: **M** = must have for
v1.0, **S** = should have, **C** = could have.

## 1. Functional requirements

### 1.1 Typing engine (shared by all modes)

| ID | Requirement | Priority |
|---|---|---|
| FR-ENG-01 | Capture keystrokes via `keydown`/`beforeinput` without a visible text field, including IME and composed characters (Urdu, Arabic, accented letters). | M |
| FR-ENG-02 | Match typed characters against one or more active targets (a word, a sentence, a code line). | M |
| FR-ENG-03 | When several targets are on screen, lock onto the target whose first letter matches; Escape releases the lock. | M |
| FR-ENG-04 | Calculate live WPM (5 chars = 1 word), raw WPM, accuracy %, and errors per key. | M |
| FR-ENG-05 | Track combo streaks (consecutive correct words) and expose a combo multiplier. | M |
| FR-ENG-06 | Emit events (`charCorrect`, `charWrong`, `wordComplete`, `targetLocked`, `sessionEnd`) for modes, audio, and stats to react to. | M |
| FR-ENG-07 | Support configurable backspace behavior per mode (allowed, disallowed, costs points). | S |
| FR-ENG-08 | Normalize Unicode (NFC) and optionally ignore case or diacritics per language pack. | S |

### 1.2 Arcade (menus and navigation)

| ID | Requirement | Priority |
|---|---|---|
| FR-UI-01 | Main menu shows one keycap tile per mode with name, color, best score, and lock state. | M |
| FR-UI-02 | Every screen is fully usable with keyboard alone (Tab, Enter, arrows, Escape). | M |
| FR-UI-03 | Pause menu (Escape) in every mode: resume, restart, settings, quit. | M |
| FR-UI-04 | Result screen after each session: score, WPM, accuracy, XP earned, weakest keys, play again. | M |
| FR-UI-05 | Settings screen: master/music/SFX volume, sound pack, theme, reduced motion, font scale, language, kid mode. | M |
| FR-UI-06 | First-run onboarding: 20-second typing check to set a starting difficulty. | S |

### 1.3 Progression and stats

| ID | Requirement | Priority |
|---|---|---|
| FR-PRG-01 | Award XP per session based on score, accuracy, and duration; level up at thresholds. | M |
| FR-PRG-02 | Unlock themes and key-sound packs at given levels. | S |
| FR-PRG-03 | Store per-mode best scores and last 100 sessions. | M |
| FR-PRG-04 | Stats page with WPM-over-time chart, accuracy trend, and keyboard heatmap of errors. | M |
| FR-PRG-05 | Export and import all progress as a JSON file. | M |
| FR-PRG-06 | "Reset all data" with confirmation. | M |

### 1.4 Game modes

Each mode has full rules in [GAME_MODES.md](GAME_MODES.md). Minimum requirements:

| ID | Mode | Requirement | Priority |
|---|---|---|---|
| FR-WR-01 | Word Rain | Falling words; speed and spawn rate increase with score; 3 lives; power-up words. | M |
| FR-TB-01 | Type Beats | Rhythm mode (letters on a timeline, judged Perfect/Good/Miss) and Free mode (keystrokes play notes in a scale). | M |
| FR-TB-02 | Type Beats | Export a Free-mode session as a `.wav` or `.mid` file. | S |
| FR-ZS-01 | Zombie Survival | Waves of word-carrying zombies from several directions; upgrades between waves; boss every 5 waves. | M |
| FR-TR-01 | Typing Racer | Race 3 bots with set WPM profiles over a passage; typos cause a skid. | M |
| FR-CT-01 | Code Typer | Snippets in JavaScript, Python, HTML/CSS; auto-indent skipped; symbols counted separately in stats. | M |
| FR-WB-01 | Word Builder Tower | Correct words add blocks; errors add wobble; tower falls past a wobble limit. | M |
| FR-SM-01 | Story Mode | Chapters of typed passages with branching choices; accuracy affects outcomes. | M |
| FR-ZM-01 | Zen Mode | Endless calm text, no score shown, ambient music, keystroke ripples. | M |

### 1.5 Content

| ID | Requirement | Priority |
|---|---|---|
| FR-CNT-01 | Language packs as JSON: word lists by difficulty, sentences, Zen quotes, metadata (direction, script). | M |
| FR-CNT-02 | Kid mode filters to a kid-safe word list and enlarges text. | M |
| FR-CNT-03 | Profanity and sensitive-word filter applied to all generated word sequences. | M |
| FR-CNT-04 | Code snippet packs per programming language, with licenses noted. | M |

## 2. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | 60 fps during gameplay on a mid-range 2019 laptop; input-to-feedback under 16 ms. |
| NFR-02 | Performance | Initial JS bundle ≤ 150 KB gzipped; each mode lazy-loaded; audio samples loaded per mode. |
| NFR-03 | Load time | First Contentful Paint < 1.5 s and interactive < 2.5 s on 4G. |
| NFR-04 | Offline | Fully playable offline after first visit (service worker caches app and installed packs). |
| NFR-05 | Accessibility | WCAG 2.2 AA for all menus: contrast, focus rings, labels, screen-reader announcements of results. |
| NFR-06 | Accessibility | `prefers-reduced-motion` honored: no shake, no parallax, simpler animations. |
| NFR-07 | Accessibility | No information carried by color alone (keycap colors always paired with a label or icon). |
| NFR-08 | Privacy | No cookies, no analytics, no third-party requests at runtime. Fonts self-hosted. |
| NFR-09 | Compatibility | Last 2 versions of Chrome, Edge, Firefox, Safari on Windows, macOS, Linux, ChromeOS. |
| NFR-10 | i18n | All UI strings externalized; RTL layout supported via `dir="rtl"` and logical CSS properties. |
| NFR-11 | Reliability | Saves written after each session and on `visibilitychange`; corrupted saves fall back safely. |
| NFR-12 | Maintainability | TypeScript strict mode; ≥ 80% unit-test coverage on the engine and scoring. |
| NFR-13 | Security | Strict Content-Security-Policy; imported save files validated against a schema before use. |
| NFR-14 | Licensing | All code MIT; all assets CC0/CC-BY/OFL with attribution in `CREDITS.md`. |

## 3. Acceptance criteria (examples)

**FR-ENG-03 target locking**
- Given words "cat" and "car" are on screen, when I type "c", then the nearest-to-ground word is locked.
- When I then type "r" and the locked word is "cat", the keystroke counts as an error and the lock stays.
- When I press Escape, the lock is released and the partial progress is cleared.

**FR-WR-01 Word Rain difficulty**
- Fall speed starts at the level chosen in onboarding and increases by 5% every 500 points, capped at 3×.
- A word that reaches the ground costs one life; at 0 lives the session ends and the result screen opens.

**NFR-04 offline**
- After one complete visit, with the network disabled, the app loads and any previously played mode starts.

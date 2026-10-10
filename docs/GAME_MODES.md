# Game Modes

Every mode is built on the shared typing engine and follows the same lifecycle:
**Intro → Countdown → Playing ⇄ Paused → Result**. Each mode has a keycap color from the
logo, used for its menu tile, accents, and result screen.

## Shared scoring rules

- **Base points:** 10 per character of a completed word.
- **Combo multiplier:** ×1 → ×2 at 10 combo → ×3 at 25 → ×4 at 50. Any error resets to ×1.
- **Accuracy bonus at session end:** score × (accuracy − 0.9) × 2, only when accuracy > 90%.
- **XP:** `round(score / 50) + minutes played × 10`, halved in practice sessions.

## 1. Word Rain — Blue `#5B8CFF`

**Goal:** Stop falling words from reaching the ground.

- Words spawn at the top at random horizontal positions and fall straight down.
- Typing the first letter locks a word (it gets a blue ring); finishing it explodes it.
- 3 lives. A word hitting the ground costs one life.
- **Difficulty curve:** speed +5% and spawn interval −4% every 500 points; word length grows with level.
- **Special words:**
  - Gold: freezes all words for 3 s
  - Red: clears the screen
  - Green: restores one life (max 3)
  - Boss sentence: falls slowly, takes several words to destroy, worth 5× points
- **Ends when:** lives reach 0.

## 2. Type Beats — Orange `#FF8A3D`

**Goal:** Make music with your keystrokes.

**Rhythm sub-mode**
- Letters scroll from right to left toward a hit line, in time with a backing track.
- Judgement windows: Perfect ±40 ms, Good ±90 ms, Miss beyond that.
- Each song is a JSON "chart": BPM, offset, and a list of `{ beat, char }` notes.
- Charts written for original or CC-licensed tracks only.

**Free sub-mode**
- Each correct keystroke plays a note in the selected scale (pentatonic by default, so it always sounds good).
- Each completed word adds or advances a layer: drums → bass → chords → melody.
- Typing speed sets tempo within a range (80–140 BPM).
- Save the result as `.wav` (and `.mid` as a stretch goal).

**Ends when:** song ends (Rhythm) or player stops (Free).

## 3. Zombie Survival — Lime `#C6F432`

**Goal:** Survive waves of zombies.

- Player sits in the center; zombies walk in from all sides, each labelled with a word.
- Completing a word fires at that zombie. Bigger zombies have longer words.
- Waves get bigger and faster. Between waves the player picks 1 of 3 upgrades:
  - Shotgun: completing a word also damages zombies nearby
  - Slow field: zombies in a radius move 30% slower
  - Barricade: absorbs one hit
- Every 5th wave is a boss with a full sentence split into chunks.
- Art style: cartoony and non-gory (kid mode replaces zombies with friendly slimes).
- **Ends when:** a zombie reaches the player without a barricade.

## 4. Typing Racer — Blue `#5B8CFF`

**Goal:** Finish the passage before the bots.

- A passage of 30–80 words is shown; the car moves proportionally to correct characters.
- 3 bots with WPM profiles (e.g. 30, 50, 70) plus small random variance so races feel alive.
- A typo makes the car skid for 300 ms; the player must fix the error to continue.
- Cars, tracks, and colors unlock with level.
- Ghost race: race your own best run on the same passage.
- **Ends when:** player finishes. Result shows place, WPM, accuracy.

## 5. Code Typer — Mint `#7CF5C8`

**Goal:** Type real code accurately.

- Snippets in JavaScript, Python, HTML/CSS (more via packs), shown with syntax highlighting.
- Leading indentation is auto-filled; Enter moves to the next line.
- Stats split letters vs symbols (`{ } ( ) [ ] ; : = < > " '`) to show where you're slow.
- Difficulty: Beginner (short lines), Intermediate (functions), Advanced (dense one-liners).
- Snippets must be original or from permissively licensed projects, with the license noted.
- **Ends when:** snippet completed or time limit (optional) reached.

## 6. Word Builder Tower — Orange `#FF8A3D`

**Goal:** Build the tallest tower.

- Each correct word drops a block on top of the tower; block width matches word length.
- Each error adds wobble; wobble slowly decays when typing cleanly.
- If wobble passes the limit, the tower topples and the session ends.
- Every 10 blocks is a "floor", which saves progress and grants bonus points.
- Simple 2D physics feel (spring-damped sway); not a full physics engine.
- **Ends when:** tower falls or player banks the score.

## 7. Story Mode — Mint `#7CF5C8`

**Goal:** Type your way through an adventure.

- Story is split into chapters; each chapter is a list of typed passages and choices.
- Choices are typed: "Type `LEFT` to take the cave, `RIGHT` to take the river."
- Accuracy and speed on a passage decide the outcome of key moments (e.g. escaping a chase).
- Stories stored as JSON graphs (nodes + edges) so writers can add chapters without code.
- First story: an original short adventure (5 chapters, ~15 minutes).
- **Ends when:** chapter is finished. Progress saved per chapter.

## 8. Zen Mode — Lime `#C6F432`

**Goal:** Relax and practice without pressure.

- Endless calm passages (quotes, short poems in the public domain, nature descriptions).
- No timer, no score on screen. Stats are still recorded quietly.
- Each keystroke plays a soft tone and draws a ripple on a calm background.
- Optional ambient music; optional "focus" setting that hides everything but the current line.
- **Ends when:** player presses Escape → shows a gentle summary.

## Difficulty presets

| Preset | Starting speed | Word length | Backspace |
|---|---|---|---|
| Kid | Very slow | 2–5 | Free |
| Easy | Slow | 3–6 | Free |
| Normal | Medium | 4–8 | Free |
| Hard | Fast | 5–12 | Costs 5 points |
| Insane | Very fast | 6–15, symbols | Disabled |

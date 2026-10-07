# The Referee’s Final Call

A small, playable good-luck gift from **Matta (Gon Satha)** to **Chooty Bole**, made before her four-day All-Island Netball competition.

It looks like a game. It plays like a game. Then the referee steps off the court.

**Flow (about 3–7 minutes):**
official match notice → referee’s briefing → **Referee Check** (puzzle) → **The Four-Day Run** (puzzle) → **The Final Match** (netball mini-game) → final whistle → confidential referee report → *oya mala anayak 😌🫂* → the envelope → the letter → the poem → final referee decision → approval stamp → full time.

---

## Open it

| How | What to do |
| --- | --- |
| **Just look** | Unzip and double-click `index.html`. Everything works offline, including fonts. |
| **Local server** | `npm start`, then open <http://localhost:5173>. Needs Node 18+ and nothing else; there are no dependencies to install. |
| **Netlify** | Drag the folder onto <https://app.netlify.com/drop>. |
| **Vercel** | `npx vercel` in the folder, or import the repo. Framework: *Other*, no build command, output directory `.` |
| **GitHub Pages** | Settings → Pages → *Deploy from branch* → root (`/`). `.nojekyll` is already included. |
| **Cloudflare Pages** | Connect the repo, leave the build command empty, output directory `/`. |

It is a plain static site (HTML, CSS and JavaScript, no framework and no build step), so it runs on any static host.

> **Privacy:** the letter ships inside the site’s source (`data/letter.js`). Anyone with the URL can read it, and anyone who can see the repository can read it there. The page sets `noindex`, but keep the link (and ideally the repo) private.

---

## Change things

### The letter, poem and closing lines → `data/letter.js`
Plain text inside backticks. The small formatting rules are listed at the top of the file:

```
Blank line         new paragraph
### Heading        small section heading
> text             highlighted line
^ text             centred italic line
---                ornament divider
*italic* **bold**
::: days           the four-day cards ("DAY ONE | text" per line), closed by :::
```

The poem’s stanzas are separated by blank lines. The final decision, the P.S. and the ending card are fields in the same file.

*(The brief suggested `data/letter.md`. The letter lives in a `.js` file instead so the site still works when `index.html` is opened straight from disk, where browsers refuse to `fetch()` local files.)*

### Game difficulty and pacing → `src/config.js`
Match length (`match.seconds`, default 90), goals to win (`match.targetGoals`, 5), extra time, player/defender speed, how open you must be to receive a pass, the size of the green shooting zone, the possession clock, the four-day puzzle numbers, and more. Each value has a comment.

### Puzzle wording → `src/puzzles.js`
Trait cards and the referee’s rejection lines (`TRAITS`), and the four days and their commentary (`DAYS`, `LINES`).

### Screen copy → `index.html`
The intro notice, briefing, report observations, victory lines and the *oya mala anayak* screen.

---

## How it plays

**Referee Check:** tap (or drag) the six real traits onto the captain profile. Decoys get rejected with a referee comment.

**The Four-Day Run:** pick Push / Attack / Defend / Recover for each day. You need 7 momentum without ever running out of energy, which is only possible with one well-timed recovery. Recovering when you’re already fresh wastes it.

**The Final Match:** you are **GS** (Goal Shooter).
1. **Move** to lose the referee’s defender (GD). She reacts a fraction late, so sharp cuts and leads towards the ball get you free. A green **OPEN** ring tells you when you are free.
2. **Pass** to call for the ball. As in real netball, you can’t run with it, and there is a possession clock.
3. Inside the circle, **hold Shoot** and let go when the marker is in the **green** zone. The zone shifts with distance and shrinks a little when the defender’s arms are up.

| | Phone / tablet | Keyboard | Mouse |
| --- | --- | --- | --- |
| Move | left thumb pad (it appears where you touch) | WASD / arrows | — |
| Pass | PASS button | E or K | click the court |
| Shoot | hold SHOOT, release | hold Space or J | hold on the court |
| Pause | ❙❙ button | Esc or P | ❙❙ button |

It is built to be forgiving. If the clock runs out, the referee adds extra time and each period makes the game easier. The pause menu also has *“Ask the referee for mercy”*, which skips the match. The scoreboard always ends **05 – 03**, because the referee awards his own team whatever goals it’s short.

### Hidden extras
- Tap the **whistle** (top left, or on the final screen).
- Tap the **referee badge** on the briefing card.
- Tap the **scoreboard** three times quickly.
- **Press and hold the trophy** on the victory screen.

---

## Built with care for
- **Phones first:** dedicated touch controls, safe-area insets, a separate landscape layout, and no hover-only interactions.
- **Performance:** under 40 KB of gzipped JavaScript including the letter, no libraries, a single canvas, and sounds synthesised with Web Audio (no audio files). Fonts are self-hosted subsets.
- **Accessibility:** real buttons everywhere, visible focus, ARIA live regions for referee lines and scores, full keyboard play, and `prefers-reduced-motion` support (no motion, but the complete experience). The letter is never hidden behind an animation.
- **Sound:** nothing plays until the first tap. There is a mute button throughout, and the crowd ambience fades out completely for the letter.
- **Progress:** saved in `localStorage`. After a refresh, the opening screen offers to continue (once unlocked, the letter is always one tap away), or to start again from the first whistle.
- **Dark mode:** follows the system setting, or use the toggle in the top bar.

---

## Test it

```bash
npm i -D playwright && npx playwright install chromium   # one-time
npm test
```

`tests/e2e.mjs` plays the whole thing in Chromium as an iPhone, using touch. It solves both puzzles (including a wrong answer and a drag-and-drop), and a bot wins the netball match through the on-screen joystick and buttons. It then checks the victory score, the report, the envelope, the letter (word count, poem, stamp, ending) and reload behaviour. It also tests keyboard controls, extra time, pause/mercy and reduced motion, and checks for horizontal overflow, off-screen elements and tiny text at nine viewport sizes, from 320 px phones to 1440 px desktops. Set `SHOTS=some/dir` to save screenshots.

Handy while editing:
- `?debug&scene=letter` jumps straight to a scene: `intro`, `welcome`, `check`, `run`, `match`, `report`, `oya`, `envelope` or `letter`.
- `?speed=5` makes the scripted pauses five times faster.
- To reset saved progress, use “Start again from the first whistle” on the opening screen, or clear site data.

---

## Files

```
index.html            all scenes (markup + icon sprite)
src/
  styles.css          design tokens, light/dark themes, every scene, motion
  config.js           tunable game & puzzle values
  audio.js            Web Audio synth: whistle, crowd, swish, rim, paper…
  fx.js               timing, typewriter, confetti, toasts, focus helpers
  puzzles.js          Referee Check + The Four-Day Run
  game.js             the netball mini-game (canvas)
  letter.js           renders the letter, poem, decision, ending
  main.js             scene flow, story beats, progress, easter eggs
data/
  letter.js           ← the letter, poem and closing lines
assets/
  fonts/              Fraunces, Inter, Caveat (woff2, SIL OFL; see OFL.txt)
  icons/favicon.svg
scripts/
  serve.mjs           zero-dependency local server (npm start)
  embed-fonts.mjs     rebuilds fonts-inline.css (fonts for file:// use)
tests/
  e2e.mjs             Playwright end-to-end checks (npm test)
```

Fonts: [Fraunces](https://github.com/undercasetype/Fraunces), [Inter](https://github.com/rsms/inter) and [Caveat](https://github.com/googlefonts/caveat), all under the SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).

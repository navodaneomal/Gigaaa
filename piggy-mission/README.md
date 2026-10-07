# 🐷🏐 Piggy’s Netball Mission

A tiny animated good-luck film for **Chooty Bole**, starring a very professional pig.
It’s made for phones: tap, swipe, hold and poke your way through it. It takes about four minutes and needs no login, no server and no letter.

**The story:** a pig asleep at night → a netball **BONK** → *“Oh… It’s today.”* → **MISSION DETECTED** → a terrible salute → suiting up → a training montage (it does not go well, then it does) → poking the pig until it gets serious → four days, four little worlds → the final match vs **THE WORLD** → the final shot in slow motion → **SWISH** → 🏆 **WINNER** → 🥇 **1st place** (the trophy wins) → a quiet moment → *You got this.* → sunglasses → *“I trained you.”* → trips over the ball.

---

## Open it

| How | What to do |
| --- | --- |
| **Just look** | Unzip and double-click `index.html`. It works offline, including fonts. |
| **Local server** | `npm start`, then open <http://localhost:5173>. Needs Node 18+ and nothing else. |
| **Netlify** | Drag this folder onto <https://app.netlify.com/drop>. |
| **Vercel** | `sh scripts/package.sh` → unzip `dist/piggys-netball-mission.zip` → `npx vercel --prod` inside it. Or import the repo with **Root Directory** `piggy-mission`, framework *Other*, no build command (`vercel.json` + `.vercelignore` included). See `DEPLOY.md`. |
| **GitHub Pages** | Settings → Pages → deploy from the branch. The film lives at `…/piggy-mission/`. `.nojekyll` is included. |
| **Cloudflare Pages** | Root directory `piggy-mission`, no build command, output directory `/`. |

It is a plain static site: HTML, CSS, JavaScript and inline SVG, with no framework, images, video or audio files.

---

## Change things

- **Every line of text** lives in **`data/messages.js`**: the mission card, the pig’s lines, the four days, the final message, everything.
- **Timing** (comedic pauses, how long lines stay up, how long a hold takes, overall speed) lives in **`data/timing.js`**. `speed: 1.2` makes the whole film 20% faster.
- **Scenes** are in `src/scenes/`, one file each. `CONTRIBUTING-SCENES.md` explains how they work.

---

## How it plays

| | |
| --- | --- |
| **Tap** | continue, pass the ball, dodge, poke the pig |
| **Swipe** | travel to the next of the four days (or tap the arrow) |
| **Hold** | charge the final shot |
| **Keyboard** | Space/Enter = tap, arrows = swipe, hold Space = hold |

Every interaction is forgiving: a short hold still works after a couple of tries, an idle viewer gets nudged along, and nothing can get stuck. If you don’t poke the pig, it pokes the story forward itself.

## Made with care for

- **Phones first:** full-screen on phones, and a framed cinematic 9:16 stage on laptops, desktops and landscape screens. Everything scales with the stage.
- **Sound:** every effect and the music is synthesised live with Web Audio, with no audio files. The music changes with the story (sleepy → playful → training → tense → match → silence → victory → warm). Nothing plays before the first tap, and the 🔊 button turns it all off.
- **Reduced motion:** with *Reduce motion* switched on, camera moves are calmer, particle bursts are smaller and transitions are simple fades. The whole story and every interaction remain.
- **Light:** inline SVG and code only, so the whole film is a few hundred KB including fonts.

---

## Test it

```bash
npm i -D playwright && npx playwright install chromium   # one-time
npm test                                                 # full end-to-end suite
npm run film -- --scene=match --device=landscape         # contact sheet of one scene
```

`tests/e2e.mjs` plays the whole film like a person would on a touch phone: real taps, holds, swipes and pokes on the pig, then *Watch again*. It runs the film on nine screen sizes, from 320 px phones to 1440 px desktops, checking that no text leaves the stage and nothing scrolls sideways. It also plays the story in reduced-motion mode and opens it straight from disk.

Handy URL switches: `?scene=match` (start at a scene), `?speed=3`, `?auto` (prompts answer themselves), `?reduced`.

---

## Files

```
index.html                 stage, HUD, gate
vercel.json                clean URLs, caching, security headers
DEPLOY.md                  how to host it (Vercel, Netlify, Pages)
data/messages.js           ← all text
data/timing.js             ← all timing
src/
  pig.js                   the pig: SVG rig, expressions, outfit, behaviours
  animations.js            film clock, easing, tweens, particles, confetti
  props.js                 ball, netball post + net, trophy, cones, crowd
  audio.js                 synthesised sound effects + music moods
  scenes.js                scene runner + toolkit (camera, captions, bubbles, prompts)
  scenes/01…11-*.js        one file per scene
  main.js                  boot, gate, sound toggle, replay
  styles.css               stage, type, prompts, HUD
assets/fonts/              Nunito + Barlow Condensed (SIL OFL, see OFL.txt)
tests/                     e2e.mjs, filmstrip.mjs
scripts/                   serve.mjs, embed-fonts.mjs, package.sh (deploy ZIP)
```

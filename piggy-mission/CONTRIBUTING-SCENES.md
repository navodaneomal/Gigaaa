# Writing a scene

The film is a sequence of scenes. Each lives in its own file in `src/scenes/` and registers itself with the runner. Read `src/scenes/01-opening.js` and `src/scenes/02-mission.js` first; they set the quality bar and show every pattern below.

## The contract

```js
(function () {
  'use strict';
  var P = window.PIGGY;
  var A = P.anim;

  P.scenes.css('myscene', '.scene-myscene .thing{...}');   // optional, injected once

  function setup(ctx) { /* build the set while the screen is covered */ }
  async function play(ctx) { /* the performance; resolve when the scene is over */ }

  P.scenes.register({ id: 'myscene', order: 30, title: 'Training', transition: 'wipe', setup: setup, play: play });
})();
```

- `transition` is how the scene **arrives**: `fade` | `iris` | `wipe` | `flash` | `cut`.
- Between scenes the runner clears every layer except the pig, resets the camera, time scale, letterbox, UI and the pig's **pose**. The pig's **outfit and sunglasses persist**, so set them explicitly in `setup()`.
- Every scene must work when started directly (`?scene=<id>`) **and** in sequence.
- Never strand the viewer. Every prompt is forgiving, and if anything throws the runner logs it and moves on. Don't rely on that, though.

## World

- The stage is **360 × 640 world units** (x right, y down) and always fully visible. Taller or wider screens see extra bleed, so backgrounds should cover roughly **x −300…660, y −300…940**. A zoomed-out camera sees more.
- A typical ground line is y ≈ 520–600. At scale 1 the pig is about 135 units tall. Keep the pig big; it is the star. Use camera close-ups.
- Layers, back to front: `ctx.layers.bg`, `mid`, `actors` (the pig), `front`, `fx` (particles, comic words).

## The pig: `ctx.pig` (see the header of `src/pig.js`)

- `place(x, y, {scale, facing})`, `pose({...}, ms, ease)`, `express(name, ms)` (neutral, sleep, oneEye, surprised, happy, joy, determined, serious, deadpan, embarrassed, tired, proud, dizzy, ow, calm, nervous, focused).
- `walkTo(x, ms, {run})`, `jump({height, armsUp})`, `hop()`, `boing()`, `wiggle()`, `celebrate()`, `fall({backward})`, `getUp()`, `sit()`, `stand()`, `badSalute()`, `thumbsUp()`, `point()`.
- `lookAt(x, y)`, `lookAtViewer()`, `setMode('idle'|'walk'|'run'|'sleep'|'none')`, `outfit(true)`, `wear('shades')`.
- `hand('R')` and `head()` return world points, for holding props and placing effects.
- Raw values live in `pig.p`, so you can tween anything: `A.tween(pig.p, {armR: 150, tilt: -8}, 300, 'outBack')`.
- More pigs (the mirror, teammates): `ctx.Pig.create(ctx.layers.actors, {buff: true})`. Destroy them yourself, or let `clear()` remove them.

Make it alive: anticipation before actions, squash and stretch, overshoot (`outBack`, `outElastic`), follow-through on ears and arms. Use comedic timing: action, a pause, a deadpan look at the camera (`lookAtViewer()` + `express('deadpan')`), then the line.

## Toolkit: `ctx`

| | |
|---|---|
| `ctx.wait(ms)` | film-time pause (all timing is cancellable; always `await` through ctx/A) |
| `ctx.caption(text, {style, pos, hold, stay, enter, y, className})` | styles `title` `big` `line` `soft` `hud` `label`; positions `top` `upper` `center` `lower` `bottom`; `stay:true` keeps it until `.hide()` |
| `ctx.say(text, {hold, stay, thought})` | speech/thought bubble that follows the pig's head |
| `ctx.tap({label, target})` | waits for a tap (anywhere, `'pig'`, or an element). Space/Enter also work |
| `ctx.hold({label, icon, onProgress})` | hold-to-do, forgiving after `T.holdForgiveAfter` short presses |
| `ctx.swipe({label})` | swipe left/right, arrow keys, or the arrow button |
| `ctx.onPigTap(fn)` | call `fn` on every tap on the pig; returns `stop()` |
| `ctx.camera.to({x, y, zoom, rot}, ms, ease)`, `.shake(px, ms)`, `.reset()` | damped automatically for reduced motion |
| `ctx.curtain(kind, cover)` | cover/uncover mid-scene for a cut to another location |
| `ctx.flash(color)`, `ctx.letterbox(on)`, `ctx.slowmo(k, rampMs)` | cinematic tools (slow motion scales all film time) |
| `ctx.backdrop(top, bottom)`, `ctx.art(svgMarkup, {layer, depth})` | backgrounds; `depth < 1` adds parallax |
| `ctx.props.ball / post / trophy / cone / crowd` | see `src/props.js` |
| `ctx.fx.puff / sparkle / zzz / sweat / speedLine / impact / confetti` | particles in world coordinates |
| `ctx.boom(text, x, y, {size, rot, color})` | comic-book sound word |
| `ctx.music(mood)` | `sleep` `playful` `training` `tense` `match` `victory` `warm` `none` |
| `ctx.sfx(name)` | tap pop bonk boing slideUp slideDown snore bounce footstep thud whoosh swish whistle ding sparkle powerUp scan blip heartbeat drumroll cheer gasp zip fanfare |
| `ctx.ambience('room'|'crowd', level)` | background beds |
| `ctx.loop(fn)`, `ctx.every(ms, fn)` | per-frame/periodic work, auto-stopped when the scene ends |
| `ctx.panel(html, className)` | HTML in the UI layer (scoreboards…), removed on clear |
| `ctx.reduced` | true in reduced-motion mode: fewer particles, no big camera moves; keep the story and every interaction |

All text comes from `ctx.M` (`data/messages.js`), and timing comes from `ctx.T.<scene>` (`data/timing.js`) merged over local defaults.

## Style

Premium, soft, cinematic, cute, sporty. Flat vector shapes with soft gradients and rounded corners. Light sources get radial glows, and backgrounds are a little desaturated so the pig pops. Palette: night navy `#0b1020`/`#1d2a66`, pig pink `#f7a8bd`, deep pink `#e66f92`, gold `#ffcf4d`, mint `#5fd3b3`, sky `#7fb7ff`, cream `#fff6e9`. Avoid SVG filters (blur and drop-shadow are slow on phones), images, emoji used as artwork, and walls of text. Keep each scene to a few hundred SVG nodes.

## Test

```bash
node tests/filmstrip.mjs --scene=<id> --frames=16 --every=700                  # iPhone 13
node tests/filmstrip.mjs --scene=<id> --device=desktop
node tests/filmstrip.mjs --scene=<id> --device=landscape
node tests/filmstrip.mjs --scene=<id> --device=se --query="&reduced"
```

Each run writes a contact sheet to `tests/out/` and prints console errors. `?auto` (added automatically) answers prompts after about 0.4 s. In a normal browser use `index.html?scene=<id>`.

/*
 * Scene 6: The final match vs THE WORLD. An interactive sports sequence:
 * run on → crowd roars → receive → TAP TO PASS → TAP TO DODGE → drive & jump
 * into shooting position. Also defines PIGGY.matchKit (arena, globe defenders,
 * scoreboard), reused by scene 7 (the final shot).
 */
(function () {
  'use strict';
  var P = window.PIGGY;
  var A = P.anim;

  var GROUND = 560;
  var POST_X = 300; // pole; the ring hangs 22 units left of it


  P.scenes.css(
    'match',
    [
      '.mk-board{left:50%;top:calc(var(--u)*46 + var(--safe-top));transform:translate(-50%,calc(-100% - var(--u)*60 - var(--safe-top)));opacity:0;',
      'transition:transform .55s cubic-bezier(.2,1.4,.4,1),opacity .3s ease,top .6s cubic-bezier(.22,1,.36,1);',
      'display:flex;flex-direction:column;align-items:center;gap:calc(var(--u)*4);min-width:calc(var(--u)*270)}',
      '.mk-board.is-in{transform:translate(-50%,0);opacity:1}',
      // cinematic bars (slow motion) would cover the board: drop it just below the top bar
      '.stage.is-letterbox .mk-board{top:calc(10% + var(--u)*6)}',
      '.mk-board__title{padding:calc(var(--u)*3) calc(var(--u)*12);border-radius:calc(var(--u)*6) calc(var(--u)*6) 0 0;background:#e66f92;color:#fff;',
      'font:italic 800 max(11px,calc(var(--u)*13))/1.2 var(--font-sport);letter-spacing:.2em;text-transform:uppercase}',
      '.mk-board__row{display:flex;align-items:stretch;border-radius:calc(var(--u)*10);overflow:hidden;box-shadow:0 calc(var(--u)*10) calc(var(--u)*24) rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.15)}',
      '.mk-team{display:flex;align-items:center;padding:0 calc(var(--u)*10);background:#1d2a66;color:#fff;font:800 max(11px,calc(var(--u)*15))/1 var(--font-sport);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}',
      '.mk-team--away{background:#2a5fd0}',
      '.mk-score{min-width:calc(var(--u)*34);display:grid;place-items:center;padding:calc(var(--u)*6) calc(var(--u)*4);background:#0b1020;color:#ffcf4d;font:800 calc(var(--u)*24)/1 var(--font-sport);font-variant-numeric:tabular-nums}',
      '.mk-score.is-pop{animation:mkPop .6s cubic-bezier(.2,1.6,.4,1)}',
      '.mk-vs{display:grid;place-items:center;padding:0 calc(var(--u)*6);background:#0b1020;color:#9fb0e8;font:600 max(11px,calc(var(--u)*12))/1 var(--font-sport);text-transform:uppercase}',
      '@keyframes mkPop{0%{transform:scale(1.8);color:#fff}100%{transform:none}}',
    ].join('')
  );

  /* ================= the kit ================= */
  function defs(ctx) {
    var d = ctx.svg.querySelector('defs');
    if (d.querySelector('#mkCourt')) return;
    d.insertAdjacentHTML(
      'beforeend',
      '<linearGradient id="mkCourt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a7fe6"/><stop offset="1" stop-color="#2f5fc4"/></linearGradient>' +
        '<linearGradient id="mkStands" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1330"/><stop offset="1" stop-color="#1f2a63"/></linearGradient>' +
        '<radialGradient id="mkLight"><stop offset="0" stop-color="#fffbe8" stop-opacity="0.9"/><stop offset="1" stop-color="#fffbe8" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="mkCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe8" stop-opacity="0.22"/><stop offset="1" stop-color="#fffbe8" stop-opacity="0"/></linearGradient>' +
        '<radialGradient id="mkGlobe" cx="0.36" cy="0.32" r="0.8"><stop offset="0" stop-color="#8cc4ff"/><stop offset="0.6" stop-color="#3f86ee"/><stop offset="1" stop-color="#2a5fd0"/></radialGradient>'
    );
  }

  function buildArena(ctx) {
    defs(ctx);
    ctx.backdrop('#070b1c', '#1a2459');
    // stands + crowd (slow parallax)
    var standsWrap = ctx.art(
      '<rect x="-420" y="150" width="1200" height="260" fill="url(#mkStands)"/>' +
        '<g fill="#26326f">' +
        '<rect x="-420" y="214" width="1200" height="6"/><rect x="-420" y="264" width="1200" height="6"/><rect x="-420" y="314" width="1200" height="6"/></g>',
      { layer: 'bg', depth: 0.7 }
    );
    var crowdLayer = A.svg('g', null, standsWrap);
    var crowd = ctx.props.crowd(crowdLayer, { y: 200, rows: 4, x0: -420, x1: 780 });
    // LED board at the front of the stands
    ctx.art(
      '<rect x="-420" y="392" width="1200" height="26" fill="#0b1020"/>' +
        '<g font-family="Barlow Condensed, sans-serif" font-style="italic" font-weight="800" font-size="15" letter-spacing="2">' +
        '<text x="-260" y="411" fill="#ffcf4d">ALL-ISLAND NETBALL</text><text x="40" y="411" fill="#5fd3b3">FINAL</text>' +
        '<text x="160" y="411" fill="#ff8fab">GO CHOOTY!</text><text x="380" y="411" fill="#ffcf4d">ALL-ISLAND NETBALL</text></g>',
      { layer: 'bg', depth: 0.85 }
    );
    // arena light rigs
    var lights = ctx.art(
      lightRig(40, 60) + lightRig(320, 60) + '<path d="M40 70L-120 560H200Z" fill="url(#mkCone)"/><path d="M320 70L160 560H480Z" fill="url(#mkCone)"/>',
      { layer: 'bg', depth: 0.5 }
    );
    // court
    ctx.art(
      '<rect x="-420" y="418" width="1200" height="640" fill="#24428f"/>' +
        '<rect x="-300" y="430" width="960" height="620" fill="url(#mkCourt)"/>' +
        '<g fill="none" stroke="#fff" stroke-width="3" opacity="0.85">' +
        '<path d="M-300 430H660"/><path d="M60 430V1050"/>' +
        '<ellipse cx="60" cy="600" rx="54" ry="18"/>' +
        '<path d="M190 430A150 70 0 0 0 420 560" />' +
        '</g>' +
        '<ellipse cx="60" cy="600" rx="8" ry="3" fill="#fff" opacity="0.85"/>' +
        '<g stroke="#3a6fd6" stroke-width="2" opacity="0.5">' +
        planks() +
        '</g>',
      { layer: 'bg' }
    );
    var post = ctx.props.post(ctx.layers.mid, ctx.layers.front, { x: POST_X, ground: GROUND - 18, height: 206 });
    return { crowd: crowd, post: post, lights: lights };
  }
  function lightRig(x, y) {
    return (
      '<g transform="translate(' + x + ' ' + y + ')"><rect x="-38" y="-12" width="76" height="22" rx="5" fill="#2b3474"/>' +
      '<circle cx="-22" cy="0" r="7" fill="#fffbe8"/><circle cx="0" cy="0" r="7" fill="#fffbe8"/><circle cx="22" cy="0" r="7" fill="#fffbe8"/>' +
      '<circle cx="0" cy="4" r="60" fill="url(#mkLight)" opacity="0.6"/></g>'
    );
  }
  function planks() {
    var s = '';
    for (var y = 460; y < 1050; y += 34) s += '<path d="M-300 ' + y + 'H660"/>';
    return s;
  }

  // An original opponent from team THE WORLD: a round globe with attitude.
  function globe(layer, x, y, s) {
    var p = { x: x, y: y, scale: s || 1, rot: 0, lift: 0, armUp: 0, look: 0, dizzy: 0, facing: -1, squash: 1, opacity: 1 };
    var g = A.svg('g', { class: 'mk-globe' }, layer);
    g.innerHTML =
      '<ellipse class="mk-shadow" cx="0" cy="0" rx="26" ry="5" fill="#000" opacity="0.25"/>' +
      '<g class="mk-body">' +
      // legs + red sneakers
      '<rect x="-14" y="-16" width="8" height="14" rx="4" fill="#2a5fd0"/><rect x="6" y="-16" width="8" height="14" rx="4" fill="#2a5fd0"/>' +
      '<path d="M-19 -4h14a4 4 0 0 1 4 4v1h-20a2 2 0 0 1 2-5Z" fill="#ff5a5f"/><path d="M5 -4h14a2 2 0 0 1 2 5H1v-1a4 4 0 0 1 4-4Z" fill="#ff5a5f"/>' +
      // arms
      '<g class="mk-armL" transform="translate(-26 -46)"><rect x="-4" y="-2" width="8" height="20" rx="4" fill="#2a5fd0"/><circle cx="0" cy="18" r="4.5" fill="#fff"/></g>' +
      '<g class="mk-armR" transform="translate(26 -46)"><rect x="-4" y="-2" width="8" height="20" rx="4" fill="#2a5fd0"/><circle cx="0" cy="18" r="4.5" fill="#fff"/></g>' +
      // the globe
      '<circle cx="0" cy="-44" r="30" fill="url(#mkGlobe)" stroke="#1d3f96" stroke-width="1.6"/>' +
      '<path d="M-22 -58c8-8 18-4 20 2s-6 10-10 8-12 2-10-10ZM6 -66c8-2 16 4 14 10-4 2-6-2-12 2s-8-8-2-12ZM-8 -30c6-4 14-2 16 4-4 6-14 6-16-4ZM14 -40c6 0 10 6 8 10-6 0-10-4-8-10Z" fill="#5fd38b"/>' +
      '<path d="M-30 -44h60M0 -74v60" stroke="#fff" stroke-width="0.8" opacity="0.25"/>' +
      // face
      '<g class="mk-face"><ellipse cx="-9" cy="-46" rx="6" ry="7" fill="#fff"/><ellipse cx="9" cy="-46" rx="6" ry="7" fill="#fff"/>' +
      '<g class="mk-pupils"><circle cx="-9" cy="-45" r="3.4" fill="#1b1630"/><circle cx="9" cy="-45" r="3.4" fill="#1b1630"/></g>' +
      '<path class="mk-x" d="M-13 -50l8 8M-5 -50l-8 8M5 -50l8 8M13 -50l-8 8" stroke="#1b1630" stroke-width="2.4" stroke-linecap="round" style="display:none"/>' +
      '<path d="M-16 -56l12 4M16 -56l-12 4" stroke="#1b1630" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path class="mk-mouth" d="M-5 -32q5 -3 10 0" fill="none" stroke="#1b1630" stroke-width="2.2" stroke-linecap="round"/></g>' +
      '</g>';
    var body = g.querySelector('.mk-body');
    var armL = g.querySelector('.mk-armL');
    var armR = g.querySelector('.mk-armR');
    var shadow = g.querySelector('.mk-shadow');
    var pupils = g.querySelector('.mk-pupils');
    var xEyes = g.querySelector('.mk-x');
    var stop = A.onFrame(function (dt, clock) {
      var bob = Math.sin(clock * 6 + x) * 1.5;
      g.setAttribute('opacity', p.opacity);
      shadow.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') scale(' + p.scale.toFixed(3) + ')');
      body.setAttribute(
        'transform',
        'translate(' + p.x.toFixed(1) + ' ' + (p.y - p.lift + bob).toFixed(1) + ') rotate(' + p.rot.toFixed(1) + ') scale(' + (p.scale * p.facing / Math.sqrt(p.squash)).toFixed(3) + ' ' + (p.scale * p.squash).toFixed(3) + ')'
      );
      var a = 20 + p.armUp * 140 + Math.sin(clock * 9) * 6 * p.armUp;
      armL.setAttribute('transform', 'translate(-26 -46) rotate(' + a.toFixed(1) + ')');
      armR.setAttribute('transform', 'translate(26 -46) rotate(' + (-a).toFixed(1) + ')');
      pupils.style.display = p.dizzy ? 'none' : '';
      xEyes.style.display = p.dizzy ? '' : 'none';
      pupils.setAttribute('transform', 'translate(' + (p.look * 2.5).toFixed(2) + ' 0)');
    });
    return {
      el: g,
      p: p,
      destroy: function () {
        stop();
        g.remove();
      },
    };
  }

  function scoreboard(ctx, home, away) {
    var M = ctx.M.match;
    var el = ctx.panel(
      '<div class="mk-board__title">' + esc(M.title) + '</div>' +
        '<div class="mk-board__row"><span class="mk-team">' + esc(M.home) + '</span><span class="mk-score" data-home>' + home + '</span>' +
        '<span class="mk-vs">' + esc(M.vs) + '</span><span class="mk-score" data-away>' + away + '</span><span class="mk-team mk-team--away">' + esc(M.away) + '</span></div>',
      'mk-board'
    );
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', 'Scoreboard');
    return {
      el: el,
      show: function () {
        el.classList.add('is-in');
      },
      set: function (h, a) {
        var hs = el.querySelector('[data-home]');
        var as = el.querySelector('[data-away]');
        if (String(h) !== hs.textContent) {
          hs.textContent = h;
          hs.classList.remove('is-pop');
          void hs.offsetWidth;
          hs.classList.add('is-pop');
        }
        as.textContent = a;
      },
    };
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  P.matchKit = { buildArena: buildArena, globe: globe, scoreboard: scoreboard, GROUND: GROUND, POST_X: POST_X, esc: esc };

  /* ================= scene 6 ================= */
  var set = {};

  function setup(ctx) {
    var arena = buildArena(ctx);
    set.arena = arena;
    set.board = scoreboard(ctx, 0, 0);
    // teammate piglet + defenders
    set.mate = ctx.Pig.create(ctx.layers.actors, { x: 250, y: GROUND - 6 });
    set.mate.place(250, GROUND - 6, { scale: 0.72, facing: -1 });
    set.mate.outfit(true);
    set.mate.wear('headband', false);
    set.mate.express('happy', 0);
    set.def1 = globe(ctx.layers.actors, 470, GROUND, 1);
    set.def2 = globe(ctx.layers.mid, 520, GROUND - 30, 0.85);
    var pig = ctx.pig;
    pig.outfit(true);
    pig.wear('shades', false);
    pig.place(-90, GROUND, { scale: 1.08, facing: 1 });
    pig.express('determined', 0);
    pig.setMode('idle');
    set.ball = ctx.props.ball(ctx.layers.actors, { x: 250 - 22, y: GROUND - 6 - 46, ground: GROUND });
    set.holdMate = ctx.loop(function () {
      var h = set.mate.hand('R');
      set.ball.place(h.x - 4, h.y - 10);
    });
    ctx.camera.set({ x: 160, y: 400, zoom: 1.05 });
  }

  async function passTo(ctx, ball, to, ms, peak) {
    await ball.arc(to.x, to.y, ms, peak, { spin: 360 });
  }

  async function play(ctx) {
    var T = ctx.T.match;
    var M = ctx.M.match;
    var pig = ctx.pig;
    var ball = set.ball;
    var mate = set.mate;
    var crowd = set.arena.crowd;

    ctx.music('match', 0.5);
    ctx.ambience('crowd', 0.6, 0.8);
    ctx.sfx('whistle', 0, 0.4);

    // 1. run onto the court, crowd roars
    var dust = ctx.every(110, function () {
      ctx.fx.puff(pig.p.x - 16, GROUND, { count: 2, size: 0.7, color: '#cfe0ff' });
    });
    crowd.cheer(true);
    ctx.sfx('cheer', 0, 2.4);
    await pig.walkTo(80, T.runOn, { run: true, ease: 'outQuad' });
    dust();
    pig.boing(0.6);
    set.board.show();
    ctx.sfx('whistle', 0.1, 0.25);
    await ctx.caption(M.title, { style: 'title', pos: 'center', enter: 'slam', hold: T.titleHold });
    crowd.cheer(false, 800);

    // 2. receive the ball from the teammate
    set.holdMate();
    mate.pose({ armR: 120 }, 160, 'outBack');
    var h = pig.hand('R');
    await passTo(ctx, ball, { x: h.x + 2, y: h.y - 8 }, T.passFlight, 50);
    ctx.sfx('bounce', 0, 0.2);
    mate.pose({ armR: 8 }, 200);
    var hold = ctx.loop(function () {
      var hh = pig.hand('R');
      ball.place(hh.x + 2, hh.y - 8);
    });
    pig.pose({ armR: 40 }, 160, 'outBack');
    pig.boing(0.5);
    await ctx.wait(T.catchBeat);

    // 3. CUT: tap to pass (a crisp give-and-go)
    ctx.flash('#ffffff', 220);
    ctx.camera.set({ x: 150, y: 430, zoom: 1.3 });
    pig.express('focused', 120);
    await ctx.tap({ label: M.pass, hintDelay: 200 });
    hold();
    ctx.sfx('whoosh');
    await A.tween(pig.p, { armR: 100, armL: 100, tilt: 6 }, 110, 'outQuad');
    var mh = mate.hand('R');
    var flight = passTo(ctx, ball, { x: mh.x - 4, y: mh.y - 10 }, T.passFlight, 30);
    A.tween(pig.p, { armR: 30, armL: 8, tilt: 0 }, 300, 'outBack');
    ctx.camera.to({ x: 190, y: 430, zoom: 1.2 }, T.passFlight, 'inOutSine');
    await flight;
    ctx.sfx('bounce', 0, 0.18);
    mate.boing(0.6);
    await ctx.wait(160);
    h = pig.hand('R');
    await passTo(ctx, ball, { x: h.x + 2, y: h.y - 8 }, T.passFlight, 40);
    ctx.sfx('bounce', 0, 0.2);
    hold = ctx.loop(function () {
      var hh = pig.hand('R');
      ball.place(hh.x + 2, hh.y - 8);
    });
    pig.express('happy', 120);
    crowd.cheer(true, 200);
    ctx.sfx('cheer', 0, 1.2);
    await ctx.wait(400);
    crowd.cheer(false, 600);

    // 4. CUT: a globe defender lunges, tap to dodge
    ctx.flash('#ffffff', 220);
    var d1 = set.def1;
    d1.p.x = 300;
    d1.p.facing = -1;
    ctx.camera.set({ x: 170, y: 440, zoom: 1.28 });
    pig.express('surprised', 100);
    ctx.sfx('gasp');
    // the lunge: anticipation, then it leaps in, arms up (slow motion while we wait for the tap)
    await A.tween(d1.p, { squash: 0.8, armUp: 1 }, 220, 'outQuad');
    A.tween(d1.p, { squash: 1.1 }, 200, 'outQuad');
    var lunge = Promise.all([A.tween(d1.p, { x: 150 }, T.lunge, 'outQuad'), A.tween(d1.p, { lift: 30 }, T.lunge * 0.5, 'outQuad')]);
    await ctx.wait(T.lunge * 0.45);
    ctx.slowmo(0.15, 200);
    ctx.letterbox(true);
    await ctx.tap({ label: M.dodge, hintDelay: 100 });
    ctx.slowmo(1, 0);
    ctx.letterbox(false);
    // dodge: sidestep + spin with speed lines
    ctx.sfx('whoosh');
    pig.express('determined', 80);
    var sl = ctx.every(40, function () {
      ctx.fx.speedLine(pig.p.x - 20, pig.p.y - 60 + Math.random() * 40, -1);
    });
    await Promise.all([
      A.tween(pig.p, { x: 62, lift: 18 }, T.dodge, 'outQuad').then(function () {
        return A.tween(pig.p, { lift: 0 }, 160, 'inQuad');
      }),
      A.tween(pig.p, { facing: -1 }, T.dodge * 0.5, 'inQuad').then(function () {
        return A.tween(pig.p, { facing: 1 }, T.dodge * 0.5, 'outQuad');
      }),
    ]);
    sl();
    await lunge;
    // the defender whiffs: spins, flops, dizzy
    ctx.sfx('slideDown');
    await Promise.all([A.tween(d1.p, { x: 70, rot: -260, lift: 0 }, T.whiff * 0.6, 'outQuad'), A.tween(d1.p, { armUp: 0 }, 300)]);
    A.set(d1.p, { dizzy: 1 });
    await A.tween(d1.p, { rot: -90, squash: 0.9 }, 240, 'outBounce');
    ctx.sfx('thud');
    ctx.camera.shake(4, 220);
    ctx.fx.sparkle(d1.p.x - 10, d1.p.y - 40, { count: 5, color: '#ffd75e' });
    crowd.cheer(true, 200);
    ctx.sfx('cheer', 0, 1.6);
    pig.express('proud', 120);
    await ctx.wait(T.whiff * 0.5);

    // 5. CUT: drive to the post, jump, land in shooting position
    ctx.flash('#ffffff', 220);
    crowd.cheer(false, 600);
    ctx.camera.set({ x: 170, y: 420, zoom: 1.1 });
    pig.express('determined', 80);
    var dust2 = ctx.every(110, function () {
      ctx.fx.puff(pig.p.x - 16, GROUND, { count: 2, size: 0.7, color: '#cfe0ff' });
    });
    ctx.camera.to({ x: 220, y: 410, zoom: 1.15 }, T.drive, 'inOutSine');
    await pig.walkTo(190, T.drive, { run: true });
    dust2();
    await pig.jump({ height: 46, armsUp: true });
    hold();
    var lift = ctx.loop(function () {
      var hh = pig.hand('R');
      ball.place(hh.x - 8, hh.y - 12);
    });
    await pig.pose({ armR: 150, armL: 150, eyeL: 0.8, eyeR: 0.8 }, 200, 'outBack');
    await ctx.wait(T.landBeat);
    ctx.music('none', 1.2);
    ctx.ambience('crowd', 0.25, 1.2);
    await ctx.caption(M.shoot, { style: 'hud', pos: 'upper', y: 26, hold: T.shootHint });
    lift();
  }

  P.scenes.register({ id: 'match', order: 60, title: 'Final match', transition: 'flash', setup: setup, play: play });
})();

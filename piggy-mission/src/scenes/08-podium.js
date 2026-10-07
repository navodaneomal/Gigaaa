/*
 * Scene 8: 🥇 1ST PLACE. The biggest visual moment: a victory stage, sweeping
 * spotlights, streamers, confetti, a broadcast card flipping to "1ST PLACE /
 * CHOOTY BOLE". Then the trophy gag: almost bigger than the pig, it wobbles,
 * staggers, falls backwards, the trophy lands on its belly… thumbs-up.
 * Defines PIGGY.podiumKit, reused by scene 9 (the quiet moment).
 */
(function () {
  'use strict';
  var P = window.PIGGY;
  var A = P.anim;

  var FLOOR = 588;
  var BLOCK_TOP = 474; // top of the 1st-place block

  var DEFAULTS = {
    cardIn: 700,
    onTop: 1300,
    trophyDrop: 900,
    lift: 700,
    struggle: 1900,
    afterFall: 800,
    thumbs: 1300,
  };

  P.scenes.css(
    'podium',
    [
      '.pd-card{left:50%;top:calc(var(--u)*58 + var(--safe-top));transform:translateX(-50%) perspective(600px) rotateX(90deg);transform-origin:50% 0;transition:transform .8s cubic-bezier(.2,1.5,.4,1),opacity .5s ease;',
      'text-align:center;padding:calc(var(--u)*10) calc(var(--u)*22) calc(var(--u)*12);border-radius:calc(var(--u)*16);background:linear-gradient(160deg,rgba(29,42,102,.95),rgba(16,12,48,.95));',
      'border:2px solid #ffcf4d;box-shadow:0 0 0 calc(var(--u)*4) rgba(255,207,77,.18),0 calc(var(--u)*20) calc(var(--u)*40) rgba(0,0,0,.5),0 0 calc(var(--u)*50) rgba(255,207,77,.35);white-space:nowrap}',
      '.pd-card.is-in{transform:translateX(-50%) perspective(600px) rotateX(0)}',
      '.pd-card.is-out{opacity:0}',
      '.pd-card__place{display:block;font:italic 800 calc(var(--u)*44)/1 var(--font-sport);text-transform:uppercase;letter-spacing:.02em;',
      'background:linear-gradient(180deg,#fff6c9,#ffcf4d 55%,#d98e12);-webkit-background-clip:text;background-clip:text;color:transparent;filter:none}',
      '.pd-card__name{display:block;margin-top:calc(var(--u)*4);font:800 calc(var(--u)*20)/1.1 var(--font-sport);letter-spacing:.18em;text-transform:uppercase;color:#fff}',
      '.pd-card.is-in .pd-card__place{animation:pdShine 2.4s ease-in-out infinite}',
      '@keyframes pdShine{0%,100%{text-shadow:none}50%{text-shadow:0 0 calc(var(--u)*18) rgba(255,207,77,.5)}}',
    ].join('')
  );

  /* ---------------- the stage (shared with scene 9) ---------------- */
  function defs(ctx) {
    var d = ctx.svg.querySelector('defs');
    if (d.querySelector('#pdFloor')) return;
    d.insertAdjacentHTML(
      'beforeend',
      '<linearGradient id="pdFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2f7a"/><stop offset="1" stop-color="#0f1236"/></linearGradient>' +
        '<linearGradient id="pdBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d6" stop-opacity="0.5"/><stop offset="1" stop-color="#fff6d6" stop-opacity="0"/></linearGradient>' +
        '<linearGradient id="pdGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe17a"/><stop offset="1" stop-color="#d9930f"/></linearGradient>' +
        '<linearGradient id="pdSilver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef2f8"/><stop offset="1" stop-color="#9aa4b8"/></linearGradient>' +
        '<linearGradient id="pdBronze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2b98a"/><stop offset="1" stop-color="#b06a3c"/></linearGradient>' +
        '<radialGradient id="pdSpot"><stop offset="0" stop-color="#ffe9b8" stop-opacity="0.55"/><stop offset="1" stop-color="#ffe9b8" stop-opacity="0"/></radialGradient>'
    );
  }

  function build(ctx) {
    defs(ctx);
    ctx.backdrop('#0f0a2e', '#2a1a5c');
    var back = ctx.art(
      // curtain folds
      folds() +
        // marquee arch with bulbs
        '<path d="M-20 300Q180 120 380 300" fill="none" stroke="#ffcf4d" stroke-width="10" opacity="0.9"/>' +
        bulbs() +
        // emblem
        '<g transform="translate(180 300)"><circle r="96" fill="none" stroke="#ffcf4d" stroke-width="4" opacity="0.6"/><circle r="80" fill="#1d2a66" opacity="0.65"/>' +
        '<path d="M0 -44l12.9 26.2 28.9 4.2-20.9 20.4 4.9 28.8L0 22.8l-25.8 13.6 4.9-28.8-20.9-20.4 28.9-4.2Z" fill="#ffcf4d"/></g>' +
        // streamers
        streamers(),
      { layer: 'bg', depth: 0.75 }
    );
    var beams = ctx.art(beam(40, -30, 18) + beam(180, -60, 0) + beam(320, -30, -18), { layer: 'bg' });
    ctx.art(
      // floor + podium
      '<rect x="-420" y="540" width="1200" height="600" fill="url(#pdFloor)"/>' +
        '<ellipse cx="180" cy="600" rx="240" ry="34" fill="#3a4199" opacity="0.5"/>' +
        block(30, 506, 92, 'url(#pdSilver)', '2') +
        block(238, 520, 92, 'url(#pdBronze)', '3') +
        block(120, BLOCK_TOP, 120, 'url(#pdGold)', '1') +
        // glowing crowd silhouettes at the front
        crowdRow(),
      { layer: 'bg' }
    );
    var spot = ctx.art('<ellipse cx="180" cy="' + FLOOR + '" rx="110" ry="22" fill="url(#pdSpot)"/>', { layer: 'mid' });
    // sweeping beams
    var bs = beams.querySelectorAll('.pd-beam');
    ctx.loop(function (dt, clock) {
      for (var i = 0; i < bs.length; i++) {
        var base = +bs[i].getAttribute('data-a');
        bs[i].setAttribute('transform', 'rotate(' + (base + Math.sin(clock * 0.9 + i * 2) * 14).toFixed(2) + ' ' + bs[i].getAttribute('data-x') + ' -40)');
      }
    });
    return { beams: beams, back: back, spot: spot };
  }
  function folds() {
    var s = '<rect x="-420" y="-400" width="1200" height="980" fill="#2c1659"/>';
    for (var x = -420; x < 780; x += 44) s += '<rect x="' + x + '" y="-400" width="22" height="980" fill="#3a1f70" opacity="0.7"/>';
    return s;
  }
  function bulbs() {
    var s = '';
    for (var i = 0; i <= 14; i++) {
      var t = i / 14;
      var x = -20 + 400 * t;
      var y = 300 - 4 * 180 * t * (1 - t) * 0.98;
      s += '<circle class="pd-bulb" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5" fill="#fff3c6"/>';
    }
    return s;
  }
  function streamers() {
    var s = '';
    var cols = ['#e66f92', '#5fd3b3', '#ffcf4d', '#7fb7ff'];
    for (var i = 0; i < 9; i++) {
      var x = -60 + i * 60;
      s += '<path d="M' + x + ' -60q14 40 0 80t0 80t0 80" fill="none" stroke="' + cols[i % 4] + '" stroke-width="5" stroke-linecap="round" opacity="0.8"/>';
    }
    return s;
  }
  function beam(x, y, a) {
    return '<path class="pd-beam" data-a="' + a + '" data-x="' + x + '" d="M' + (x - 8) + ' -40L' + (x - 80) + ' 640L' + (x + 80) + ' 640L' + (x + 8) + ' -40Z" fill="url(#pdBeam)"/>';
  }
  function block(x, top, w, fill, n) {
    var h = 600 - top;
    return (
      '<g><rect x="' + x + '" y="' + top + '" width="' + w + '" height="' + h + '" rx="6" fill="' + fill + '"/>' +
      '<rect x="' + x + '" y="' + top + '" width="' + w + '" height="8" rx="4" fill="#fff" opacity="0.35"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (top + 54) + '" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-style="italic" font-weight="800" font-size="40" fill="#1d2a66" opacity="0.75">' + n + '</text></g>'
    );
  }
  function crowdRow() {
    var s = '<g fill="#0a0820" opacity="0.85">';
    for (var x = -400; x < 780; x += 26) s += '<circle cx="' + x + '" cy="' + (676 + ((x / 26) % 2) * 6) + '" r="14"/><rect x="' + (x - 16) + '" y="' + (686 + ((x / 26) % 2) * 6) + '" width="32" height="60" rx="12"/>';
    return s + '</g>';
  }

  // the pig flat on its back with the trophy on its belly (end of scene 8, start of scene 9)
  function fallenPose(ctx, x) {
    var pig = ctx.pig;
    pig.place(x, FLOOR, { scale: 1, facing: 1 });
    A.set(pig.p, { rot: -88, lift: -8, squash: 1, armL: 60, armR: 60 });
    pig.express('dizzy', 0);
  }
  function bellyPoint(ctx) {
    var pig = ctx.pig;
    return pig.pointOn(pig.parts.torso, 0, -50);
  }

  P.podiumKit = { build: build, FLOOR: FLOOR, fallenPose: fallenPose, bellyPoint: bellyPoint, BLOCK_TOP: BLOCK_TOP };

  /* ---------------- scene 8 ---------------- */
  var set = {};

  function setup(ctx) {
    set.stage = build(ctx);
    var pig = ctx.pig;
    pig.outfit(true);
    pig.wear('shades', false);
    pig.place(180, BLOCK_TOP, { scale: 1, facing: 1 });
    pig.express('joy', 0);
    pig.pose({ armL: 150, armR: 150, tailWag: 1 }, 0);
    pig.setMode('idle');
    ctx.camera.set({ x: 180, y: 380, zoom: 1.05 });
  }

  async function play(ctx) {
    var T = Object.assign({}, DEFAULTS, ctx.T.podium);
    var M = ctx.M.podium;
    var pig = ctx.pig;

    ctx.music('victory', 0.3);
    ctx.ambience('crowd', 0.9, 0.5);
    ctx.sfx('fanfare');
    ctx.sfx('cheer', 0.1, 3);
    var confetti = ctx.every(900, function () {
      ctx.fx.confetti(ctx.camera.state.x - 150 + Math.random() * 300, 60, { count: 26, power: 260, direction: Math.PI / 2, spread: 2.4, gravity: 300 });
    });

    // the broadcast card flips to 1ST PLACE
    var card = ctx.panel('<span class="pd-card__place">' + P.matchKit.esc(M.place) + '</span><span class="pd-card__name">' + P.matchKit.esc(M.name) + '</span>', 'pd-card');
    card.setAttribute('role', 'status');
    await ctx.wait(80);
    card.classList.add('is-in');
    ctx.sfx('ding');
    ctx.camera.shake(3, 300);
    pig.celebrate(T.onTop);
    await ctx.wait(T.onTop + 200);

    // hop down to the front of the stage
    pig.express('happy', 100);
    await Promise.all([pig.jump({ height: 30 }), A.tween(pig.p, { y: FLOOR, x: 210 }, 480, 'inOutQuad')]);
    ctx.camera.to({ x: 190, y: 440, zoom: 1.18 }, 700, 'inOutCubic');

    // the trophy descends in a shower of sparkles
    var cup = ctx.props.trophy(ctx.layers.front, { x: 280, y: -160, scale: 1.12 });
    ctx.sfx('sparkle');
    pig.lookAt(280, 300, 200);
    pig.express('surprised', 150);
    var spark = ctx.every(160, function () {
      ctx.fx.sparkle(cup.p.x, cup.p.y - 60, { count: 2, color: '#fff3c6' });
    });
    await A.tween(cup.p, { y: FLOOR }, T.trophyDrop, 'outBounce');
    spark();
    ctx.sfx('ding');
    await ctx.wait(300);
    await pig.lookAtViewer(150);
    pig.express('proud', 150);
    await ctx.wait(400);

    // lift it… it is almost bigger than the pig
    pig.express('determined', 100);
    await pig.walkTo(250, 400);
    pig.p.facing = 1;
    await pig.pose({ armL: 150, armR: 150, squash: 0.86 }, 200, 'outQuad');
    var lift = { k: 0 };
    var follow = ctx.loop(function () {
      var hl = pig.hand('L');
      var hr = pig.hand('R');
      var hx = (hl.x + hr.x) / 2;
      var hy = Math.min(hl.y, hr.y);
      cup.p.x += (hx - cup.p.x) * Math.min(1, lift.k * 3);
      cup.p.y = FLOOR + (hy + 8 - FLOOR) * lift.k;
    });
    ctx.sfx('slideUp');
    await Promise.all([A.tween(lift, { k: 1 }, T.lift, 'outBack'), A.tween(pig.p, { squash: 1.05 }, T.lift, 'outBack')]);
    pig.express('ow', 100);
    // the struggle: wobble, shaking legs, sweat
    var t0 = A.clock();
    var wob = ctx.loop(function (dt, clock) {
      var e = clock - t0;
      var lean = Math.min(1, e / (T.struggle / 1000));
      cup.p.rot = Math.sin(e * 7) * (6 + 10 * lean) - 14 * lean;
      pig.p.tilt = -Math.sin(e * 7) * 5 - 10 * lean;
      pig.p.legL = Math.abs(Math.sin(e * 34)) * 3;
      pig.p.legR = Math.abs(Math.cos(e * 34)) * 3;
      pig.p.squash = 0.94 + Math.sin(e * 20) * 0.02;
    });
    var sweat = ctx.every(260, function () {
      var h = pig.head();
      ctx.fx.sweat(h.x + (Math.random() < 0.5 ? -28 : 28), h.y - 6, Math.random() < 0.5 ? -1 : 1);
    });
    ctx.sfx('gasp');
    await ctx.wait(T.struggle);
    wob();
    sweat();

    // …and over it goes, backwards. The trophy lands on its belly.
    follow();
    ctx.sfx('slideDown');
    var fall = pig.fall({ backward: true });
    var land = A.tween(cup.p, { x: 200, rot: -8 }, 520, 'inQuad');
    await fall;
    var belly = bellyPoint(ctx);
    await Promise.all([land, A.tween(cup.p, { x: belly.x - 4, y: belly.y + 6 }, 160, 'inQuad')]);
    ctx.sfx('thud');
    ctx.sfx('ding', 0.05);
    ctx.camera.shake(7, 360);
    ctx.fx.puff(belly.x, FLOOR - 4, { count: 8, color: '#c9d6ff', power: 1.4 });
    ctx.fx.sparkle(belly.x, belly.y - 60, { count: 6 });
    A.tween(cup.p, { rot: -4 }, 400, 'outElastic');
    await ctx.wait(T.afterFall);

    // a beat… then from underneath: thumbs-up
    pig.express('proud', 200);
    ctx.sfx('pop');
    await pig.pose({ armR: 92 }, 320, 'outBack');
    ctx.fx.sparkle(pig.hand('R').x, pig.hand('R').y - 8, { count: 5, color: '#ffffff' });
    await ctx.wait(T.thumbs);
    confetti();
    set.cup = cup;
    set.card = card;
  }

  P.scenes.register({ id: 'podium', order: 80, title: '1st place', transition: 'flash', setup: setup, play: play });
})();

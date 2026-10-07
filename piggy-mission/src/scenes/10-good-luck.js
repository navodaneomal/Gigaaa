/*
 * Scene 10: Good luck. A warm sunrise on a hill. Short, genuine lines, one at
 * a time, each with a small physical reaction from the pig. Then the big
 * cards: GOOD LUCK, CHOOTY BOLE 🫂 / GO GET THAT 1ST PLACE 🥇, while the pig
 * points at the trophy.
 */
(function () {
  'use strict';
  var P = window.PIGGY;
  var A = P.anim;

  var GROUND = 566;
  var DEFAULTS = {
    intro: 900,
    line: 1250,
    gap: 280,
    bigHold: 1300,
    firstHold: 1800,
  };

  P.scenes.css(
    'goodLuck',
    [
      '.gl-line{font:900 calc(var(--u)*30)/1.15 var(--font);color:#1d2a66;text-shadow:0 0 calc(var(--u)*14) rgba(255,255,255,.85),0 0 2px rgba(255,255,255,.9)}',
      '.gl-big{font:italic 800 calc(var(--u)*44)/.95 var(--font-sport);text-transform:uppercase;color:#fff;',
      'text-shadow:calc(var(--u)*3) calc(var(--u)*3) 0 #e66f92,0 calc(var(--u)*6) calc(var(--u)*20) rgba(120,40,70,.35)}',
      '.gl-first{font:italic 800 calc(var(--u)*34)/1 var(--font-sport);text-transform:uppercase;color:#ffcf4d;',
      'text-shadow:calc(var(--u)*2.5) calc(var(--u)*2.5) 0 #b45d0c,0 0 calc(var(--u)*18) rgba(255,255,255,.6)}',
    ].join('')
  );

  var set = {};

  function defs(ctx) {
    var d = ctx.svg.querySelector('defs');
    if (d.querySelector('#glSky')) return;
    d.insertAdjacentHTML(
      'beforeend',
      '<linearGradient id="glSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb4ec"/><stop offset="0.45" stop-color="#ffc6a8"/><stop offset="0.75" stop-color="#ffe0b0"/><stop offset="1" stop-color="#fff0cf"/></linearGradient>' +
        '<radialGradient id="glSun"><stop offset="0" stop-color="#fffbe6"/><stop offset="0.3" stop-color="#ffe9a8" stop-opacity="0.95"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="glRay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d6" stop-opacity="0.5"/><stop offset="1" stop-color="#fff6d6" stop-opacity="0"/></linearGradient>' +
        '<linearGradient id="glHill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3a8"/><stop offset="1" stop-color="#4faa7e"/></linearGradient>'
    );
  }

  function setup(ctx) {
    defs(ctx);
    ctx.backdrop('#8fb4ec', '#fff0cf');
    ctx.art('<rect x="-420" y="-400" width="1200" height="1000" fill="url(#glSky)"/>', { layer: 'bg' });
    // the rising sun with slowly turning rays
    set.rays = ctx.art(rays(250, 400), { layer: 'bg', depth: 0.4 });
    ctx.art('<circle cx="250" cy="400" r="150" fill="url(#glSun)"/><circle cx="250" cy="400" r="38" fill="#fffbe6"/>', { layer: 'bg', depth: 0.4 });
    ctx.art(cloud(40, 170, 1) + cloud(300, 120, 0.8) + bird(120, 200) + bird(150, 186) + bird(320, 230), { layer: 'bg', depth: 0.6 });
    // far hills with a tiny netball post on top
    ctx.art(
      '<path d="M-420 470Q-150 380 80 450T520 430T800 470V700H-420Z" fill="#f2b28c"/>' +
        '<path d="M-420 510Q-100 440 180 500T780 480V720H-420Z" fill="#d98f86"/>' +
        '<g transform="translate(-30 432)"><rect x="-1.5" y="-46" width="3" height="46" fill="#7d5c8f"/><path d="M-1.5 -46h-8" stroke="#7d5c8f" stroke-width="2"/><ellipse cx="-12" cy="-46" rx="5" ry="1.6" fill="none" stroke="#7d5c8f" stroke-width="1.6"/></g>',
      { layer: 'bg', depth: 0.75 }
    );
    // our hill
    ctx.art(
      '<path d="M-420 570Q180 520 780 570V1060H-420Z" fill="url(#glHill)"/>' +
        '<path d="M-420 570Q180 520 780 570" fill="none" stroke="#b6ecc8" stroke-width="4" opacity="0.7"/>' +
        flowers(),
      { layer: 'bg' }
    );
    // the trophy on a little pedestal
    ctx.art('<g transform="translate(280 ' + (GROUND - 2) + ')"><rect x="-26" y="-24" width="52" height="24" rx="5" fill="#fff6e9"/><rect x="-30" y="-28" width="60" height="7" rx="3" fill="#ffffff"/></g>', { layer: 'mid' });
    set.cup = ctx.props.trophy(ctx.layers.mid, { x: 280, y: GROUND - 28, scale: 0.62 });
    var pig = ctx.pig;
    pig.outfit(true);
    pig.wear('shades', false);
    pig.place(120, GROUND, { scale: 1.2, facing: 1 });
    pig.express('calm', 0);
    pig.setMode('idle');
    ctx.camera.set({ x: 180, y: 360, zoom: 1 });
    ctx.loop(function (dt, clock) {
      set.rays.setAttribute('transform', 'rotate(' + ((clock * 4) % 360).toFixed(2) + ' 250 400)');
    });
  }
  function rays(cx, cy) {
    var s = '';
    for (var i = 0; i < 12; i++) s += '<path d="M' + cx + ' ' + cy + 'L' + (cx - 26) + ' ' + (cy - 520) + 'L' + (cx + 26) + ' ' + (cy - 520) + 'Z" fill="url(#glRay)" transform="rotate(' + i * 30 + ' ' + cx + ' ' + cy + ')"/>';
    return s;
  }
  function cloud(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="#fff4ee" opacity="0.85"><ellipse cx="0" cy="0" rx="36" ry="13"/><circle cx="-12" cy="-8" r="13"/><circle cx="10" cy="-11" r="16"/></g>';
  }
  function bird(x, y) {
    return '<path d="M' + (x - 7) + ' ' + y + 'q3.5 -4 7 0q3.5 -4 7 0" fill="none" stroke="#7d5c8f" stroke-width="1.6" stroke-linecap="round"/>';
  }
  function flowers() {
    var s = '';
    var cols = ['#ffcf4d', '#ff8fab', '#ffffff'];
    for (var i = 0; i < 18; i++) {
      var x = -200 + i * 38 + (i % 3) * 7;
      var y = 600 + (i % 4) * 22;
      s += '<circle cx="' + x + '" cy="' + y + '" r="3.2" fill="' + cols[i % 3] + '"/>';
    }
    return s;
  }

  async function play(ctx) {
    var T = Object.assign({}, DEFAULTS, ctx.T.goodLuck);
    var M = ctx.M.goodLuck;
    var pig = ctx.pig;
    var cup = set.cup;

    ctx.music('warm', 1.5);
    ctx.ambience('room', 0.3, 1);
    ctx.ambience('crowd', 0, 0.5);
    var shimmer = ctx.every(1100, function () {
      ctx.fx.sparkle(cup.p.x, cup.p.y - 40, { count: 2, color: '#fff3c6' });
    });
    await ctx.wait(T.intro);

    // each line gets its own little gesture
    var gestures = [
      function () {
        pig.express('happy', 200);
        return pig.pose({ nod: 3 }, 200, 'outQuad').then(function () {
          return pig.pose({ nod: 0 }, 300, 'outBack');
        });
      },
      function () {
        pig.express('determined', 150);
        ctx.sfx('boing');
        return pig.pose({ armL: 120, armR: 120, squash: 1.06 }, 260, 'outBack');
      },
      function () {
        pig.pose({ armL: 8, armR: 8, squash: 1 }, 200);
        return pig.hop(18);
      },
      function () {
        pig.express('calm', 200);
        return pig.pose({ armR: -60, headTilt: -5 }, 320, 'outBack');
      },
      function () {
        pig.express('determined', 120);
        ctx.sfx('whoosh');
        return pig.pose({ armR: 165, headTilt: 0, squash: 1.08 }, 220, 'outBack').then(function () {
          return pig.boing(0.6);
        });
      },
      function () {
        pig.express('proud', 200);
        ctx.fx.sparkle(pig.head().x, pig.head().y - 50, { count: 6 });
        return pig.pose({ armR: 150, armL: 150, squash: 1 }, 260, 'outBack');
      },
    ];
    for (var i = 0; i < M.lines.length; i++) {
      var h = ctx.caption(M.lines[i], { style: 'line', pos: 'upper', y: 17, className: 'gl-line', enter: 'rise', stay: true });
      if (gestures[i]) gestures[i]();
      await ctx.wait(T.line);
      h.hide();
      await ctx.wait(T.gap);
    }
    pig.pose({ armL: 8, armR: 8, headTilt: 0 }, 300);

    // the big cards
    ctx.sfx('sparkle');
    var big = ctx.caption(M.big, { style: 'title', pos: 'top', className: 'gl-big', enter: 'pop', stay: true });
    pig.express('happy', 200);
    pig.hop(14);
    await ctx.wait(T.bigHold);
    ctx.sfx('ding');
    var first = ctx.caption(M.first, { style: 'title', pos: 'upper', y: 27, className: 'gl-first', enter: 'slam', stay: true });
    // the pig points at the trophy
    pig.express('proud', 200);
    await pig.lookAt(cup.p.x, cup.p.y - 50, 200);
    await pig.point('R', 98);
    A.tween(cup.p, { scale: 0.7 }, 300, 'outBack');
    ctx.fx.sparkle(cup.p.x, cup.p.y - 40, { count: 10, power: 1.3 });
    ctx.fx.confetti(cup.p.x, cup.p.y - 60, { count: 40, power: 380 });
    await ctx.wait(T.firstHold);
    await ctx.tap();
    shimmer();
    big.hide();
    first.hide();
  }

  P.scenes.register({ id: 'goodLuck', order: 100, title: 'Good luck', transition: 'fade', setup: setup, play: play });
})();

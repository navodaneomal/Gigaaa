/*
 * Scene 1: Opening. A pig asleep in a cosy night bedroom.
 * A ball rolls in (ear twitch), rolls back (nothing), then drops from above: BONK.
 * One eye opens. Ball → camera → ball. "Oh." A glance at the circled calendar. "It's today."
 */
(function () {
  'use strict';
  var P = window.PIGGY;
  var A = P.anim;

  var set = {}; // references shared between setup and play

  function setup(ctx) {
    var S = ctx.M.signs;
    var L = ctx.layers;
    ctx.backdrop('#141a3d', '#272c5c');

    // back wall (slow parallax)
    ctx.art(
      // moonlight window
      '<g transform="translate(40 110)">' +
        '<rect x="-8" y="-8" width="136" height="166" rx="10" fill="#3a3c72"/>' +
        '<rect x="0" y="0" width="120" height="150" rx="6" fill="url(#opSkyGrad)"/>' +
        '<circle cx="84" cy="44" r="20" fill="#fff4d6"/><circle cx="93" cy="38" r="17" fill="#1d2a62" opacity="0.92"/>' +
        '<g fill="#fff">' +
        '<circle cx="22" cy="28" r="1.6"/><circle cx="48" cy="60" r="1.2"/><circle cx="30" cy="104" r="1.4"/><circle cx="98" cy="96" r="1.1"/><circle cx="64" cy="20" r="1"/>' +
        '</g>' +
        '<path d="M60 0V150M0 75H120" stroke="#3a3c72" stroke-width="6"/>' +
        '<path d="M-14 -14h44c-8 50-6 120 6 178h-50Z" fill="#6a4c8f"/><path d="M134 -14h-44c8 50 6 120-6 178h50Z" fill="#6a4c8f"/>' +
        '<path d="M-14 -14h44c-8 50-6 120 6 178" fill="none" stroke="#7d5ea6" stroke-width="3"/>' +
        '<rect x="-20" y="-20" width="160" height="10" rx="5" fill="#8a6c3e"/>' +
        '</g>' +
        // moonbeam on the floor
        '<path d="M66 260L172 260L300 560L60 560Z" fill="#cfe0ff" opacity="0.05"/>' +
        // calendar
        '<g id="op-calendar" transform="translate(236 150)">' +
        '<rect x="0" y="0" width="84" height="92" rx="6" fill="#fff6e9"/>' +
        '<rect x="0" y="0" width="84" height="22" rx="6" fill="#e66f92"/><rect x="0" y="14" width="84" height="8" fill="#e66f92"/>' +
        '<text x="42" y="15.5" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="11" fill="#fff" letter-spacing="1">' + esc(S.sticker.toUpperCase()) + '</text>' +
        '<g fill="#d8cfe0">' +
        gridSquares() +
        '</g>' +
        '<g id="op-circle"><circle cx="49" cy="58" r="10" fill="none" stroke="#ffcf4d" stroke-width="3"/>' +
        '<circle cx="49" cy="58" r="4.2" fill="#fff" stroke="#4f8be0" stroke-width="1.2"/></g>' +
        '<circle cx="42" cy="-4" r="4" fill="#9a8fb8"/>' +
        '</g>' +
        // shelf with a tiny trophy (foreshadowing) and a plant
        '<g transform="translate(222 286)">' +
        '<rect x="0" y="0" width="112" height="7" rx="3" fill="#8a6c3e"/>' +
        '<path d="M18 -26h16v6c0 7-4 11-8 11s-8-4-8-11Z" fill="#ffcf4d"/><rect x="22" y="-9" width="8" height="5" fill="#d99a1c"/><rect x="17" y="-4" width="18" height="4" rx="1" fill="#7a5233"/>' +
        '<path d="M84 -2c-6-10 0-22 6-26 2 10 0 18-6 26Z M90 -2c4-12 14-16 18-14-4 8-10 13-18 14Z" fill="#5fd3b3"/>' +
        '<rect x="80" y="-8" width="16" height="8" rx="2" fill="#e66f92"/>' +
        '</g>' +
        // pennant
        '<g transform="translate(200 92) rotate(8)"><path d="M0 0L62 10L0 22Z" fill="#5fd3b3"/><text x="8" y="15" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="10" fill="#1d2a66">' + esc(S.pennant.toUpperCase()) + '</text></g>',
      { depth: 0.55 }
    );
    defs(ctx);

    // floor + rug + lamp glow (moves with the world)
    ctx.art(
      '<rect x="-400" y="470" width="1160" height="600" fill="url(#opFloorGrad)"/>' +
        '<g stroke="#2a2142" stroke-width="2" opacity="0.6">' +
        '<path d="M-400 520H760M-400 585H760M-400 660H760M-400 760H760"/>' +
        '</g>' +
        '<ellipse cx="180" cy="548" rx="150" ry="34" fill="#4a3c7a"/>' +
        '<ellipse cx="180" cy="548" rx="138" ry="28" fill="none" stroke="#6b5aa8" stroke-width="3" stroke-dasharray="6 7"/>' +
        '<circle cx="312" cy="430" r="80" fill="url(#opLampGlow)"/>' +
        '<g transform="translate(312 470)"><rect x="-4" y="-46" width="8" height="46" fill="#b8a07a"/><path d="M-20 -46h40l-8-26h-24Z" fill="#ffd38a"/><ellipse cx="0" cy="0" rx="16" ry="4" fill="#8a6c3e"/></g>',
      { layer: 'bg' }
    );

    // pet bed: back half behind the pig, front rim in front of it
    ctx.art('<ellipse cx="180" cy="530" rx="78" ry="26" fill="#7d5ea6"/><ellipse cx="180" cy="526" rx="62" ry="18" fill="#a487d1"/>', { layer: 'mid' });
    set.bedFront = ctx.art('<path d="M102 530a78 26 0 0 0 156 0a78 18 0 0 1-156 0Z" fill="#8f71bb"/><path d="M104 534a76 22 0 0 0 152 0" fill="none" stroke="#b49be0" stroke-width="3" opacity="0.6"/>', { layer: 'front' });

    // the pig, curled up asleep
    var pig = ctx.pig;
    pig.outfit(false);
    pig.wear('shades', false);
    pig.place(180, 532, { scale: 1.05, facing: 1 });
    pig.pose({ lift: -10, squash: 0.86, nod: 4, headTilt: -10, armL: 14, armR: 14, legL: 4, legR: 4, tailWag: 0.15 }, 0);
    pig.express('sleep', 0);
    pig.setMode('sleep');

    set.ball = ctx.props.ball(L.front, { x: -60, y: 549, ground: 560 });

    // gentle "zzz" while waiting behind the gate
    set.stopZ = startZzz(ctx);
  }

  function gridSquares() {
    var out = '';
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 5; c++) {
        out += '<rect x="' + (8 + c * 14) + '" y="' + (30 + r * 14) + '" width="10" height="9" rx="1.5"/>';
      }
    }
    return out;
  }

  function defs(ctx) {
    var d = ctx.svg.querySelector('defs');
    if (d.querySelector('#opSkyGrad')) return;
    d.insertAdjacentHTML(
      'beforeend',
      '<linearGradient id="opSkyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1533"/><stop offset="1" stop-color="#27407e"/></linearGradient>' +
        '<linearGradient id="opFloorGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2f58"/><stop offset="1" stop-color="#1f1833"/></linearGradient>' +
        '<radialGradient id="opLampGlow"><stop offset="0" stop-color="#ffd38a" stop-opacity="0.35"/><stop offset="1" stop-color="#ffd38a" stop-opacity="0"/></radialGradient>'
    );
  }

  function startZzz(ctx) {
    return ctx.every(1500, function () {
      var h = ctx.pig.head();
      ctx.fx.zzz(h.x + 24, h.y - 30);
    });
  }

  async function play(ctx) {
    var T = ctx.T.opening;
    var M = ctx.M.opening;
    var pig = ctx.pig;
    var ball = set.ball;

    ctx.music('sleep', 1.5);
    ctx.ambience('room', 1);
    var snoring = true;
    (async function snoreLoop() {
      try {
        while (snoring) {
          ctx.sfx('snore');
          await ctx.wait(2600);
        }
      } catch (e) {}
    })();

    // slow cinematic push-in while it sleeps
    ctx.camera.to({ x: 180, y: 440, zoom: 1.22 }, T.sleepBeforeRoll + T.rollIn, 'inOutSine');
    await ctx.wait(T.sleepBeforeRoll);

    // 1. the ball rolls in and taps the bed. Ear twitch… nothing.
    await ball.roll(108, T.rollIn, 'outQuad');
    ctx.sfx('bounce', 0, 0.12);
    ctx.boom(ctx.M.signs.tok, 104, 512, { size: 16, color: '#fff6e9', rot: -6, hold: 400 });
    await ctx.wait(260);
    await pig.pose({ earL: -12 }, 90, 'outQuad');
    await pig.pose({ earL: 22 }, 260, 'outElastic');
    await ctx.wait(T.earTwitchPause);

    // 2. it rolls back out. Still nothing.
    await ball.roll(-30, T.rollBack, 'inOutSine');
    await ctx.wait(T.beforeDrop);

    // 3. it falls from the sky: BONK.
    var head = pig.head();
    ball.p.ground = null;
    ball.place(head.x - 6, -120);
    await ball.arc(head.x - 4, head.y - 30, 520, 0, { ease: 'inQuad', spin: 120 });
    snoring = false;
    set.stopZ();
    ctx.music('none', 0.05);
    ctx.sfx('bonk');
    ctx.fx.impact(head.x, head.y - 32, { size: 4 });
    ctx.fx.sparkle(head.x, head.y - 30, { count: 6, color: '#fff6e9' });
    ctx.camera.shake(7, 320);
    ctx.boom(ctx.M.signs.bonk, head.x + 52, head.y - 70, { size: 38, rot: -10, hold: 900 });
    pig.boing(1.2);
    pig.pose({ earL: -18, earR: -18, nod: 0, headTilt: 0 }, 120, 'outQuad');
    pig.setMode('idle');
    // ball bounces off onto the rug
    ball.p.ground = 560;
    ball.arc(250, 549, 620, 70, { spin: 420 }).then(function () {
      ctx.sfx('bounce', 0, 0.18);
      return ball.roll(262, 400);
    });
    await ctx.wait(420);
    await pig.pose({ earL: 8, earR: 8 }, 300, 'outBack');

    // 4. one eye opens… pause.
    await pig.express('oneEye', 160);
    await ctx.wait(T.oneEyePause);

    // 5. ball → camera → ball (both eyes now)
    await pig.express('neutral', 140);
    await pig.lookAt(262, 549, 180);
    await ctx.wait(T.lookPause);
    await pig.lookAtViewer(140);
    ctx.sfx('blip');
    await ctx.wait(T.lookPause);
    await pig.lookAt(262, 549, 140);
    await ctx.wait(T.lookPause * 0.7);
    pig.lookAtViewer(120);
    pig.express('surprised', 120);
    ctx.camera.to({ x: 180, y: 420, zoom: 1.45 }, 900, 'inOutCubic');
    await ctx.say(M.oh, { hold: T.ohHold });

    // 6. a glance at the calendar (the circled day glows)… it's today.
    await pig.lookAt(300, 200, 200);
    pulseCalendar(ctx);
    ctx.sfx('sparkle');
    await ctx.wait(700);
    await pig.lookAtViewer(160);
    await pig.express('determined', 200);
    ctx.sfx('heartbeat');
    ctx.music('tense', 0.6);
    await ctx.say(M.today, { hold: T.todayHold });
    await Promise.all([pig.stand(380), pig.pose({ armL: 8, armR: 8, legL: 0, legR: 0, tailWag: 0.6 }, 380)]);
    await ctx.tap();
  }

  function pulseCalendar(ctx) {
    var c = ctx.svg.querySelector('#op-circle');
    if (!c) return;
    var st = { k: 0 };
    var stop = A.onFrame(function () {
      var s = 1 + Math.sin(st.k * Math.PI) * 0.6;
      c.setAttribute('transform', 'translate(49 58) scale(' + s.toFixed(3) + ') translate(-49 -58)');
    });
    A.tween(st, { k: 3 }, 1200, 'linear').then(stop, stop);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  P.scenes.register({ id: 'opening', order: 10, title: 'Wake up', transition: 'fade', setup: setup, play: play });
})();

/*
 * Scene 11: The ending. Sunset on the training court. Sunglasses on.
 * Extremely serious. A cool walk away… stop… turn… one tiny hoof:
 * "And don't forget…" "I trained you." …and it trips over the netball.
 * Cut to black: "🐷: Professional coach."  "Good luck 😌🫂"
 */
(function () {
  'use strict';
  var P = window.PIGGY;
  var A = P.anim;

  var GROUND = 566;
  var BALL_X = 236;

  P.scenes.css(
    'ending',
    [
      '.en-coach{font:800 calc(var(--u)*24)/1.3 var(--font);color:#fff6e9}',
      '.en-bye{font:900 calc(var(--u)*34)/1.2 var(--font);color:#fff6e9;text-shadow:0 0 calc(var(--u)*24) rgba(247,168,189,.45)}',
    ].join('')
  );

  var set = {};

  function defs(ctx) {
    var d = ctx.svg.querySelector('defs');
    if (d.querySelector('#enSky')) return;
    d.insertAdjacentHTML(
      'beforeend',
      '<linearGradient id="enSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4f9e"/><stop offset="0.45" stop-color="#e98aa0"/><stop offset="0.8" stop-color="#ffb37a"/><stop offset="1" stop-color="#ffd59a"/></linearGradient>' +
        '<radialGradient id="enSun"><stop offset="0" stop-color="#fff2c4"/><stop offset="0.35" stop-color="#ffc77a" stop-opacity="0.9"/><stop offset="1" stop-color="#ffc77a" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="enCourt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4e8f78"/><stop offset="1" stop-color="#2d5a4e"/></linearGradient>'
    );
  }

  function setup(ctx) {
    defs(ctx);
    ctx.backdrop('#5a4f9e', '#2d5a4e');
    ctx.art('<rect x="-420" y="-400" width="1200" height="980" fill="url(#enSky)"/>', { layer: 'bg' });
    ctx.art('<circle cx="80" cy="440" r="170" fill="url(#enSun)"/><circle cx="80" cy="440" r="44" fill="#fff2c4"/>', { layer: 'bg', depth: 0.5 });
    ctx.art(
      // silhouette fence, trees and a light tower
      '<g fill="#3d3570" opacity="0.85">' +
        '<path d="M-420 470Q-200 430 0 460T420 450T780 470V560H-420Z" opacity="0.6"/>' +
        '<rect x="300" y="250" width="6" height="250"/><rect x="284" y="240" width="38" height="16" rx="3"/>' +
        '<circle cx="-150" cy="440" r="34"/><circle cx="-120" cy="430" r="26"/><circle cx="470" cy="440" r="30"/>' +
        '</g>' +
        '<g stroke="#3d3570" stroke-width="2" opacity="0.7">' +
        fence() +
        '</g>',
      { layer: 'bg', depth: 0.75 }
    );
    ctx.art(
      '<rect x="-420" y="540" width="1200" height="520" fill="url(#enCourt)"/>' +
        '<path d="M-420 560H780" stroke="#fff3df" stroke-width="3" opacity="0.7"/>' +
        '<ellipse cx="180" cy="640" rx="90" ry="22" fill="none" stroke="#fff3df" stroke-width="3" opacity="0.5"/>' +
        // long sunset shadows
        '<path d="M120 566L420 610L420 620L110 572Z" fill="#203f37" opacity="0.35"/>',
      { layer: 'bg' }
    );
    set.ball = ctx.props.ball(ctx.layers.actors, { x: BALL_X, y: GROUND - 11, ground: GROUND });
    var pig = ctx.pig;
    pig.outfit(true);
    pig.wear('shades', false);
    pig.place(150, GROUND, { scale: 1.2, facing: 1 });
    pig.express('proud', 0);
    pig.setMode('idle');
    ctx.camera.set({ x: 175, y: 400, zoom: 1.12 });
  }
  function fence() {
    var s = '<path d="M-420 488H780M-420 510H780"/>';
    for (var x = -420; x < 780; x += 24) s += '<path d="M' + x + ' 480V530"/>';
    return s;
  }

  // a temporary copy of the shades that drops onto the face
  function fallingShades(ctx, from, to, ms) {
    var g = A.svg('g', null, ctx.layers.front);
    g.innerHTML =
      '<path d="M-23 -6h18a3 3 0 0 1 3 3v4a7 7 0 0 1-7 7h-9a7 7 0 0 1-7-7v-5a2 2 0 0 1 2-2Z" fill="#14141f"/>' +
      '<path d="M5 -6h18a2 2 0 0 1 2 2v5a7 7 0 0 1-7 7h-9a7 7 0 0 1-7-7v-4a3 3 0 0 1 3-3Z" fill="#14141f"/>' +
      '<path d="M-2 -3h4" stroke="#14141f" stroke-width="3"/><path d="M-20 -3l6 0-9 9zM8 -3l6 0-9 9z" fill="#fff" opacity="0.3"/>';
    var st = { x: from.x, y: from.y, r: -20, s: ctx.pig.p.scale };
    var stop = A.onFrame(function () {
      g.setAttribute('transform', 'translate(' + st.x.toFixed(1) + ' ' + st.y.toFixed(1) + ') rotate(' + st.r.toFixed(1) + ') scale(' + st.s.toFixed(3) + ')');
    });
    return A.tween(st, { x: to.x, y: to.y, r: 0 }, ms, 'outBounce').then(
      function () {
        stop();
        g.remove();
      },
      function (e) {
        stop();
        g.remove();
        throw e;
      }
    );
  }

  async function play(ctx) {
    var T = ctx.T.ending;
    var M = ctx.M.ending;
    var pig = ctx.pig;
    var ball = set.ball;

    ctx.music('none', 0.5);
    ctx.ambience('room', 0.5, 1);
    ctx.ambience('crowd', 0, 0.5);
    await ctx.wait(500);

    // 1. sunglasses drop onto the face
    var eyes = pig.pointOn(pig.parts.head, 0, -88);
    pig.lookAt(pig.p.x, eyes.y - 100, 150);
    await fallingShades(ctx, { x: eyes.x, y: eyes.y - 160 }, eyes, T.shadesDrop);
    pig.wear('shades');
    pig.lookAtViewer(80);
    ctx.sfx('ding');
    glint(ctx, eyes.x + 12, eyes.y - 4);
    // 2. extremely serious
    await pig.express('serious', 200);
    ctx.music('training', 0.6);
    await ctx.wait(T.coolBeat);

    // 3. a cool walk away… stop… turn… one tiny hoof
    var steps = ctx.every(480, function () {
      ctx.sfx('footstep');
    });
    ctx.camera.to({ x: 150, y: 400, zoom: 1.12 }, T.strut, 'inOutSine');
    await pig.walkTo(72, T.strut, { cycle: 0.6, ease: 'inOutSine' });
    steps();
    await ctx.wait(T.stopBeat);
    ctx.music('none', 0.15);
    await A.tween(pig.p, { squash: 0.92 }, 90, 'outQuad');
    await A.tween(pig.p, { facing: 1, squash: 1 }, T.turn, 'outBack');
    await pig.pose({ armR: 70, headTilt: -4 }, 240, 'outBack');
    await ctx.wait(T.hoofBeat);
    await ctx.say(M.dontForget, { hold: T.dontForget });
    await ctx.wait(T.pause);
    await ctx.say(M.trainedYou, { hold: T.trainedYou });

    // 4. …a confident step forward, straight over the netball
    pig.pose({ armR: 8, headTilt: 0 }, 160);
    ctx.camera.to({ x: 232, y: 400, zoom: 1.12 }, 1100, 'inOutSine');
    await pig.walkTo(BALL_X - 22, 900, { cycle: 0.8 });
    ctx.sfx('slideDown');
    ball.roll(BALL_X + 70, 700);
    pig.wear('shades', false);
    var eyes2 = pig.pointOn(pig.parts.head, 0, -88);
    fallingShades(ctx, eyes2, { x: eyes2.x + 70, y: GROUND - 8 }, 700);
    await pig.fall();
    ctx.sfx('thud');
    ctx.camera.shake(6, 300);
    ctx.fx.puff(pig.p.x + 40, GROUND, { count: 8, color: '#f6e1c4' });
    var st = pig.head();
    ctx.fx.sparkle(st.x, st.y, { count: 6 });
    await ctx.wait(T.tripBeat);

    // 5. cut to black
    ctx.art('<rect x="-2000" y="-2000" width="4400" height="4400" fill="#05060c"/>', { layer: 'fx' });
    ctx.music('none', 0);
    ctx.ambience('room', 0, 0.2);
    await ctx.wait(T.blackBeat);
    ctx.sfx('pop');
    await ctx.caption(M.coach, { style: 'line', pos: 'center', y: 38, className: 'en-coach', enter: 'fade', hold: T.coachHold });
    ctx.music('warm', 1.5);
    ctx.caption(M.bye, { style: 'line', pos: 'center', y: 36, className: 'en-bye', enter: 'rise', stay: true });
    await ctx.wait(900);
  }

  function glint(ctx, x, y) {
    var g = A.svg('path', { d: 'M0-9L2-2 9 0 2 2 0 9-2 2-9 0-2-2Z', fill: '#ffffff' }, ctx.layers.fx);
    var st = { s: 0 };
    var stop = A.onFrame(function () {
      g.setAttribute('transform', 'translate(' + x + ' ' + y + ') rotate(' + (st.s * 90).toFixed(1) + ') scale(' + Math.sin(st.s * Math.PI).toFixed(3) + ')');
    });
    A.tween(st, { s: 1 }, 600, 'linear').then(
      function () {
        stop();
        g.remove();
      },
      function () {
        stop();
        g.remove();
      }
    );
  }

  P.scenes.register({ id: 'ending', order: 110, title: 'The end', transition: 'wipe', setup: setup, play: play });
})();

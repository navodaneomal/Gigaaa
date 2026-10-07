/*
 * Scene 9: The quiet moment. Straight after the celebration everything goes
 * silent and dark except one warm spotlight. The pig gets up, sets the trophy
 * down gently and walks toward you. No jokes. One line at a time:
 * "But listen…" "Winning is amazing." … "And enjoy every second of it."
 */
(function () {
  'use strict';
  var P = window.PIGGY;
  var A = P.anim;


  P.scenes.css(
    'quiet',
    [
      '.qt-line{font-size:calc(var(--u)*23)}',
      '.qt-line--small{font-size:calc(var(--u)*20);color:#f3dcc7}',
    ].join('')
  );

  var set = {};

  function setup(ctx) {
    var K = P.podiumKit;
    set.stage = K.build(ctx);
    // the end of scene 8: flat on its back, trophy on its belly
    K.fallenPose(ctx, 250);
    ctx.pig.outfit(true);
    ctx.pig.wear('shades', false);
    ctx.pig.pose({ armR: 92 }, 0);
    ctx.pig.express('proud', 0);
    ctx.pig.setMode('idle');
    ctx.camera.set({ x: 190, y: 440, zoom: 1.18 });
    var belly = K.bellyPoint(ctx);
    set.cup = ctx.props.trophy(ctx.layers.front, { x: belly.x + 6, y: belly.y - 6, scale: 0.92 });
    set.cup.p.rot = -4;
    // darkness that only the spotlight escapes (between the set and the pig)
    set.dark = ctx.art('<rect x="-420" y="-400" width="1200" height="1440" fill="#05040f"/>', { layer: 'mid' });
    set.dark.setAttribute('opacity', '0');
    set.spot = ctx.art('<ellipse cx="0" cy="0" rx="120" ry="26" fill="url(#pdSpot)"/><path d="M-26 -700L26 -700L120 0L-120 0Z" fill="url(#pdBeam)" opacity="0.5"/>', { layer: 'mid' });
    set.spot.setAttribute('opacity', '0');
  }

  async function play(ctx) {
    var T = ctx.T.quiet;
    var lines = ctx.M.quiet.lines;
    var pig = ctx.pig;
    var cup = set.cup;
    var K = P.podiumKit;

    // suddenly: silence. The lights go down to one soft spot.
    ctx.music('none', 0.12);
    ctx.ambience('crowd', 0, 0.4);
    ctx.ambience('room', 0.6, 1.5);
    var dim = { d: 0, s: 0 };
    var stopDim = ctx.loop(function () {
      set.dark.setAttribute('opacity', (dim.d * 0.82).toFixed(3));
      set.stage.beams.setAttribute('opacity', (1 - dim.d).toFixed(3));
      set.spot.setAttribute('opacity', dim.s.toFixed(3));
      set.spot.setAttribute('transform', 'translate(' + pig.p.x.toFixed(1) + ' ' + (pig.p.y + 2).toFixed(1) + ') scale(' + (0.8 + pig.p.scale * 0.3).toFixed(3) + ')');
    });
    A.tween(dim, { d: 1 }, 900, 'outQuad');
    A.tween(dim, { s: 1 }, 1400, 'inOutSine', { delay: 300 });
    await ctx.wait(T.hush);

    // it gets up, slowly, and sets the trophy down beside it
    pig.express('calm', 400);
    var lift = A.tween(cup.p, { x: 300, y: K.FLOOR, rot: 0 }, T.getUp, 'inOutSine');
    await Promise.all([pig.getUp(T.getUp), lift]);
    pig.pose({ armL: 8, armR: 8 }, 300);
    ctx.sfx('footstep');
    ctx.fx.sparkle(cup.p.x, cup.p.y - 70, { count: 3, color: '#fff3c6' });
    await ctx.wait(T.setDown);

    // walks toward you: closer and closer
    await pig.lookAtViewer(300);
    var steps = ctx.every(520, function () {
      ctx.sfx('footstep');
    });
    var headY = K.FLOOR - 108 * 1.3;
    await Promise.all([
      pig.walkTo(185, T.approach, { cycle: 0.6 }),
      A.tween(pig.p, { scale: 1.3, y: K.FLOOR + 4 }, T.approach, 'inOutSine'),
      ctx.camera.to({ x: 185, y: headY + 10, zoom: 1.95 }, T.approach, 'inOutSine'),
    ]);
    steps();
    pig.p.facing = 1;
    await pig.lookAtViewer(200);
    await pig.express('calm', 300);
    await ctx.wait(500);

    // one line at a time
    async function say(i, o) {
      o = o || {};
      var h = ctx.caption(lines[i], { style: 'soft', pos: 'upper', y: o.y || 20, className: 'qt-line' + (o.small ? ' qt-line--small' : ''), enter: 'rise', stay: true });
      await ctx.wait(o.hold || T.line);
      return { h: h };
    }
    var a = await say(0, { hold: T.line });
    a.h.hide();
    await ctx.wait(T.gap);
    pig.pose({ headTilt: -4 }, 600, 'inOutSine');
    a = await say(1, { hold: T.line });
    await ctx.wait(T.gap);
    var b = await say(2, { y: 29, hold: T.longLine, small: true });
    a.h.hide();
    b.h.hide();
    pig.pose({ headTilt: 0 }, 600, 'inOutSine');
    ctx.music('warm', 3);
    await ctx.wait(T.gap + 200);
    for (var i = 3; i <= 6; i++) {
      var c = await say(i, { hold: T.line - 200 });
      if (i === 4 || i === 6) pig.pose({ nod: 3 }, 220, 'outQuad').then(function () {
        return pig.pose({ nod: 0 }, 300, 'outBack');
      });
      c.h.hide();
      await ctx.wait(T.gap * 0.6);
    }
    pig.express('happy', 400);
    var last = await say(7, { hold: T.longLine });
    await ctx.tap();
    last.h.hide();
    stopDim();
  }

  P.scenes.register({ id: 'quiet', order: 90, title: 'Listen', transition: 'cut', setup: setup, play: play });
})();

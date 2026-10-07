/*
 * Scene 7: The final shot. Everything slows down and goes quiet. The pig
 * looks at the hoop, then at you: "For Chooty." HOLD TO SHOOT → the ball
 * floats in slow motion (the camera follows it) → SWISH → silence →
 * 🏆 WINNER: confetti, crowd, fanfare; jump, fall over, get up, celebrate again.
 */
(function () {
  'use strict';
  var P = window.PIGGY;
  var A = P.anim;


  var set = {};

  function setup(ctx) {
    var K = P.matchKit;
    var arena = K.buildArena(ctx);
    set.arena = arena;
    set.board = K.scoreboard(ctx, 0, 0);
    set.board.show();
    // the dizzy defender still on the floor, another one watching from behind
    set.d1 = K.globe(ctx.layers.actors, 60, K.GROUND, 1);
    A.set(set.d1.p, { rot: -90, dizzy: 1, squash: 0.9 });
    set.d2 = K.globe(ctx.layers.mid, 400, K.GROUND - 30, 0.85);
    set.mate = ctx.Pig.create(ctx.layers.mid, {});
    set.mate.place(-40, K.GROUND - 12, { scale: 0.68, facing: 1 });
    set.mate.outfit(true);
    set.mate.wear('headband', false);
    set.mate.express('surprised', 0);
    var pig = ctx.pig;
    pig.outfit(true);
    pig.wear('shades', false);
    pig.place(190, K.GROUND, { scale: 1.08, facing: 1 });
    pig.pose({ armR: 150, armL: 150 }, 0);
    pig.express('focused', 0);
    pig.setMode('idle');
    set.ball = ctx.props.ball(ctx.layers.actors, { x: 180, y: 400, ground: K.GROUND });
    set.hold = ctx.loop(function () {
      var h = pig.hand('R');
      set.ball.place(h.x - 8, h.y - 12);
    });
    ctx.camera.set({ x: 220, y: 410, zoom: 1.15 });
  }

  async function play(ctx) {
    var T = ctx.T.finalShot;
    var M = ctx.M.finalShot;
    var pig = ctx.pig;
    var post = set.arena.post;
    var ball = set.ball;
    var crowd = set.arena.crowd;

    // slow everything down; the court goes quiet
    ctx.music('none', 0.8);
    ctx.ambience('crowd', 0.08, 1.5);
    ctx.letterbox(true);
    ctx.slowmo(0.5, 500);
    crowd.cheer(false, 300);
    await ctx.camera.to({ x: 200, y: 440, zoom: 1.75 }, T.settle, 'inOutCubic');
    ctx.sfx('heartbeat');

    // look at the hoop… then at you
    await pig.lookAt(post.ring.x, post.ring.y, 260);
    await ctx.wait(T.lookHoop);
    ctx.sfx('heartbeat');
    await pig.lookAtViewer(260);
    await pig.express('calm', 200);
    await ctx.wait(T.lookYou * 0.5);
    await ctx.say(M.thought, { thought: true, hold: T.thoughtHold });
    pig.express('determined', 200);

    // HOLD TO SHOOT: the pig crouches as it charges
    ctx.slowmo(1, 200);
    var beat = ctx.every(700, function () {
      ctx.sfx('heartbeat');
    });
    await ctx.hold({
      label: M.prompt,
      icon: '🏐',
      onProgress: function (k) {
        pig.p.squash = 1 - 0.16 * k;
        pig.p.armL = pig.p.armR = 150 - 20 * k;
      },
    });
    beat();

    // release: jump & shoot, then slow motion while the camera follows the ball
    set.hold();
    ctx.sfx('whoosh');
    pig.jump({ height: 40, armsUp: true });
    await ctx.wait(140);
    ctx.slowmo(0.3, 250);
    var ring = post.ring;
    ball.p.ground = null;
    var follow = ctx.loop(function () {
      ctx.camera.state.x += (ball.p.x - ctx.camera.state.x) * 0.06;
      ctx.camera.state.y += (ball.p.y + 30 - ctx.camera.state.y) * 0.06;
    });
    A.tween(ctx.camera.state, { zoom: 1.5 }, T.flight, 'inOutSine');
    // up and over, then down through the ring (between the post's back and the net)
    await ball.arc(ring.x, ring.y - 6, T.flight, 150, { spin: 300 });
    await ball.arc(ring.x, ring.y + 40, 380, 0, { spin: 60 });
    follow();
    ctx.slowmo(1, 0);
    // SWISH
    post.swish();
    ctx.sfx('swish');
    ctx.flash('#ffffff', 300);
    ball.p.ground = P.matchKit.GROUND;
    ball.bounce(P.matchKit.GROUND, 700);
    await ctx.caption(M.swish, { style: 'title', pos: 'upper', enter: 'slam', hold: T.swishHold });
    // a beat of total silence
    await ctx.wait(T.silence);

    // 🏆 WINNER
    ctx.letterbox(false);
    ctx.camera.to({ x: 190, y: 400, zoom: 1.12 }, 500, 'outCubic');
    ctx.flash('#fff3c6', 500);
    ctx.music('victory', 0.2);
    ctx.ambience('crowd', 1, 0.3);
    ctx.sfx('fanfare');
    ctx.sfx('cheer', 0.05, 3.5);
    crowd.cheer(true, 200);
    set.board.set(1, 0);
    var winner = ctx.caption(M.winner, { style: 'big', pos: 'upper', enter: 'slam', stay: true });
    burst(ctx);
    var confettiLoop = ctx.every(650, function () {
      burst(ctx, 40);
    });
    // the globes and the teammate join in
    set.mate.walkTo(90, 900, { run: true }).then(function () {
      set.mate.celebrate(1600);
    });
    A.tween(set.d2.p, { armUp: 1 }, 300);
    // jump, fall over, get back up, celebrate again
    pig.express('joy', 100);
    await pig.jump({ height: 52, armsUp: true });
    ctx.sfx('slideDown');
    await pig.fall({ backward: true });
    ctx.sfx('thud');
    ctx.camera.shake(4, 220);
    await ctx.wait(500);
    await pig.getUp(480);
    ctx.sfx('boing');
    await pig.celebrate(T.celebrate);
    confettiLoop();
    await ctx.wait(T.winnerHold * 0.4);
    winner.hide();
    await ctx.tap();
  }

  function burst(ctx, n) {
    var cam = ctx.camera.state;
    ctx.fx.confetti(cam.x - 120, cam.y - 240, { count: n || 90, power: 600, direction: -Math.PI / 3 });
    ctx.fx.confetti(cam.x + 120, cam.y - 240, { count: n || 90, power: 600, direction: (-2 * Math.PI) / 3 });
  }

  P.scenes.register({ id: 'finalShot', order: 70, title: 'Final shot', transition: 'cut', setup: setup, play: play });
})();

/*
 * Scene 5: The four-day journey. One long panoramic world with four little
 * dioramas side by side; the camera tracks right between them on each swipe.
 *   DAY 1 stadium entrance: nervous → a big deep breath → "Step onto the court."
 *   DAY 2 sunny corridor: confident dribbling → "Trust what you practised."
 *   DAY 3 locker room: tired, sits, breathes, stands → "Even strong players need a breath." "Keep going."
 *   DAY 4 giant doors open onto light and noise → "This is your moment." → walks into the light.
 */
(function () {
  'use strict';
  var P = window.PIGGY;
  var A = P.anim;

  var SPAN = 640; // distance between dioramas
  var GROUND = 566;
  var SCALE = 1.18;

  var DEFAULTS = {
    enter: 1500, // walk into day 1
    nervous: 1300,
    inhale: 1100,
    exhale: 700,
    titleHold: 900,
    lineHold: 1700,
    travel: 2000, // pan to the next day
    dribbleWalk: 2600,
    sitBeat: 1600,
    standBeat: 600,
    doorsOpen: 1400,
    intoLight: 1900,
  };

  var set = {};

  P.scenes.css(
    'days',
    [
      '.dy-card{font:italic 800 calc(var(--u)*46)/.95 var(--font-sport);text-transform:uppercase;color:#fff;',
      'text-shadow:calc(var(--u)*3) calc(var(--u)*3) 0 #e66f92,0 calc(var(--u)*6) calc(var(--u)*16) rgba(0,0,0,.3)}',
      '.dy-card .cap__text::before{content:"";display:block;width:calc(var(--u)*40);height:calc(var(--u)*4);margin:0 auto calc(var(--u)*8);border-radius:4px;background:#ffcf4d}',
      '.dy-line{font-size:calc(var(--u)*24)}',
      '.dy-line .cap__text{padding:calc(var(--u)*6) calc(var(--u)*14);border-radius:calc(var(--u)*14);background:rgba(11,16,40,.5)}',
    ].join('')
  );

  function x0(i) {
    return i * SPAN;
  }

  /* ---------------- art ---------------- */
  function defs(ctx) {
    var d = ctx.svg.querySelector('defs');
    if (d.querySelector('#dySky1')) return;
    d.insertAdjacentHTML(
      'beforeend',
      '<linearGradient id="dySky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fc9ff"/><stop offset="0.65" stop-color="#d9ecff"/><stop offset="1" stop-color="#ffe6c4"/></linearGradient>' +
        '<linearGradient id="dyWall2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe9cf"/><stop offset="1" stop-color="#f3d5ad"/></linearGradient>' +
        '<linearGradient id="dyWall3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3d74"/><stop offset="1" stop-color="#5a4f86"/></linearGradient>' +
        '<linearGradient id="dyHall4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#080c1d"/><stop offset="1" stop-color="#1a2150"/></linearGradient>' +
        '<linearGradient id="dyWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8b47a"/><stop offset="1" stop-color="#c98c52"/></linearGradient>' +
        '<linearGradient id="dyBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d6" stop-opacity="0.55"/><stop offset="1" stop-color="#fff6d6" stop-opacity="0"/></linearGradient>' +
        '<radialGradient id="dyGlow"><stop offset="0" stop-color="#fff6d6" stop-opacity="0.95"/><stop offset="0.4" stop-color="#ffe9a8" stop-opacity="0.45"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="dySun"><stop offset="0" stop-color="#fff7cf"/><stop offset="0.35" stop-color="#ffe69a" stop-opacity="0.8"/><stop offset="1" stop-color="#ffe69a" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="dyEvening" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb070" stop-opacity="0.5"/><stop offset="1" stop-color="#ffb070" stop-opacity="0"/></linearGradient>'
    );
  }

  // DAY 1: stadium entrance on a fresh morning
  function day1(ctx) {
    var o = x0(0);
    ctx.art(
      '<rect x="' + (o - 460) + '" y="-400" width="' + (SPAN + 320) + '" height="1440" fill="url(#dySky1)"/>' +
        '<circle cx="' + (o + 60) + '" cy="130" r="110" fill="url(#dySun)"/>',
      { layer: 'bg' }
    );
    // drifting clouds (parallax)
    ctx.art(cloud(o + 40, 120, 1.1) + cloud(o + 250, 70, 0.8) + cloud(o + 420, 150, 0.9), { layer: 'bg', depth: 0.6 });
    ctx.art(
      // stadium facade
      '<g transform="translate(' + (o + 180) + ' 0)">' +
        '<path d="M-250 560V300Q0 210 250 300V560Z" fill="#eef2fa"/>' +
        '<path d="M-250 330Q0 240 250 330" fill="none" stroke="#1d2a66" stroke-width="12"/>' +
        '<path d="M-250 352Q0 262 250 352" fill="none" stroke="#e66f92" stroke-width="5"/>' +
        '<g fill="#c9d6f0">' +
        windowsRow(-220, 380, 9, 50) +
        '</g>' +
        // banner
        '<rect x="-150" y="250" width="300" height="38" rx="8" fill="#1d2a66"/>' +
        '<rect x="-146" y="254" width="292" height="30" rx="6" fill="none" stroke="#ffcf4d" stroke-width="1.5"/>' +
        '<text x="0" y="276" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-style="italic" font-weight="800" font-size="20" letter-spacing="1" fill="#fff">ALL-ISLAND NETBALL</text>' +
        // entrance
        '<rect x="-46" y="450" width="92" height="110" rx="6" fill="#1d2a66"/>' +
        '<rect x="-40" y="456" width="40" height="104" fill="#7fb7ff" opacity="0.55"/><rect x="2" y="456" width="38" height="104" fill="#7fb7ff" opacity="0.4"/>' +
        '<path d="M-36 470l26 30M8 470l26 30" stroke="#fff" stroke-width="3" opacity="0.5"/>' +
        '<rect x="-70" y="556" width="140" height="8" rx="3" fill="#cdd5e6"/><rect x="-82" y="562" width="164" height="8" rx="3" fill="#bcc6db"/>' +
        '</g>' +
        // flag poles
        flag(o - 10, 330, '#e66f92') +
        flag(o + 370, 330, '#5fd3b3') +
        // pavement
        '<rect x="' + (o - 460) + '" y="560" width="' + (SPAN + 320) + '" height="500" fill="#cfd6e3"/>' +
        '<path d="M' + (o - 460) + ' 600H' + (o + 180) + '" stroke="#bac3d6" stroke-width="2"/>' +
        '<g fill="#5fd3b3">' +
        bush(o - 90, 562) +
        bush(o + 440, 562) +
        '</g>' +
        // team bus peeking in
        '<g transform="translate(' + (o - 210) + ' 470)"><rect x="0" y="0" width="150" height="80" rx="16" fill="#ffcf4d"/>' +
        '<rect x="12" y="12" width="126" height="28" rx="6" fill="#bfe3ff"/><text x="75" y="64" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="16" fill="#1d2a66">TEAM</text>' +
        '<circle cx="34" cy="82" r="13" fill="#1b1630"/><circle cx="118" cy="82" r="13" fill="#1b1630"/></g>',
      { layer: 'bg' }
    );
    set.flags = ctx.svg.querySelectorAll('.dy-flag');
  }

  // DAY 2: a sunny corridor / warm-up court
  function day2(ctx) {
    var o = x0(1);
    ctx.art(
      '<rect x="' + (o - 140) + '" y="-400" width="' + SPAN + '" height="1440" fill="url(#dyWall2)"/>' +
        // tall windows with light
        windowTall(o - 60, 150) +
        windowTall(o + 180, 150) +
        windowTall(o + 420, 150) +
        '<path d="M' + (o - 60) + ' 380L' + (o + 30) + ' 380L' + (o + 120) + ' 600L' + (o - 10) + ' 600Z" fill="url(#dyBeam)"/>' +
        '<path d="M' + (o + 180) + ' 380L' + (o + 270) + ' 380L' + (o + 360) + ' 600L' + (o + 230) + ' 600Z" fill="url(#dyBeam)"/>' +
        // pennants
        pennants(o - 120, 120, 12) +
        // poster
        '<g transform="translate(' + (o + 300) + ' 420) rotate(-3)"><rect x="0" y="0" width="56" height="74" rx="4" fill="#fff"/><circle cx="28" cy="30" r="14" fill="#7fb7ff"/><path d="M14 30h28M28 16v28" stroke="#fff" stroke-width="2"/><text x="28" y="64" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="11" fill="#e66f92">GO TEAM</text></g>' +
        // bench
        '<g transform="translate(' + (o + 40) + ' 520)"><rect x="0" y="0" width="120" height="10" rx="4" fill="#8a6c3e"/><rect x="10" y="10" width="8" height="34" fill="#6b5232"/><rect x="102" y="10" width="8" height="34" fill="#6b5232"/>' +
        '<rect x="20" y="-14" width="26" height="14" rx="4" fill="#5fd3b3"/><rect x="74" y="-22" width="10" height="22" rx="3" fill="#e66f92"/></g>' +
        // wooden floor
        '<rect x="' + (o - 140) + '" y="560" width="' + SPAN + '" height="500" fill="url(#dyWood)"/>' +
        '<g stroke="#c08550" stroke-width="2" opacity="0.6">' +
        planks(o - 140, o + 500) +
        '</g>' +
        '<path d="M' + (o - 140) + ' 600H' + (o + 500) + '" stroke="#fff" stroke-width="4" opacity="0.8"/>' +
        // pillar divider
        '<rect x="' + (o - 150) + '" y="-400" width="22" height="1440" fill="#d9bf98"/>',
      { layer: 'bg' }
    );
  }

  // DAY 3: locker room in the late afternoon
  function day3(ctx) {
    var o = x0(2);
    ctx.art(
      '<rect x="' + (o - 140) + '" y="-400" width="' + SPAN + '" height="1440" fill="url(#dyWall3)"/>' +
        // high window with evening light
        '<rect x="' + (o + 260) + '" y="150" width="130" height="60" rx="6" fill="#ffb070" opacity="0.85"/>' +
        '<path d="M' + (o + 325) + ' 150v60" stroke="#3a3d74" stroke-width="5"/>' +
        '<path d="M' + (o + 260) + ' 210L' + (o + 390) + ' 210L' + (o + 220) + ' 600L' + (o - 40) + ' 600Z" fill="url(#dyEvening)"/>' +
        // lockers
        lockers(o - 120, 270, 9) +
        // bench
        '<g transform="translate(' + (o + 90) + ' 528)"><rect x="0" y="0" width="190" height="14" rx="5" fill="#a8743f"/><rect x="0" y="0" width="190" height="5" rx="2" fill="#c48d55"/>' +
        '<rect x="16" y="14" width="10" height="26" fill="#7d5432"/><rect x="164" y="14" width="10" height="26" fill="#7d5432"/>' +
        '<path d="M150 0c0-10 10-14 22-12 6 1 10 6 10 12Z" fill="#fff6e9"/></g>' +
        // tiled floor
        '<rect x="' + (o - 140) + '" y="562" width="' + SPAN + '" height="500" fill="#4a3f6e"/>' +
        '<g stroke="#5d5285" stroke-width="2">' +
        tiles(o - 140, o + 500) +
        '</g>' +
        '<rect x="' + (o - 150) + '" y="-400" width="22" height="1440" fill="#2b2d5a"/>',
      { layer: 'bg' }
    );
    // water bottle on the floor
    ctx.art('<g transform="translate(' + (o + 300) + ' 566)"><rect x="-6" y="-30" width="12" height="30" rx="4" fill="#7fb7ff"/><rect x="-4" y="-36" width="8" height="7" rx="2" fill="#1d2a66"/></g>', { layer: 'mid' });
  }

  // DAY 4: the giant doors to the competition court
  function day4(ctx) {
    var o = x0(3);
    var cx = o + 180;
    ctx.art(
      '<rect x="' + (o - 140) + '" y="-400" width="' + (SPAN + 460) + '" height="1440" fill="url(#dyHall4)"/>' +
        // light leaking under/around the doors
        '<rect x="' + (cx - 112) + '" y="186" width="224" height="380" rx="10" fill="#fff3c6" opacity="0.18"/>' +
        '<g id="dy-glow"><circle cx="' + cx + '" cy="380" r="260" fill="url(#dyGlow)" opacity="0"/></g>' +
        '<g id="dy-rays" opacity="0">' +
        rays(cx, 380) +
        '</g>' +
        // door frame
        '<rect x="' + (cx - 124) + '" y="176" width="248" height="392" rx="14" fill="#2b3474"/>' +
        '<rect x="' + (cx - 112) + '" y="188" width="224" height="380" rx="8" fill="#fff6d6"/>' +
        // the arena beyond (seen when open)
        '<g opacity="0.9"><rect x="' + (cx - 112) + '" y="420" width="224" height="148" fill="#f4dfa6"/>' +
        '<g fill="#e9b75a">' +
        crowdDots(cx - 104, 300, 13) +
        '</g></g>' +

        // floor
        '<rect x="' + (o - 140) + '" y="564" width="' + (SPAN + 460) + '" height="500" fill="#121838"/>' +
        '<path d="M' + (cx - 112) + ' 566L' + (cx + 112) + ' 566L' + (cx + 260) + ' 1000L' + (cx - 260) + ' 1000Z" fill="#fff3c6" opacity="0.08" id="dy-floorlight"/>' +
        '<rect x="' + (o - 150) + '" y="-400" width="22" height="1440" fill="#3a3d74"/>',
      { layer: 'bg' }
    );
    // the two door leaves (front of the light), hinged at their outer edges
    var doors = ctx.art(
      '<g id="dy-doorL"><rect x="' + (cx - 112) + '" y="188" width="112" height="380" fill="#3b4aa0"/>' +
        '<rect x="' + (cx - 100) + '" y="210" width="86" height="150" rx="6" fill="none" stroke="#5c6cc4" stroke-width="4"/>' +
        '<rect x="' + (cx - 100) + '" y="384" width="86" height="160" rx="6" fill="none" stroke="#5c6cc4" stroke-width="4"/>' +
        '<rect x="' + (cx - 22) + '" y="350" width="8" height="54" rx="4" fill="#ffcf4d"/>' +
        '<path d="M' + (cx - 112) + ' 300h112" stroke="#e66f92" stroke-width="6"/></g>' +
        '<g id="dy-doorR"><rect x="' + cx + '" y="188" width="112" height="380" fill="#34439a"/>' +
        '<rect x="' + (cx + 14) + '" y="210" width="86" height="150" rx="6" fill="none" stroke="#5c6cc4" stroke-width="4"/>' +
        '<rect x="' + (cx + 14) + '" y="384" width="86" height="160" rx="6" fill="none" stroke="#5c6cc4" stroke-width="4"/>' +
        '<rect x="' + (cx + 14) + '" y="350" width="8" height="54" rx="4" fill="#ffcf4d"/>' +
        '<path d="M' + cx + ' 300h112" stroke="#e66f92" stroke-width="6"/></g>' +
        '<rect x="' + (cx - 1.5) + '" y="188" width="3" height="380" fill="#fff6d6" id="dy-seam"/>',
      { layer: 'bg' }
    );
    set.doorL = doors.querySelector('#dy-doorL');
    set.doorR = doors.querySelector('#dy-doorR');
    set.seam = doors.querySelector('#dy-seam');
    set.glow = ctx.svg.querySelector('#dy-glow circle');
    set.rays = ctx.svg.querySelector('#dy-rays');
    set.doorCx = cx;
  }

  /* -------- little drawing helpers -------- */
  function cloud(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="#fff" opacity="0.92"><ellipse cx="0" cy="0" rx="34" ry="14"/><circle cx="-12" cy="-8" r="14"/><circle cx="10" cy="-12" r="17"/></g>';
  }
  function windowsRow(x, y, n, step) {
    var s = '';
    for (var i = 0; i < n; i++) s += '<rect x="' + (x + i * step) + '" y="' + y + '" width="30" height="40" rx="4"/>';
    return s;
  }
  function flag(x, y, color) {
    return '<g transform="translate(' + x + ' ' + y + ')"><rect x="-2" y="0" width="4" height="232" fill="#9aa4b8"/><path class="dy-flag" d="M2 4h42l-10 14 10 14H2Z" fill="' + color + '"/></g>';
  }
  function bush(x, y) {
    return '<g transform="translate(' + x + ' ' + y + ')"><circle cx="-16" cy="-12" r="16"/><circle cx="6" cy="-20" r="20"/><circle cx="26" cy="-10" r="14"/></g>';
  }
  function windowTall(x, y) {
    return '<g transform="translate(' + x + ' ' + y + ')"><rect x="0" y="0" width="90" height="230" rx="45" fill="#fff8e6"/><rect x="6" y="6" width="78" height="218" rx="39" fill="#bfe3ff"/><path d="M45 6v218M6 120h78" stroke="#fff8e6" stroke-width="5"/></g>';
  }
  function pennants(x, y, n) {
    var s = '<path d="M' + x + ' ' + y + 'Q' + (x + n * 25) + ' ' + (y + 40) + ' ' + (x + n * 50) + ' ' + y + '" fill="none" stroke="#8a6c3e" stroke-width="2"/>';
    var cols = ['#e66f92', '#ffcf4d', '#5fd3b3', '#7fb7ff'];
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n;
      var px = x + t * n * 50;
      var py = y + 4 * 20 * t * (1 - t) * 2;
      s += '<path d="M' + (px - 10) + ' ' + py + 'h20l-10 18Z" fill="' + cols[i % 4] + '"/>';
    }
    return s;
  }
  function planks(a, b) {
    var s = '';
    for (var x = a; x < b; x += 60) s += '<path d="M' + x + ' 560v500"/>';
    return s;
  }
  function tiles(a, b) {
    var s = '';
    for (var x = a; x < b; x += 40) s += '<path d="M' + x + ' 562v500"/>';
    for (var y = 600; y < 1000; y += 40) s += '<path d="M' + a + ' ' + y + 'H' + b + '"/>';
    return s;
  }
  function lockers(x, y, n) {
    var s = '';
    var cols = ['#5f72c4', '#6b7fd1'];
    for (var i = 0; i < n; i++) {
      var lx = x + i * 50;
      s +=
        '<g transform="translate(' + lx + ' ' + y + ')"><rect x="0" y="0" width="46" height="292" rx="4" fill="' + cols[i % 2] + '"/>' +
        '<path d="M8 20h30M8 28h30M8 36h30" stroke="#4a5aa8" stroke-width="3" stroke-linecap="round"/>' +
        '<rect x="36" y="130" width="5" height="22" rx="2" fill="#ffcf4d"/>' +
        '<rect x="13" y="200" width="20" height="14" rx="3" fill="#fff6e9" opacity="0.7"/></g>';
    }
    return s;
  }
  function rays(cx, cy) {
    var s = '';
    for (var i = 0; i < 9; i++) {
      var a = -60 + i * 15;
      s += '<path d="M' + cx + ' ' + cy + 'L' + (cx - 30) + ' ' + (cy + 640) + 'L' + (cx + 30) + ' ' + (cy + 640) + 'Z" fill="url(#dyBeam)" transform="rotate(' + a + ' ' + cx + ' ' + cy + ')"/>';
    }
    return s;
  }
  function crowdDots(x, y, n) {
    var s = '';
    for (var r = 0; r < 4; r++) for (var i = 0; i < n; i++) s += '<circle cx="' + (x + 8 + i * 16 + (r % 2) * 8) + '" cy="' + (y + r * 26) + '" r="7"/>';
    return s;
  }

  /* ---------------- scene ---------------- */
  function setup(ctx) {
    defs(ctx);
    ctx.backdrop('#0b1020', '#0b1020');
    day1(ctx);
    day2(ctx);
    day3(ctx);
    day4(ctx);
    // flags wave
    ctx.loop(function (dt, clock) {
      for (var i = 0; i < set.flags.length; i++) {
        set.flags[i].setAttribute('transform', 'skewY(' + (Math.sin(clock * 4 + i) * 6).toFixed(2) + ')');
      }
    });
    var pig = ctx.pig;
    pig.outfit(true);
    pig.wear('shades', false);
    pig.place(-80, GROUND, { scale: SCALE, facing: 1 });
    pig.express('neutral', 0);
    pig.setMode('idle');
    ctx.camera.set({ x: 180, y: 380, zoom: 1 });
  }

  async function dayTitle(ctx, d, T) {
    var card = ctx.caption(d.title, { style: 'title', pos: 'top', className: 'dy-card', stay: true, enter: 'slam' });
    ctx.sfx('whoosh');
    await ctx.wait(T.titleHold);
    return { card: card }; // (the handle itself is thenable, so don't return it from an async fn)
  }
  async function dayLines(ctx, d, T) {
    for (var i = 0; i < d.lines.length; i++) {
      await ctx.caption(d.lines[i], { style: 'line', pos: 'upper', y: 25, className: 'dy-line', enter: 'rise', hold: T.lineHold });
    }
  }

  // walk the pig right while the camera pans to the next diorama
  async function travel(ctx, toIndex, T, run) {
    var pig = ctx.pig;
    var target = x0(toIndex) + 40;
    var dust = ctx.every(140, function () {
      if (run) ctx.fx.puff(pig.p.x - 18, GROUND, { count: 2, size: 0.7, color: '#ffffff' });
    });
    await Promise.all([pig.walkTo(target, T.travel, { run: run, cycle: run ? 1 : 1.2 }), ctx.camera.to({ x: x0(toIndex) + 180, y: 380, zoom: 1 }, T.travel, 'inOutSine')]);
    dust();
  }

  async function play(ctx) {
    var T = Object.assign({}, DEFAULTS, ctx.T.days);
    var M = ctx.M.days;
    var pig = ctx.pig;
    var days = M.list;

    ctx.music('playful', 0.8);
    ctx.ambience('room', 0.4);

    /* ---- DAY 1 ---- */
    await pig.walkTo(130, T.enter, { cycle: 0.9 });
    var card = (await dayTitle(ctx, days[0], T)).card;
    // nervous: ears down, sweat, a little shiver
    pig.express('nervous', 200);
    ctx.fx.sweat(pig.head().x + 26, pig.head().y - 10, 1);
    await pig.lookAt(180, 300, 200);
    var shiver = ctx.loop(function (dt, clock) {
      pig.p.tilt = Math.sin(clock * 40) * 1.4;
    });
    await ctx.wait(T.nervous);
    shiver();
    pig.p.tilt = 0;
    // the deep breath
    await pig.lookAtViewer(150);
    pig.pose({ eyeStyleL: 'closed', eyeStyleR: 'closed', mouth: 'tiny', earL: -6, earR: -6 }, 0);
    ctx.sfx('whoosh');
    await A.tween(pig.p, { squash: 1.1, armL: 26, armR: 26 }, T.inhale, 'inOutSine');
    await ctx.wait(250);
    pig.pose({ mouth: 'o' }, 0);
    ctx.fx.puff(pig.head().x + 6, pig.head().y + 18, { count: 4, size: 0.6, angle: -0.3, spread: 0.8, color: '#ffffff' });
    await A.tween(pig.p, { squash: 0.97, armL: 8, armR: 8 }, T.exhale, 'outQuad');
    await pig.express('determined', 200);
    A.tween(pig.p, { squash: 1 }, 300, 'outBack');
    await dayLines(ctx, days[0], T);
    // a step toward the doors (into the depth of the picture)
    await Promise.all([pig.walkTo(180, 900, { cycle: 0.9 }), A.tween(pig.p, { scale: SCALE * 0.9, y: GROUND - 8 }, 900, 'inOutSine')]);
    card.hide();
    await ctx.swipe({ label: M.prompt });

    /* ---- DAY 2 ---- */
    A.tween(pig.p, { scale: SCALE, y: GROUND }, 400, 'outQuad');
    pig.express('happy', 200);
    ctx.music('training', 1);
    await travel(ctx, 1, T, true);
    card = (await dayTitle(ctx, days[1], T)).card;
    // confident dribble across the corridor
    pig.express('proud', 200);
    pig.p.tailWag = 1;
    var ball = ctx.props.ball(ctx.layers.actors, { x: pig.p.x + 30, y: GROUND - 60, ground: GROUND });
    var period = 0.5; // seconds per bounce
    var tB = 0;
    var lastDown = false;
    var dribble = ctx.loop(function (dt) {
      tB += dt;
      var ph = (tB % period) / period; // 0..1
      var down = ph < 0.5;
      var k = down ? ph / 0.5 : 1 - (ph - 0.5) / 0.5; // 0 at hand, 1 at floor
      var handY = GROUND - 62 * pig.p.scale;
      ball.p.x = pig.p.x + 30 * pig.p.facing;
      ball.p.y = handY + (GROUND - ball.r - handY) * (down ? k * k : 1 - (1 - k) * (1 - k));
      ball.p.rot += dt * 240;
      pig.p.armR = 40 + (1 - k) * 22;
      if (down && k > 0.95 && !lastDown) {
        lastDown = true;
        ctx.sfx('bounce', 0, 0.16);
      }
      if (!down) lastDown = false;
    });
    var walk = pig.walkTo(x0(1) + 250, T.dribbleWalk, { cycle: 0.85 });
    ctx.camera.to({ x: x0(1) + 200, y: 380, zoom: 1.05 }, T.dribbleWalk, 'inOutSine');
    await ctx.wait(600);
    await dayLines(ctx, days[1], T);
    await walk;
    dribble();
    // catch it and spin it on a hoof
    await ball.arc(pig.hand('R').x, pig.hand('R').y - 26, 280, 30, { spin: 200 });
    pig.pose({ armR: 160 }, 200, 'outBack');
    var spin = ctx.loop(function (dt) {
      var h = pig.hand('R');
      ball.p.x = h.x;
      ball.p.y = h.y - 14;
      ball.p.rot += dt * 900;
    });
    ctx.sfx('sparkle');
    pig.express('happy', 160);
    card.hide();
    await ctx.swipe({ label: M.prompt });
    spin();
    ball.destroy();
    pig.pose({ armR: 8 }, 200);

    /* ---- DAY 3 ---- */
    ctx.music('warm', 1.2);
    pig.p.tailWag = 0.2;
    pig.express('tired', 300);
    await travel(ctx, 2, T, false);
    // slow, heavy steps to the bench
    await pig.walkTo(x0(2) + 160, 1300, { cycle: 0.55 });
    ctx.fx.sweat(pig.head().x + 26, pig.head().y - 6, 1);
    card = (await dayTitle(ctx, days[2], T)).card;
    // sit on the bench
    pig.setMode('idle');
    await A.tween(pig.p, { y: 540, lift: 0, squash: 0.86, legL: 8, legR: 8, nod: 4, armL: 20, armR: 20 }, 520, 'outCubic');
    ctx.sfx('thud');
    pig.pose({ earL: 34, earR: 34, eyeL: 0.35, eyeR: 0.35 }, 400);
    await ctx.caption(days[2].lines[0], { style: 'line', pos: 'upper', y: 25, className: 'dy-line', enter: 'rise', hold: T.lineHold });
    // a long breath, eyes closed
    pig.pose({ eyeStyleL: 'closed', eyeStyleR: 'closed', mouth: 'tiny' }, 0);
    await A.tween(pig.p, { squash: 0.92 }, T.sitBeat * 0.5, 'inOutSine');
    await A.tween(pig.p, { squash: 0.86 }, T.sitBeat * 0.5, 'inOutSine');
    // …and back up
    pig.pose({ eyeStyleL: 'open', eyeStyleR: 'open' }, 0);
    await pig.express('determined', 200);
    ctx.sfx('boing');
    await A.tween(pig.p, { y: GROUND, squash: 1, legL: 0, legR: 0, nod: 0, armL: 8, armR: 8 }, 380, 'outBack');
    pig.pose({ earL: -6, earR: -6 }, 200, 'outBack');
    // tighten the headband
    await pig.pose({ armR: -150, headTilt: -4 }, 220, 'outBack');
    ctx.sfx('zip');
    await ctx.wait(T.standBeat);
    pig.pose({ armR: 8, headTilt: 0 }, 260, 'outBack');
    await ctx.caption(days[2].lines[1], { style: 'title', pos: 'upper', y: 25, enter: 'slam', hold: T.lineHold });
    card.hide();
    await ctx.swipe({ label: M.prompt });

    /* ---- DAY 4 ---- */
    ctx.music('tense', 1);
    ctx.ambience('crowd', 0.25, 1);
    pig.express('focused', 200);
    await travel(ctx, 3, T, false);
    // low, heroic angle on the doors
    await Promise.all([pig.walkTo(set.doorCx - 10, 1200, { cycle: 0.8 }), ctx.camera.to({ x: set.doorCx, y: 400, zoom: 1.02 }, 1200, 'inOutSine')]);
    card = (await dayTitle(ctx, days[3], T)).card;
    await ctx.wait(300);
    // the doors swing open
    ctx.sfx('drumroll', 0, 1.1);
    await ctx.wait(1000);
    ctx.sfx('whoosh');
    ctx.sfx('cheer', 0.1, 3);
    ctx.ambience('crowd', 1, 1.2);
    ctx.flash('#fff3d0', 700);
    ctx.camera.shake(3, 400);
    var cx = set.doorCx;
    var st = { k: 0 };
    var stopDoors = ctx.loop(function () {
      var k = st.k;
      set.doorL.setAttribute('transform', 'translate(' + (cx - 112) + ' 0) scale(' + (1 - 0.82 * k).toFixed(3) + ' 1) translate(' + -(cx - 112) + ' 0)');
      set.doorR.setAttribute('transform', 'translate(' + (cx + 112) + ' 0) scale(' + (1 - 0.82 * k).toFixed(3) + ' 1) translate(' + -(cx + 112) + ' 0)');
      set.seam.setAttribute('opacity', (1 - k).toFixed(3));
      set.glow.setAttribute('opacity', k.toFixed(3));
      set.rays.setAttribute('opacity', (k * 0.9).toFixed(3));
      set.rays.setAttribute('transform', 'rotate(' + (Math.sin(A.clock() * 0.6) * 3).toFixed(2) + ' ' + cx + ' 380)');
    });
    pig.express('surprised', 150);
    await A.tween(st, { k: 1 }, T.doorsOpen, 'outCubic');
    pig.express('determined', 300);
    ctx.music('training', 1.5);
    card.hide();
    await ctx.caption(days[3].lines[0], { style: 'big', pos: 'top', enter: 'slam', hold: T.lineHold + 300 });
    // into the light
    ctx.fx.sparkle(cx, 420, { count: 12, power: 1.5, color: '#fff6d6' });
    await Promise.all([
      pig.walkTo(cx, T.intoLight, { cycle: 0.9 }),
      A.tween(pig.p, { scale: SCALE * 0.55, y: 548 }, T.intoLight, 'inQuad'),
      A.tween(pig.p, { opacity: 0 }, T.intoLight * 0.6, 'inQuad', { delay: T.intoLight * 0.4 }),
      ctx.camera.to({ x: cx, y: 380, zoom: 1.25 }, T.intoLight, 'inCubic'),
    ]);
    stopDoors();
    ctx.flash('#ffffff', 600);
    await ctx.wait(300);
  }

  P.scenes.register({ id: 'days', order: 50, title: 'Four days', transition: 'fade', setup: setup, play: play });
})();

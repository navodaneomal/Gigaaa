/*
 * Scene 4: Poke. Golden hour in a cosy gym corner; the coach is mid warm-up.
 * TAP THE PIG: five pokes, five increasingly annoyed reactions
 * ("Focus." → "I'm training." → "Stop poking me." → "Do you want to help or what?"
 * → "Fine. One more."). Then the pig GETS SERIOUS: the lights drop, anime focus
 * lines, the headband gets tightened (zip), eyes narrow, slow push-in:
 * "Okay Chooty… let's go."
 *
 * Interaction: taps on the pig (ctx.onPigTap), Space/Enter, and (forgiving) taps
 * anywhere once the hint has been up a while. Taps during a reaction only get a
 * tiny squash. Idle viewers get nudged at ~6 s; at ~12 s the next reaction plays
 * by itself.
 */
(function () {
  'use strict';
  var P = window.PIGGY;
  var A = P.anim;
  var AUTO = new URLSearchParams(location.search).has('auto');

  var X0 = 180; // pig's home spot
  var Y0 = 560;
  var S0 = 1.3;
  var WIDE = { x: 180, y: 452, zoom: 1.12 };
  var CLOSE = { x: 180, y: 446, zoom: 2.3 };

  var DEF = {
    intro: 650, // iris settles, then the hint appears
    anywhereAfter: 3000, // after this long without a poke, a tap anywhere counts
    rehintAfter: 2600, // label comes back between pokes
    nudgeAfter: 6000, // the pig nudges an idle viewer
    autoAfter: 12000, // …and then plays the next reaction by itself
    autoTestGap: 1000, // ?auto: pause between simulated pokes
    lineHold: 1300,
    longLineHold: 1750,
    sideEye: 520,
    deadpanPause: 700,
    seriousBeat: 650,
    push: 3400,
    tugHold: 380,
    beforeLine: 650,
    finalPause: 850,
    finalHold: 1100,
  };

  var set = {};

  P.scenes.css(
    'poke',
    [
      '.scene-poke .pk-hint .prompt__dot{background:#ffcf4d}',
      '.scene-poke .pk-hint.pk-wiggle .prompt__label{animation:pkWiggle .5s ease}',
      '.scene-poke .bubble.pk-final{max-width:calc(var(--u)*262);padding:calc(var(--u)*11) calc(var(--u)*18) calc(var(--u)*10);',
      'background:linear-gradient(180deg,#25377f,#101a42);color:#fff;border:calc(var(--u)*2) solid #ffcf4d;',
      'font:italic 800 calc(var(--u)*27)/1.02 var(--font-sport);letter-spacing:.03em;text-transform:uppercase;',
      'box-shadow:0 0 0 calc(var(--u)*4) rgba(255,207,77,.16),0 calc(var(--u)*10) calc(var(--u)*26) rgba(0,0,0,.45)}',
      '.scene-poke .bubble.pk-final::after{background:#ffcf4d}',
      '.scene-poke .bubble.pk-final.pk-thump .bubble__text{animation:pkThump .42s cubic-bezier(.2,1.6,.4,1)}',
      '.scene-poke .bubble.pk-final .pk-gold{color:#ffcf4d}',
      '@keyframes pkWiggle{0%,100%{transform:none}20%{transform:translateX(-4px) rotate(-2deg)}40%{transform:translateX(4px) rotate(2deg)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}',
      '@keyframes pkThump{0%{transform:scale(1.25)}100%{transform:none}}',
    ].join('')
  );

  /* =========================================================== set */

  function setup(ctx) {
    set = {};
    var M = ctx.M.poke || {};
    defs(ctx);
    ctx.backdrop('#2c2048', '#8a5064');

    // far wall: window, bunting, clock, cork board with the sticky note (parallax)
    ctx.art(wallMarkup(M), { depth: 0.6 });

    // floor (moves with the world)
    ctx.art(floorMarkup(), { layer: 'bg' });

    // golden-hour light shafts + dust motes
    set.shafts = ctx.art(
      '<path d="M44 168L136 136L372 600L214 648Z" fill="url(#pkBeam)"/>' +
        '<path d="M70 250L132 228L292 612L198 640Z" fill="url(#pkBeam)" opacity="0.7"/>' +
        '<path d="M188 600L330 574L420 640L262 676Z" fill="#ffdca0" opacity="0.16"/>',
      { layer: 'bg' }
    );
    set.motes = buildMotes(ctx);

    // bench + ball rack against the wall
    ctx.art(benchMarkup() + rackMarkup(), { layer: 'mid' });

    // lighting for the "gets serious" finale (hidden until then)
    set.dim = ctx.art('<rect x="-500" y="-500" width="1400" height="1700" fill="url(#pkDim)"/>', { layer: 'mid', attrs: { opacity: 0 } });
    set.spot = ctx.art(
      '<path d="M150 -320L210 -320L300 572L60 572Z" fill="url(#pkSpot)"/>' + '<ellipse cx="180" cy="566" rx="104" ry="22" fill="url(#pkPool)"/>',
      { layer: 'mid', attrs: { opacity: 0 } }
    );
    set.lines = buildFocusLines(ctx);
    set.aura = buildAura(ctx);
    set.tails = buildTails(ctx);

    // foreground: a ball and a cone close to the camera
    set.front = ctx.art(frontMarkup(), { layer: 'front' });

    // tap hint ring (in front, follows the pig)
    set.ring = buildRing(ctx);

    var pig = ctx.pig;
    pig.outfit(true);
    pig.wear('shades', false);
    pig.place(X0, Y0, { scale: S0, facing: 1 });
    pig.express('focused', 0);
    pig.pose({ tailWag: 0.75 }, 0);
    pig.setMode('idle');
    pig.el.removeAttribute('transform');
    ctx.camera.set(WIDE);

    set.jiggle = buildJiggle(ctx);
    set.idle = buildIdle(ctx);
    set.idle.start(true);
  }

  function defs(ctx) {
    var d = ctx.svg.querySelector('defs');
    if (d.querySelector('#pkSky')) return;
    d.insertAdjacentHTML(
      'beforeend',
      '<linearGradient id="pkSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd896"/><stop offset="0.55" stop-color="#ffa286"/><stop offset="1" stop-color="#d8739a"/></linearGradient>' +
        '<radialGradient id="pkSun"><stop offset="0" stop-color="#fff6d8"/><stop offset="0.3" stop-color="#ffe7a6" stop-opacity="0.85"/><stop offset="1" stop-color="#ffcf4d" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="pkGlow"><stop offset="0" stop-color="#ffcf7e" stop-opacity="0.42"/><stop offset="1" stop-color="#ffcf7e" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="pkFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c88a5c"/><stop offset="0.3" stop-color="#a8694a"/><stop offset="1" stop-color="#4f2c2a"/></linearGradient>' +
        '<linearGradient id="pkWains" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a3a52"/><stop offset="1" stop-color="#4c2840"/></linearGradient>' +
        '<linearGradient id="pkBeam" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#ffe2a0" stop-opacity="0.34"/><stop offset="0.7" stop-color="#ffe2a0" stop-opacity="0.08"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></linearGradient>' +
        '<radialGradient id="pkDim" gradientUnits="userSpaceOnUse" cx="180" cy="460" r="320"><stop offset="0" stop-color="#090d1f" stop-opacity="0"/><stop offset="0.3" stop-color="#090d1f" stop-opacity="0.3"/><stop offset="0.62" stop-color="#090d1f" stop-opacity="0.84"/><stop offset="1" stop-color="#090d1f" stop-opacity="0.94"/></radialGradient>' +
        '<linearGradient id="pkSpot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6a8" stop-opacity="0"/><stop offset="1" stop-color="#ffe6a8" stop-opacity="0.2"/></linearGradient>' +
        '<radialGradient id="pkPool"><stop offset="0" stop-color="#ffe6a8" stop-opacity="0.5"/><stop offset="1" stop-color="#ffe6a8" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="pkAura"><stop offset="0" stop-color="#ffcf4d" stop-opacity="0.62"/><stop offset="0.55" stop-color="#e66f92" stop-opacity="0.3"/><stop offset="1" stop-color="#e66f92" stop-opacity="0"/></radialGradient>'
    );
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function wallMarkup(M) {
    var note = M.note || ['MISSION:', '4 DAYS'];
    if (typeof note === 'string') note = note.split(/:\s*/).length > 1 ? [note.split(/:\s*/)[0] + ':', note.split(/:\s*/).slice(1).join(': ')] : [note, ''];
    var bunting = '';
    var cols = ['#5fd3b3', '#ffcf4d', '#e66f92', '#7fb7ff'];
    for (var i = 0; i < 11; i++) {
      var bx = -20 + i * 36;
      var by = 70 + Math.sin((i / 10) * Math.PI) * 16;
      bunting += '<path d="M' + bx + ' ' + by.toFixed(1) + 'l22 1.5l-10 20Z" fill="' + cols[i % 4] + '" opacity="0.85"/>';
    }
    return (
      // warm wash of light from the window
      '<circle cx="92" cy="220" r="250" fill="url(#pkGlow)"/>' +
      // bunting
      '<path d="M-40 68Q160 104 400 66" fill="none" stroke="#24183a" stroke-width="1.5" opacity="0.7"/>' +
      bunting +
      // tall arched window, golden hour outside
      '<g transform="translate(30 104)">' +
      '<path d="M-12 214V58A68 68 0 0 1 124 58V214Z" fill="#e9c9a2"/>' +
      '<path d="M0 206V58A56 56 0 0 1 112 58V206Z" fill="url(#pkSky)"/>' +
      '<circle cx="70" cy="150" r="54" fill="url(#pkSun)"/><circle cx="70" cy="150" r="17" fill="#fff4cf"/>' +
      '<path d="M0 182Q30 168 58 178T112 172V206H0Z" fill="#b65c86" opacity="0.75"/>' +
      '<g fill="#6e3157" opacity="0.85"><path d="M22 206Q24 176 30 160l3 1Q28 180 27 206Z"/>' +
      '<path d="M31 160q-14-6-24 2q12-2 22 1zM31 160q-4-12-16-14q8 6 13 15zM31 160q8-11 21-10q-11 3-18 12zM31 160q14-2 20 8q-9-6-19-5z"/>' +
      '<path d="M92 206Q92 186 96 174l2.5 1Q95 190 96 206Z"/><path d="M97 174q-11-4-18 3q9-2 17 0zM97 174q7-9 17-7q-9 2-15 9zM97 174q10 0 14 8q-7-5-14-5z"/></g>' +
      '<path d="M56 4V206M0 104H112" stroke="#e9c9a2" stroke-width="5"/>' +
      '<rect x="-18" y="204" width="148" height="11" rx="4" fill="#d9b48a"/>' +
      '</g>' +
      // clock: 5:30, golden hour
      '<g transform="translate(176 150)"><circle r="17" fill="#fff6e9" stroke="#1d2a66" stroke-width="4"/>' +
      '<path d="M0 -12V-9M12 0H9M0 12V9M-12 0H-9" stroke="#1d2a66" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M0 0L2.6 -5.6" stroke="#1d2a66" stroke-width="2.4" stroke-linecap="round" transform="rotate(170)"/>' +
      '<path d="M0 0V10" stroke="#e66f92" stroke-width="1.8" stroke-linecap="round"/><circle r="1.8" fill="#1d2a66"/></g>' +
      // team stripe + wainscot
      '<rect x="-400" y="316" width="1160" height="3" fill="#ffcf4d" opacity="0.8"/>' +
      '<rect x="-400" y="320" width="1160" height="16" fill="#1d2a66"/>' +
      '<rect x="-400" y="337" width="1160" height="2.5" fill="#ffcf4d" opacity="0.8"/>' +
      '<rect x="-400" y="352" width="1160" height="220" fill="url(#pkWains)"/>' +
      '<rect x="-400" y="348" width="1160" height="8" rx="2" fill="#b07a73"/>' +
      '<path d="M-340 362V560M-250 362V560M-160 362V560M-70 362V560M20 362V560M110 362V560M200 362V560M290 362V560M380 362V560M470 362V560M560 362V560M650 362V560" stroke="#3f2136" stroke-width="2" opacity="0.6"/>' +
      // cork board: tactics card, the sticky note, a netball doodle
      '<g transform="translate(212 148)">' +
      '<rect x="-4" y="-4" width="142" height="118" rx="8" fill="#7d5034"/>' +
      '<rect x="0" y="0" width="134" height="110" rx="5" fill="#c99462"/>' +
      '<g transform="rotate(-4 36 36)"><rect x="8" y="12" width="60" height="48" rx="3" fill="#fff6e9"/>' +
      '<g fill="none" stroke-linecap="round" stroke-width="2">' +
      '<circle cx="22" cy="26" r="4" stroke="#1d2a66"/><circle cx="50" cy="46" r="4" stroke="#1d2a66"/>' +
      '<path d="M40 22l6 6M46 22l-6 6M18 44l6 6M24 44l-6 6" stroke="#e66f92"/>' +
      '<path d="M26 30Q38 40 46 44" stroke="#4f8be0" stroke-dasharray="3 3"/><path d="M42 45l5 0-2-5" stroke="#4f8be0"/></g>' +
      '<circle cx="38" cy="14" r="3.2" fill="#5fd3b3"/></g>' +
      '<g transform="translate(74 28) rotate(7)"><rect x="0" y="0" width="54" height="52" fill="#ffe27a"/>' +
      '<path d="M0 44h54v8H0Z" fill="#f4cf55"/>' +
      '<text x="27" y="19" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="12" fill="#1d2a66" letter-spacing="0.5">' + esc(String(note[0]).toUpperCase()) + '</text>' +
      '<text x="27" y="38" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-style="italic" font-weight="800" font-size="17" fill="#e66f92">' + esc(String(note[1] || '').toUpperCase()) + '</text>' +
      '<path d="M9 42q18 3 36-1" fill="none" stroke="#1d2a66" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle cx="27" cy="2" r="3.4" fill="#e66f92"/><circle cx="26" cy="1" r="1.1" fill="#fff" opacity="0.7"/></g>' +
      '<g transform="translate(26 86) rotate(5)"><rect x="-14" y="-12" width="30" height="26" rx="2" fill="#fff6e9"/>' +
      '<circle cx="1" cy="1" r="8" fill="none" stroke="#e66f92" stroke-width="1.6"/><path d="M-7 1h16M1 -7q4 8 0 16" fill="none" stroke="#e66f92" stroke-width="1.2"/></g>' +
      '</g>'
    );
  }

  function floorMarkup() {
    var seams = '';
    var rows = [478, 500, 528, 562, 604, 656, 722, 806, 910];
    for (var r = 0; r < rows.length - 1; r++) {
      var y0 = rows[r];
      var y1 = rows[r + 1];
      var step = 70 + r * 22;
      var off = (r % 2) * step * 0.5;
      for (var x = -380 + off; x < 760; x += step) seams += 'M' + x.toFixed(0) + ' ' + y0 + 'V' + y1;
    }
    var lines = '';
    for (var k = 1; k < rows.length; k++) lines += 'M-400 ' + rows[k] + 'H760';
    return (
      '<rect x="-400" y="470" width="1160" height="660" fill="url(#pkFloor)"/>' +
      '<path d="' + lines + '" stroke="#5a3022" stroke-width="1.6" opacity="0.32"/>' +
      '<path d="' + seams + '" stroke="#5a3022" stroke-width="1.3" opacity="0.22"/>' +
      // painted court line + key arc
      '<path d="M-400 534H760" stroke="#fff3df" stroke-width="3.5" opacity="0.45"/>' +
      '<path d="M-60 534Q180 640 420 534" fill="none" stroke="#fff3df" stroke-width="3.5" opacity="0.4"/>' +
      // warm sheen
      '<ellipse cx="200" cy="600" rx="260" ry="70" fill="url(#pkGlow)" opacity="0.6"/>' +
      // baseboard
      '<rect x="-400" y="464" width="1160" height="12" fill="#3b1f30"/>' +
      '<rect x="-400" y="464" width="1160" height="2.5" fill="#8a5562" opacity="0.6"/>'
    );
  }

  function ballMarkup(x, y, r) {
    var k = r / 11;
    return (
      '<g transform="translate(' + x + ' ' + y + ') scale(' + k.toFixed(3) + ')">' +
      '<circle r="11" fill="url(#propBall)" stroke="#8d97ab" stroke-width="1.2"/>' +
      '<path d="M-11 0Q0 -6 11 0" fill="none" stroke="#f2b33d" stroke-width="2"/>' +
      '<path d="M-8 7Q0 1 8 7" fill="none" stroke="#4f8be0" stroke-width="1.8"/>' +
      '<path d="M0 -11Q5.5 0 0 11" fill="none" stroke="#8d97ab" stroke-width="1.1"/></g>'
    );
  }

  function benchMarkup() {
    return (
      '<ellipse cx="82" cy="528" rx="88" ry="7" fill="#000" opacity="0.2"/>' +
      '<rect x="20" y="492" width="9" height="36" rx="3" fill="#5c3b2e"/><rect x="136" y="492" width="9" height="36" rx="3" fill="#5c3b2e"/>' +
      '<rect x="4" y="482" width="158" height="14" rx="6" fill="#d39c64"/>' +
      '<rect x="4" y="482" width="158" height="4" rx="2" fill="#f1c58e"/>' +
      // folded towel
      '<rect x="18" y="468" width="56" height="15" rx="6" fill="#5fd3b3"/><rect x="18" y="473" width="56" height="3" fill="#fff6e9" opacity="0.8"/>' +
      '<path d="M66 468q8 0 8 7v8h-8Z" fill="#48b99a"/>' +
      // water bottle
      '<rect x="98" y="446" width="17" height="37" rx="6" fill="#e66f92"/><rect x="98" y="460" width="17" height="8" fill="#ffcf4d"/>' +
      '<rect x="101" y="438" width="11" height="10" rx="3" fill="#fff6e9"/><rect x="102" y="450" width="3.5" height="26" rx="1.7" fill="#fff" opacity="0.35"/>'
    );
  }

  function rackMarkup() {
    var balls = '';
    [266, 294, 322].forEach(function (x, i) {
      balls += ballMarkup(x, 466 - (i === 1 ? 1 : 0), 11);
      balls += ballMarkup(x + (i === 2 ? -2 : 0), 510, 11);
    });
    return (
      '<ellipse cx="296" cy="534" rx="58" ry="6" fill="#000" opacity="0.2"/>' +
      '<rect x="250" y="438" width="6" height="94" rx="3" fill="#8e98b0"/><rect x="336" y="438" width="6" height="94" rx="3" fill="#8e98b0"/>' +
      balls +
      '<rect x="248" y="476" width="96" height="6" rx="3" fill="#b9c2d4"/><rect x="248" y="520" width="96" height="6" rx="3" fill="#b9c2d4"/>' +
      '<circle cx="253" cy="534" r="4" fill="#3b3550"/><circle cx="339" cy="534" r="4" fill="#3b3550"/>'
    );
  }

  function frontMarkup() {
    return (
      '<ellipse cx="34" cy="690" rx="30" ry="7" fill="#000" opacity="0.22"/>' +
      ballMarkup(34, 668, 22) +
      '<g transform="translate(330 676)"><ellipse cx="0" cy="2" rx="26" ry="6" fill="#000" opacity="0.22"/>' +
      '<rect x="-24" y="-6" width="48" height="8" rx="3" fill="#c94f75"/>' +
      '<path d="M-17 -5L-5 -52h10L17 -5Z" fill="#e66f92"/>' +
      '<path d="M-12 -24h24l-2.5 -9h-19Z" fill="#fff6e9"/>' +
      '<path d="M-5 -52h3L-9 -6h-5Z" fill="#fff" opacity="0.25"/></g>'
    );
  }

  /* drifting dust in the light shaft */
  function buildMotes(ctx) {
    var g = ctx.art('', { layer: 'bg' });
    var motes = [];
    var n = ctx.reduced ? 6 : 14;
    for (var i = 0; i < n; i++) {
      var c = A.svg('circle', { r: A.rand(0.9, 2).toFixed(2), fill: '#fff4d2' }, g);
      motes.push({ el: c, u: Math.random(), v: Math.random(), sp: A.rand(0.025, 0.06), ph: A.rand(0, 6) });
    }
    function place(m, clock) {
      var x = 80 + m.u * 190 + (m.v - 0.5) * 70 + Math.sin(clock * 0.7 + m.ph) * 6;
      var y = 210 + m.u * 360 + Math.cos(clock * 0.5 + m.ph) * 5;
      m.el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
      m.el.setAttribute('opacity', (Math.sin(m.u * Math.PI) * 0.75).toFixed(2));
    }
    motes.forEach(function (m) {
      place(m, 0);
    });
    if (!ctx.reduced) {
      ctx.loop(function (dt, clock) {
        for (var i = 0; i < motes.length; i++) {
          var m = motes[i];
          m.u = (m.u + m.sp * dt) % 1;
          place(m, clock);
        }
      });
    }
    return g;
  }

  /* pulsing hint ring around the pig */
  function buildRing(ctx) {
    var g = ctx.art(
      '<ellipse rx="92" ry="114" fill="none" stroke="#ffcf4d" stroke-width="12" opacity="0.14"/>' +
        '<ellipse class="pk-dash" rx="92" ry="114" fill="none" stroke="#ffcf4d" stroke-width="3" stroke-dasharray="14 10" stroke-linecap="round"/>' +
        '<ellipse class="pk-ping" rx="92" ry="114" fill="none" stroke="#fff6e9" stroke-width="2.4"/>',
      { layer: 'fx', attrs: { opacity: 0 } }
    );
    var dash = g.querySelector('.pk-dash');
    var ping = g.querySelector('.pk-ping');
    var st = { o: 0, boost: 0 };
    var pig = ctx.pig;
    ctx.loop(function (dt, clock) {
      g.setAttribute('opacity', st.o.toFixed(3));
      if (st.o < 0.01) return;
      var cx = pig.p.x;
      var cy = pig.p.y - 86 * pig.p.scale;
      var pulse = 1 + Math.sin(clock * 5) * 0.015;
      g.setAttribute('transform', 'translate(' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ') scale(' + pulse.toFixed(3) + ')');
      dash.setAttribute('stroke-dashoffset', ((clock * 26) % 24).toFixed(1));
      var k = ctx.reduced ? 0.3 : (clock * (0.8 + st.boost)) % 1;
      ping.setAttribute('transform', 'scale(' + (1 + k * 0.22).toFixed(3) + ')');
      ping.setAttribute('opacity', ((1 - k) * 0.8).toFixed(3));
      st.boost = Math.max(0, st.boost - dt);
    });
    return {
      show: function (on) {
        return A.tween(st, { o: on ? 1 : 0 }, on ? 380 : 260, 'inOutSine');
      },
      flash: function () {
        st.boost = 1.2;
        st.o = 1;
      },
    };
  }

  /* anime focus lines behind the pig: one path, re-jittered a few times a second */
  function buildFocusLines(ctx) {
    var g = ctx.art('<path fill="#fff6e9"/>', { layer: 'mid', attrs: { opacity: 0 } });
    var path = g.firstChild;
    var n = ctx.reduced ? 26 : 46;
    var cx = 180;
    var cy = 448;
    function draw() {
      var d = '';
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2 + A.rand(-0.05, 0.05);
        var r1 = A.rand(64, 104);
        var r2 = 640;
        var w = A.rand(0.012, 0.03);
        var x1 = cx + Math.cos(a) * r1;
        var y1 = cy + Math.sin(a) * r1;
        d +=
          'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
          'L' + (cx + Math.cos(a - w) * r2).toFixed(1) + ' ' + (cy + Math.sin(a - w) * r2).toFixed(1) +
          'L' + (cx + Math.cos(a + w) * r2).toFixed(1) + ' ' + (cy + Math.sin(a + w) * r2).toFixed(1) + 'Z';
      }
      path.setAttribute('d', d);
    }
    draw();
    var st = { o: 0, on: false };
    ctx.loop(function () {
      g.setAttribute('opacity', st.o.toFixed(3));
    });
    if (!ctx.reduced) {
      ctx.every(85, function () {
        if (st.on) draw();
      });
    }
    return {
      show: function () {
        st.on = true;
        return A.tween(st, { o: 0.5 }, 500, 'outQuad');
      },
    };
  }

  /* golden/pink aura behind the pig, with rising streaks */
  function buildAura(ctx) {
    var g = ctx.art(
      '<ellipse rx="104" ry="132" fill="url(#pkAura)"/><ellipse rx="70" ry="104" fill="url(#pkAura)" opacity="0.8"/>',
      { layer: 'mid', attrs: { opacity: 0 } }
    );
    var glows = g.querySelectorAll('ellipse');
    var streaks = [];
    var count = ctx.reduced ? 0 : 10;
    for (var i = 0; i < count; i++) {
      var r = A.svg('rect', { x: -1.6, y: -14, width: 3.2, height: 28, rx: 1.6, fill: i % 3 ? '#ffe6a8' : '#ffb3c8' }, g);
      streaks.push({ el: r, k: i / count, side: i % 2 ? 1 : -1, dx: A.rand(44, 84), sp: A.rand(0.6, 0.95) });
    }
    var st = { o: 0 };
    var pig = ctx.pig;
    ctx.loop(function (dt, clock) {
      g.setAttribute('opacity', st.o.toFixed(3));
      if (st.o < 0.01) return;
      var cx = pig.p.x;
      var cy = pig.p.y - 80 * pig.p.scale;
      g.setAttribute('transform', 'translate(' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')');
      var s = 1 + Math.sin(clock * 7) * 0.035;
      glows[0].setAttribute('transform', 'scale(' + s.toFixed(3) + ')');
      for (var i = 0; i < streaks.length; i++) {
        var sk = streaks[i];
        sk.k = (sk.k + dt * sk.sp) % 1;
        var y = 100 - sk.k * 230;
        var x = sk.side * (sk.dx - sk.k * 18);
        sk.el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(1 ' + (0.6 + sk.k).toFixed(2) + ')');
        sk.el.setAttribute('opacity', (Math.sin(sk.k * Math.PI) * 0.9).toFixed(2));
      }
    });
    return {
      show: function () {
        return A.tween(st, { o: 1 }, 600, 'outQuad');
      },
    };
  }

  /* the headband's long tails: drawn in the mid layer, pinned to the knot every frame */
  function buildTails(ctx) {
    var pig = ctx.pig;
    var g = ctx.art('', { layer: 'mid' });
    var a = A.svg('path', { fill: '#26357a', stroke: '#16205a', 'stroke-width': 1, 'stroke-linejoin': 'round' }, g);
    var b = A.svg('path', { fill: '#2d3f8c', stroke: '#16205a', 'stroke-width': 1, 'stroke-linejoin': 'round' }, g);
    var trim = A.svg('path', { fill: 'none', stroke: '#ffcf4d', 'stroke-width': 1.1, opacity: 0.85 }, g);
    var st = { len: 0, amp: 0, t: 0 };
    function ribbon(len, slope, amp, t, ph, w0) {
      var N = 8;
      var top = [];
      var bot = [];
      var mid = [];
      for (var i = 0; i <= N; i++) {
        var s = i / N;
        var x = s * len;
        var y = s * len * slope + Math.sin(t * 12 + ph - s * 4.4) * amp * s;
        var w = w0 * (1 - 0.3 * s);
        top.push(x.toFixed(1) + ' ' + (y - w).toFixed(1));
        bot.push(x.toFixed(1) + ' ' + (y + w).toFixed(1));
        mid.push(x.toFixed(1) + ' ' + y.toFixed(1));
      }
      var ex = len - w0 * 1.6;
      var ey = len * slope + Math.sin(t * 12 + ph - 4.4) * amp;
      return { d: 'M' + top.join('L') + 'L' + ex.toFixed(1) + ' ' + ey.toFixed(1) + 'L' + bot.reverse().join('L') + 'Z', mid: 'M' + mid.join('L') };
    }
    ctx.loop(function (dt) {
      if (st.len < 0.5) {
        g.setAttribute('opacity', 0);
        return;
      }
      st.t += dt;
      var p0 = pig.pointOn(pig.parts.head, 26, -103);
      var p1 = pig.pointOn(pig.parts.head, 66, -103);
      var ang = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
      var sc = Math.hypot(p1.x - p0.x, p1.y - p0.y) / 40;
      g.setAttribute('opacity', 1);
      g.setAttribute('transform', 'translate(' + p0.x.toFixed(1) + ' ' + p0.y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ') scale(' + sc.toFixed(3) + ')');
      var r1 = ribbon(st.len, 0.16, st.amp, st.t, 0, 3.6);
      var r2 = ribbon(st.len * 0.8, 0.5, st.amp * 0.9, st.t, 1.4, 3.2);
      a.setAttribute('d', r1.d);
      b.setAttribute('d', r2.d);
      trim.setAttribute('d', r1.mid);
    });
    return {
      snap: function () {
        st.t = 0;
        return A.tween(st, { len: 44, amp: 9 }, 170, 'outBack').then(function () {
          return A.tween(st, { amp: ctx.reduced ? 1.5 : 3.4 }, 600, 'outQuad');
        });
      },
    };
  }

  /* poke squash: a damped spring on the pig's outer group (independent of pig.p tweens) */
  function buildJiggle(ctx) {
    var pig = ctx.pig;
    var s = { y: 0, vy: 0, r: 0, vr: 0, on: false };
    ctx.loop(function (dt) {
      if (!s.on) return;
      var h = Math.min(dt, 1 / 30);
      s.vy += (-330 * s.y - 10 * s.vy) * h;
      s.y += s.vy * h;
      s.vr += (-260 * s.r - 9 * s.vr) * h;
      s.r += s.vr * h;
      if (Math.abs(s.y) < 0.0015 && Math.abs(s.vy) < 0.02 && Math.abs(s.r) < 0.05 && Math.abs(s.vr) < 0.5) {
        s.on = false;
        s.y = s.vy = s.r = s.vr = 0;
        pig.el.removeAttribute('transform');
        return;
      }
      var x = pig.p.x.toFixed(1);
      var y = pig.p.y.toFixed(1);
      pig.el.setAttribute(
        'transform',
        'translate(' + x + ' ' + y + ') rotate(' + s.r.toFixed(2) + ') scale(' + (1 + s.y * 0.75).toFixed(4) + ' ' + (1 - s.y).toFixed(4) + ') translate(-' + x + ' -' + y + ')'
      );
    });
    return {
      poke: function (k, dir) {
        s.vy += 2.4 * k;
        s.vr += 75 * k * (dir || 0);
        s.on = true;
      },
    };
  }

  /* the warm-up loop: boxer bounce → arm circles → side steps, cross-faded */
  function buildIdle(ctx) {
    var pig = ctx.pig;
    var p = pig.p;
    var KEYS = ['x', 'lift', 'squash', 'tilt', 'armL', 'armR', 'legL', 'legR', 'headTilt'];
    var MOVE = 2.6; // seconds per exercise
    var st = { on: false, t: 0, speed: 1, w: 1, from: null, force: -1, forceFrom: 0, forceK: 1, lastLift: 0, flop: 0, sweat: 1.6 };
    function smooth(k) {
      k = A.clamp(k, 0, 1);
      return k * k * (3 - 2 * k);
    }
    function move(m, t) {
      var o = { x: X0, lift: 0, squash: 1, tilt: 0, armL: 8, armR: 8, legL: 0, legR: 0, headTilt: 0 };
      var amp = ctx.reduced ? 0.6 : 1;
      if (m === 0) {
        // boxer bounce, jogging feet, guard up
        var s = Math.sin(t * Math.PI * 2.2);
        var b = Math.abs(s);
        o.lift = 6 * b * amp;
        o.squash = 0.95 + 0.07 * b;
        o.legL = 5 * Math.max(0, s);
        o.legR = 5 * Math.max(0, -s);
        o.armL = 44 + 10 * s;
        o.armR = 44 - 10 * s;
        o.tilt = 2.5 * s * amp;
        o.headTilt = -1.5 * s;
      } else if (m === 1) {
        // arm circles
        var a = t * Math.PI * 2 * 1.2;
        o.armL = 98 + 28 * Math.sin(a);
        o.armR = 98 + 28 * Math.sin(a + 0.8);
        o.lift = 2.5 * Math.abs(Math.sin(a)) * amp;
        o.squash = 1 + 0.025 * Math.cos(2 * a);
        o.headTilt = 2.5 * Math.sin(a);
      } else {
        // side-to-side steps
        var c = t * Math.PI * 2 * 0.8;
        var v = Math.cos(c);
        o.x = X0 + 14 * Math.sin(c) * amp;
        o.legR = 7 * Math.max(0, v);
        o.legL = 7 * Math.max(0, -v);
        o.lift = 3 * Math.abs(v) * amp;
        o.tilt = 4.5 * v * amp;
        o.armL = 26 - 12 * v;
        o.armR = 26 + 12 * v;
        o.squash = 1 - 0.03 * Math.abs(Math.sin(c));
        o.headTilt = -2 * v;
      }
      return o;
    }
    function natural(t) {
      return Math.floor(t / MOVE) % 3;
    }
    function pose(t) {
      var m;
      var prev;
      var w;
      if (st.force >= 0) {
        m = st.force;
        prev = st.forceFrom;
        w = smooth(st.forceK);
      } else {
        var cyc = Math.floor(t / MOVE);
        m = cyc % 3;
        prev = (m + 2) % 3;
        w = cyc === 0 ? 1 : smooth((t - cyc * MOVE) / 0.5);
      }
      var a = move(prev, t);
      var b = move(m, t);
      for (var k in b) b[k] = a[k] + (b[k] - a[k]) * w;
      return b;
    }
    function snapshot() {
      var o = {};
      KEYS.forEach(function (k) {
        o[k] = p[k];
      });
      return o;
    }
    ctx.loop(function (dt) {
      if (!st.on) return;
      st.t += dt * st.speed;
      st.w = Math.min(1, st.w + dt / 0.4);
      if (st.force >= 0) st.forceK = Math.min(1, st.forceK + dt / 0.4);
      var target = pose(st.t);
      var k = smooth(st.w);
      for (var i = 0; i < KEYS.length; i++) {
        var key = KEYS[i];
        p[key] = st.from ? st.from[key] + (target[key] - st.from[key]) * k : target[key];
      }
      // ears follow through on the bounce
      var vy = dt > 0 ? (p.lift - st.lastLift) / dt : 0;
      st.lastLift = p.lift;
      var flop = A.clamp(vy * 0.09, -6, 6);
      p.earL += flop - st.flop;
      p.earR += flop - st.flop;
      st.flop = flop;
      // a little sweat now and then
      st.sweat -= dt * st.speed;
      if (st.sweat <= 0) {
        st.sweat = A.rand(2.2, 3.4);
        if (!ctx.reduced) {
          var h = pig.head();
          var side = Math.random() < 0.5 ? -1 : 1;
          ctx.fx.sweat(h.x + side * 34 * p.scale, h.y - 20 * p.scale, side);
        }
      }
    });
    var api = {
      st: st,
      // instant: no blend (set-up); otherwise blend in from the current pose
      start: function (instant) {
        st.from = instant ? null : snapshot();
        if (st.from) A.set(p, st.from); // take the keys over from any running tween
        st.w = instant ? 1 : 0;
        st.lastLift = p.lift;
        st.flop = 0;
        st.speed = 1;
        st.force = -1;
        st.on = true;
      },
      stop: function () {
        if (!st.on) return;
        st.on = false;
        p.earL -= st.flop;
        p.earR -= st.flop;
        st.flop = 0;
      },
      // hold one exercise (1 = arm circles), blending over from whatever is playing
      force: function (m) {
        if (st.force === m) return;
        st.forceFrom = st.force >= 0 ? st.force : natural(st.t);
        st.forceK = 0;
        st.force = m;
      },
      release: function () {
        if (st.force < 0) return;
        // restart the cycle on the forced exercise so nothing pops
        var m = st.force;
        st.from = snapshot();
        st.w = 0;
        st.force = -1;
        st.t = (Math.ceil(st.t / (3 * MOVE)) * 3 + m) * MOVE + 0.5;
      },
    };
    return api;
  }

  /* =========================================================== helpers */

  function fade(el, to, ms) {
    var st = { o: parseFloat(el.getAttribute('opacity') == null ? 1 : el.getAttribute('opacity')) };
    var stop = A.onFrame(function () {
      el.setAttribute('opacity', st.o.toFixed(3));
    });
    return A.quiet(
      A.tween(st, { o: to }, ms, 'inOutSine').then(
        function () {
          stop();
          el.setAttribute('opacity', to);
        },
        function (e) {
          stop();
          throw e;
        }
      )
    );
  }

  function toWorld(ctx, cx, cy) {
    var cam = document.getElementById('cam');
    var m = cam && cam.getScreenCTM();
    if (!m) return null;
    var pt = ctx.svg.createSVGPoint();
    pt.x = cx;
    pt.y = cy;
    var w = pt.matrixTransform(m.inverse());
    return { x: w.x, y: w.y };
  }

  function bellyPoint(ctx) {
    return ctx.pig.pointOn(ctx.pig.parts.torso, 9, -38);
  }
  function headPoint(ctx) {
    return ctx.pig.pointOn(ctx.pig.parts.head, -14, -104);
  }
  function partOf(ctx, pt) {
    var h = ctx.pig.head();
    return Math.hypot(pt.x - h.x, pt.y - h.y) < 36 * ctx.pig.p.scale ? 'head' : 'belly';
  }

  // shared start of every reaction: squash at the poke spot, ring, "boop", ear flick
  async function poked(ctx, req, k, M) {
    var pig = ctx.pig;
    var pt = req.pt || bellyPoint(ctx);
    var side = pt.x >= pig.p.x ? 1 : -1;
    var head = req.part === 'head';
    ctx.sfx('boing');
    set.jiggle.poke(head ? k * 0.7 : k, -side * (head ? 1.2 : 0.7));
    if (!req.silent) {
      ctx.fx.impact(pt.x, pt.y, { size: 2.4, color: '#fff6e9' });
      ctx.boom(M.boop || 'boop!', pt.x + side * 34, pt.y - 24, { size: 17, rot: side * 10, color: '#fff6e9', hold: 280 });
    }
    var e0 = pig.p.earL;
    await A.tween(pig.p, { earL: e0 - (head ? 30 : 20), earR: pig.p.earR - (head ? 30 : 20) }, 70, 'outQuad');
    A.tween(pig.p, { earL: e0, earR: e0 }, 420, 'outElastic');
  }

  async function rubLoop(ctx, key, a, b, n, ms) {
    for (var i = 0; i < n; i++) {
      var o1 = {};
      o1[key] = a;
      await ctx.pig.pose(o1, ms, 'inOutSine');
      var o2 = {};
      o2[key] = b;
      await ctx.pig.pose(o2, ms, 'inOutSine');
    }
  }

  async function footTaps(ctx, n) {
    for (var i = 0; i < n; i++) {
      await ctx.pig.pose({ legR: 6 }, 90, 'outQuad');
      await ctx.pig.pose({ legR: 0 }, 80, 'inQuad');
      ctx.sfx('footstep');
      await ctx.wait(140);
    }
  }

  /* =========================================================== reactions */

  // 1. "Focus." — freezes mid-move, serious squint, keeps training
  async function r1(ctx, req, T, M) {
    var pig = ctx.pig;
    var idle = set.idle;
    var pt = req.pt || bellyPoint(ctx);
    await poked(ctx, req, 1, M);
    A.tween(idle.st, { speed: 0 }, 140, 'outQuad');
    pig.lookAt(pt.x, pt.y, 120);
    pig.pose({ eyeL: 0.9, eyeR: 0.9, browY: -2 }, 120);
    await ctx.wait(360);
    pig.pose({ lookX: 0, lookY: 0, turn: 0 }, 160, 'outCubic');
    pig.pose({ eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 0.34, eyeR: 0.34, browAngle: 17, browY: 3, mouth: 'flat', blush: 0.25 }, 200, 'outCubic');
    await ctx.wait(300);
    var b = ctx.say(M.reactions[0], { hold: T.lineHold });
    await ctx.wait(420);
    A.tween(idle.st, { speed: 1 }, 420, 'inOutSine');
    await b;
    pig.express('focused', 320);
  }

  // 2. "I'm training." — arm circles, annoyed side-eye, then circles faster to prove it
  async function r2(ctx, req, T, M) {
    var pig = ctx.pig;
    var idle = set.idle;
    var pt = req.pt || bellyPoint(ctx);
    var dir = pt.x < pig.p.x ? -1 : 1;
    idle.force(1);
    await poked(ctx, req, 1, M);
    await ctx.wait(220);
    pig.pose({ turn: -0.55 * dir, lookX: 0.95 * dir, lookY: 0.15, eyeL: 0.5, eyeR: 0.5, browAngle: 12, browY: 2, mouth: 'flat', blush: 0.55 }, 220, 'outCubic');
    await ctx.wait(T.sideEye);
    var b = ctx.say(M.reactions[1], { hold: T.lineHold });
    await ctx.wait(520);
    ctx.sfx('whoosh');
    A.tween(idle.st, { speed: 1.9 }, 300, 'outQuad');
    await b;
    A.tween(idle.st, { speed: 1 }, 400, 'inOutSine');
    pig.pose({ turn: 0, lookX: 0, lookY: 0 }, 220, 'outCubic');
    pig.express('focused', 280);
    await ctx.wait(300);
    idle.release();
  }

  // 3. "Stop poking me." — ow, grumpy blush, rubs the poked spot, hmph
  async function r3(ctx, req, T, M) {
    var pig = ctx.pig;
    var idle = set.idle;
    var head = req.part === 'head';
    idle.stop();
    await poked(ctx, req, 1.4, M);
    pig.express('ow', 60);
    pig.pose({ x: X0, lift: 0, legL: 0, legR: 0, tilt: 0, headTilt: 0, squash: 1 }, 260, 'outCubic');
    await ctx.wait(300);
    // grumpy + embarrassed, looking at the sore spot
    pig.pose({ eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 0.68, eyeR: 0.68, eyeScale: 1, browAngle: 13, browY: 2, mouth: 'wobble', blush: 1, earL: 20, earR: 20, lookX: 0.2, lookY: head ? -0.7 : 0.75, turn: 0 }, 200);
    if (head) pig.pose({ headTilt: 8, armR: 146, armL: 10 }, 240, 'outBack');
    else pig.pose({ armR: -40, armL: 10, nod: 2 }, 240, 'outBack');
    // steam from the ears
    var tipL = pig.pointOn(pig.parts.earL, -2, -24);
    var tipR = pig.pointOn(pig.parts.earR, 2, -24);
    ctx.fx.puff(tipL.x, tipL.y, { count: 3, color: '#ffffff', size: 0.55, angle: -Math.PI * 0.85, spread: 0.6, power: 0.8 });
    ctx.fx.puff(tipR.x, tipR.y, { count: 3, color: '#ffffff', size: 0.55, angle: -Math.PI * 0.45, spread: 0.6, power: 0.8 });
    ctx.sfx('slideUp');
    await ctx.wait(240);
    var rub = head ? rubLoop(ctx, 'armR', 158, 140, 3, 120) : rubLoop(ctx, 'armR', -52, -34, 3, 120);
    await ctx.wait(160);
    pig.pose({ lookX: 0, lookY: 0 }, 160, 'outCubic');
    var b = ctx.say(M.reactions[2], { hold: T.lineHold });
    await rub;
    // hmph: arms folded, nose up, eyes shut, turned away
    ctx.sfx('swish');
    pig.pose({ armL: -64, armR: -64, headTilt: -7, nod: -2, turn: -0.55, lookX: -0.4, eyeStyleL: 'closed', eyeStyleR: 'closed', mouth: 'frown', browAngle: 12, browY: 0 }, 280, 'outBack');
    await b;
    // …one eye peeks back at the camera
    pig.pose({ eyeStyleR: 'open', eyeR: 0.55, lookX: 0.75 }, 0);
    ctx.sfx('blip');
    await ctx.wait(560);
    pig.pose({ eyeStyleL: 'open', eyeStyleR: 'open' }, 0);
    pig.express('focused', 300);
    await pig.pose({ armL: 10, armR: 10, headTilt: 0, nod: 0, turn: 0, lookX: 0, lookY: 0, blush: 0.9 }, 320, 'outBack');
    idle.start();
    pig.pose({ blush: 0.4 }, 2400, 'inOutSine');
  }

  // 4. "Do you want to help or what?" — hooves on hips, deadpan close-up, foot tap
  async function r4(ctx, req, T, M) {
    var pig = ctx.pig;
    var idle = set.idle;
    idle.stop();
    await poked(ctx, req, 1, M);
    pig.pose({ x: X0, lift: 0, legL: 0, legR: 0, tilt: 0, headTilt: 0, squash: 1 }, 240, 'outCubic');
    pig.express('neutral', 140);
    await ctx.wait(260);
    ctx.sfx('swish');
    await pig.pose({ armL: -16, armR: -16, squash: 1.04 }, 260, 'outBack');
    ctx.camera.to({ x: 180, y: 432, zoom: 1.75 }, 520, 'outCubic');
    pig.lookAtViewer(140);
    pig.express('deadpan', 220);
    await ctx.wait(T.deadpanPause);
    pig.blink();
    await ctx.wait(320);
    pig.pose({ browY: -2, browAngle: 3 }, 200);
    var b = ctx.say(M.reactions[3], { hold: T.longLineHold });
    await ctx.wait(450);
    await footTaps(ctx, 3);
    await b;
    ctx.camera.to(WIDE, 650, 'inOutCubic');
    pig.express('focused', 260);
    await pig.pose({ armL: 10, armR: 10, squash: 1 }, 260, 'outBack');
    idle.start();
  }

  // 5. "Fine. One more." — big sigh (shoulders drop), then ONE more rep
  async function r5(ctx, req, T, M) {
    var pig = ctx.pig;
    var idle = set.idle;
    idle.stop();
    await poked(ctx, req, 0.8, M);
    pig.pose({ x: X0, lift: 0, legL: 0, legR: 0, tilt: 0, headTilt: 0, squash: 1, armL: 10, armR: 10 }, 260, 'outCubic');
    pig.lookAtViewer(160);
    pig.express('deadpan', 160);
    await ctx.wait(500);
    // inhale…
    ctx.sfx('gasp');
    await pig.pose({ squash: 1.08, armL: 28, armR: 28, earL: -8, earR: -8, browY: -3, eyeStyleL: 'closed', eyeStyleR: 'closed', nod: -2, mouth: 'tiny' }, 560, 'inOutSine');
    // …and the long exhale
    ctx.sfx('whoosh');
    var sn = pig.pointOn(pig.parts.snout, 0, 6);
    ctx.fx.puff(sn.x, sn.y, { count: 4, color: '#fff6e9', size: 0.5, angle: Math.PI * 0.35, spread: 0.6, power: 0.7 });
    await pig.pose({ squash: 0.9, armL: -2, armR: -2, earL: 30, earR: 30, nod: 5, browY: 2, browAngle: -10, tailWag: 0.1 }, 680, 'outCubic');
    pig.pose({ eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 0.45, eyeR: 0.45, mouth: 'flat' }, 160);
    await ctx.wait(220);
    var b = ctx.say(M.reactions[4], { hold: T.lineHold });
    await ctx.wait(T.lineHold * 0.75);
    // ONE more rep: wind-up, jumping jack, land
    pig.express('determined', 160);
    pig.pose({ nod: 0, tailWag: 0.6 }, 200);
    await pig.pose({ squash: 0.78, armL: 18, armR: 18, earL: 6, earR: 6 }, 220, 'outQuad');
    ctx.sfx('whoosh');
    pig.pose({ squash: 1.14, armL: 165, armR: 165, legL: 4, legR: 4, earL: 24, earR: 24 }, 180, 'outQuad');
    await A.tween(pig.p, { lift: 42 }, 300, 'outQuad');
    pig.pose({ squash: 1, earL: -16, earR: -16 }, 200);
    await A.tween(pig.p, { lift: 0 }, 250, 'inQuad');
    ctx.sfx('thud');
    ctx.fx.puff(X0, Y0, { count: 7, color: '#f1d8bb' });
    ctx.camera.shake(3, 160);
    pig.pose({ earL: 14, earR: 14 }, 90);
    await pig.pose({ squash: 0.84, armL: 26, armR: 26, legL: 0, legR: 0 }, 90, 'outQuad');
    pig.pose({ earL: 0, earR: 0 }, 320, 'outBack');
    await pig.pose({ squash: 1, armL: 12, armR: 12 }, 320, 'outBack');
    await b;
  }

  /* =========================================================== finale */

  async function getSerious(ctx, T, M) {
    var pig = ctx.pig;
    ctx.music('none', 0.3);
    await ctx.wait(380);
    // the room goes quiet and dark around the pig
    ctx.sfx('heartbeat');
    ctx.music('tense', 0.6);
    ctx.ambience('room', 0.2);
    ctx.letterbox(true);
    fade(set.dim, 1, 1100);
    fade(set.shafts, 0.2, 1100);
    fade(set.motes, 0.2, 1100);
    fade(set.front, 0.35, 1100);
    fade(set.spot, 1, 900);
    ctx.camera.to(CLOSE, T.push, 'inOutSine');
    // head bowed, eyes shut: gathering focus
    pig.pose({ eyeStyleL: 'closed', eyeStyleR: 'closed', browAngle: 14, browY: 2, mouth: 'flat', blush: 0.3, nod: 5, earL: 4, earR: 4, lookX: 0, lookY: 0, turn: 0, tailWag: 0.1 }, 420);
    await ctx.wait(T.seriousBeat);
    ctx.sfx('heartbeat');
    set.aura.show();
    set.lines.show();
    ctx.sfx('powerUp');
    await ctx.wait(420);
    // the headband: hooves up to the temples…
    await pig.pose({ armL: 150, armR: 150, nod: 7 }, 380, 'outBack');
    await ctx.wait(160);
    // …TUG.
    ctx.sfx('zip');
    set.tails.snap();
    var knot = pig.pointOn(pig.parts.head, 28, -102);
    ctx.fx.sparkle(knot.x, knot.y, { count: 5, color: '#fff6e9', power: 0.6 });
    await pig.pose({ armL: 122, armR: 122, squash: 1.05, nod: 3 }, 100, 'outQuad');
    pig.pose({ squash: 1 }, 280, 'outBack');
    await ctx.wait(T.tugHold);
    await pig.pose({ armL: 12, armR: 12, nod: 0 }, 420, 'inOutCubic');
    // eyes open: determined.
    ctx.sfx('heartbeat');
    ctx.sfx('ding', 0.05);
    pig.pose({ eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 0.56, eyeR: 0.56, eyeScale: 1, browAngle: 22, browY: 3, mouth: 'flat', earL: -6, earR: -6, tailWag: 0.3 }, 160, 'outCubic');
    eyeGlint(ctx);
    await ctx.wait(T.beforeLine);

    // the line, with weight: "Okay Chooty…" (beat) "let's go."
    var full = M.final;
    var cut = full.indexOf('…');
    var first = cut >= 0 ? full.slice(0, cut + 1) : full;
    var b = ctx.say(first, { stay: true, className: 'pk-final' });
    if (cut >= 0 && cut < full.length - 1) {
      await ctx.wait(T.finalPause);
      var txt = b.el.querySelector('.bubble__text');
      txt.textContent = first;
      var gold = document.createElement('span');
      gold.className = 'pk-gold';
      gold.textContent = full.slice(cut + 1);
      txt.appendChild(gold);
      b.el.classList.add('pk-thump');
      ctx.sfx('heartbeat');
      pig.pose({ mouth: 'smirk', browAngle: 20 }, 120);
      ctx.camera.to({ x: CLOSE.x, y: CLOSE.y - 4, zoom: CLOSE.zoom + 0.08 }, 420, 'outCubic');
    }
    await ctx.wait(T.finalHold);
  }

  function eyeGlint(ctx) {
    var pig = ctx.pig;
    var pt = pig.pointOn(pig.parts.eyeR, 4.5, -4.5);
    var g = A.svg('path', { d: 'M0-9L1.8-1.8 9 0 1.8 1.8 0 9-1.8 1.8-9 0-1.8-1.8Z', fill: '#ffffff' }, ctx.layers.fx);
    var st = { s: 0, r: 0 };
    var stop = A.onFrame(function () {
      g.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ') rotate(' + st.r.toFixed(1) + ') scale(' + st.s.toFixed(3) + ')');
    });
    A.quiet(
      A.tween(st, { s: 1, r: 45 }, 160, 'outBack')
        .then(function () {
          return A.tween(st, { s: 0, r: 90 }, 300, 'inQuad');
        })
        .then(
          function () {
            stop();
            g.remove();
          },
          function () {
            stop();
            g.remove();
          }
        )
    );
  }

  /* =========================================================== play */

  async function play(ctx) {
    var T = Object.assign({}, DEF, ctx.T.poke);
    var M = Object.assign({ prompt: 'Tap the pig', reactions: [], final: 'Okay Chooty… let’s go.' }, ctx.M.poke);
    var pig = ctx.pig;
    var gen = A.generation();
    var offs = [];
    var REACT = [r1, r2, r3, r4, r5];
    var st = { busy: true, pending: null, count: 0, t0: A.clock(), anywhere: false, misses: 0, nudgeId: 0, rehinted: false };
    var hint = null;

    function idleMs() {
      return (A.clock() - st.t0) * 1000;
    }
    function showHint(withRing) {
      if (!hint) {
        hint = ctx.panel('<span class="prompt__dot"></span><span class="prompt__label"></span>', 'prompt prompt--tap pk-hint');
        hint.querySelector('.prompt__label').textContent = M.prompt;
      } else hint.classList.remove('is-out');
      if (withRing) set.ring.show(true);
    }
    function hideHint() {
      if (hint) hint.classList.add('is-out');
      set.ring.show(false);
    }
    function cue(pt) {
      // a tap that missed the pig (too early to count): point the viewer at the pig
      set.ring.flash();
      showHint(false);
      if (hint) {
        hint.classList.remove('pk-wiggle');
        void hint.offsetWidth;
        hint.classList.add('pk-wiggle');
      }
      if (pt) pig.lookAt(pt.x, pt.y, 140);
      ctx.sfx('blip');
    }
    function request(r) {
      if (!st.pending) st.pending = r;
    }
    function onTap(e, onPig) {
      if (gen !== A.generation() || st.final) return;
      var pt = toWorld(ctx, e.clientX, e.clientY);
      if (st.busy) {
        // never unresponsive: a tiny squash, but no stacking
        if (onPig && pt) {
          set.jiggle.poke(0.35, pt.x >= pig.p.x ? -0.5 : 0.5);
          ctx.fx.impact(pt.x, pt.y, { size: 1.6, color: '#fff6e9' });
          ctx.sfx('tap');
        }
        return;
      }
      if (!onPig) {
        st.misses++;
        if (!st.anywhere && st.misses < 2) {
          cue(pt);
          return;
        }
        pt = null; // counts anyway: poke the belly
      }
      request({ pt: pt, part: pt ? partOf(ctx, pt) : 'belly' });
    }

    try {
      ctx.music('training', 1.2);
      ctx.ambience('room', 0.7);

      var lastPigEvt = null;
      offs.push(
        ctx.onPigTap(function (e) {
          lastPigEvt = e;
          onTap(e, true);
        })
      );
      var stageDown = function (e) {
        if (e === lastPigEvt) return;
        if (e.target && e.target.closest && e.target.closest('.hud, .gate, button')) return;
        onTap(e, false);
      };
      ctx.stage.addEventListener('pointerdown', stageDown);
      offs.push(function () {
        ctx.stage.removeEventListener('pointerdown', stageDown);
      });
      var onKey = function (e) {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        if (gen !== A.generation() || st.final) return;
        e.preventDefault();
        if (e.repeat) return;
        if (st.busy) {
          set.jiggle.poke(0.35, 0);
          return;
        }
        request({ pt: null, part: 'belly' });
      };
      window.addEventListener('keydown', onKey);
      offs.push(function () {
        window.removeEventListener('keydown', onKey);
      });

      ctx.camera.to({ x: WIDE.x, y: WIDE.y - 4, zoom: WIDE.zoom + 0.04 }, 2400, 'inOutSine');
      await ctx.wait(T.intro);
      showHint(true);
      st.busy = false;
      st.t0 = A.clock();

      while (st.count < REACT.length) {
        var req = await nextPoke(ctx, T, st, showHint);
        st.busy = true;
        st.nudgeId++;
        hideHint();
        await REACT[st.count](ctx, req, T, M);
        st.count++;
        st.pending = null;
        st.busy = false;
        st.rehinted = false;
        st.t0 = A.clock();
      }

      st.final = true;
      offs.forEach(function (off) {
        off();
      });
      offs = [];
      await getSerious(ctx, T, M);
      await ctx.tap();
    } finally {
      offs.forEach(function (off) {
        off();
      });
      pig.el.removeAttribute('transform');
    }

    // wait for a poke; nudge at ~6 s, play the next reaction by itself at ~12 s
    async function nextPoke(ctx, T, st, showHint) {
      var nudged = false;
      while (true) {
        if (st.pending) {
          var r = st.pending;
          st.pending = null;
          return r;
        }
        var ms = idleMs();
        if (!st.anywhere && ms >= T.anywhereAfter) st.anywhere = true;
        if (AUTO && ms >= T.autoTestGap) {
          var pt = st.count % 2 ? headPoint(ctx) : bellyPoint(ctx);
          return { pt: pt, part: st.count % 2 ? 'head' : 'belly' };
        }
        if (st.count > 0 && !st.rehinted && ms >= T.rehintAfter) {
          st.rehinted = true;
          showHint(false);
        }
        if (!nudged && ms >= T.nudgeAfter) {
          nudged = true;
          nudge(ctx, ++st.nudgeId, st, showHint);
        }
        if (ms >= T.autoAfter) return { pt: null, part: 'belly', silent: true };
        await ctx.wait(50);
      }
    }
  }

  // the pig nudges an idle viewer: looks at the camera, brows up, taps its foot
  async function nudge(ctx, id, st, showHint) {
    var pig = ctx.pig;
    function ok() {
      return st.nudgeId === id && !st.pending && !st.busy;
    }
    try {
      set.idle.stop();
      showHint(true);
      await pig.pose({ x: X0, lift: 0, squash: 1, tilt: 0, armL: 10, armR: 10, legL: 0, legR: 0, headTilt: 0 }, 300, 'outCubic');
      if (!ok()) return;
      pig.lookAtViewer(160);
      pig.pose({ eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 1, eyeR: 1, eyeScale: 1.06, browY: -7, browAngle: -8, mouth: 'tiny' }, 220, 'outBack');
      await ctx.wait(380);
      if (!ok()) return;
      await footTaps(ctx, 3);
      if (!ok()) return;
      await pig.pose({ browY: -10 }, 120, 'outQuad');
      await pig.pose({ browY: -5 }, 180, 'outBack');
      ctx.sfx('blip');
      await ctx.wait(700);
      if (!ok()) return;
      pig.express('focused', 280);
      set.idle.start();
    } catch (e) {
      // cancelled with the scene: nothing to do
    }
  }

  P.scenes.register({ id: 'poke', order: 40, title: 'Poke', transition: 'iris', setup: setup, play: play });
})();

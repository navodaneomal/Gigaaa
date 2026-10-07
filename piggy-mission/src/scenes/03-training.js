/*
 * Scene 3: Training. A snappy montage on a sunny outdoor court.
 * Three "professional coach" gags (the stretch, the dribble, the jump), then four drills:
 * 1 RUNNING (stamina: loading…), 2 PASSING (we don't talk about that),
 * 3 SHOOTING (cinematic zoom → SWISH → an Olympic celebration on an imaginary podium)
 * and, in the changing room, 4 CONFIDENCE: the reflection is stronger. "Okay." "She's ready."
 */
(function () {
  'use strict';
  var P = window.PIGGY;
  var A = P.anim;

  var GROUND = 560; // the pig's ground line on the court
  var SCALE = 1.15; // pig size on the court
  var SHOOT_X = 472; // where the pig shoots from
  var POST_X = 630; // netball post (ring is 20 units left of the pole)
  var ZONE_B = 548; // camera x for the shooting end of the court
  var ROOM_GROUND = 572; // changing-room floor line
  var MIRROR_X = 265; // centre of the mirror glass
  var DUST = '#e9f6ef';


  var set = {}; // references shared between setup and play

  P.scenes.css(
    'training',
    [
      '.tr-load{left:50%;top:calc(22% + var(--u)*46);width:calc(var(--u)*150);transform:translateX(-50%) scale(.8);opacity:0;transition:opacity .3s ease,transform .45s cubic-bezier(.2,1.6,.4,1)}',
      '.tr-load.is-in{opacity:1;transform:translateX(-50%)}',
      '.tr-load.is-out{opacity:0;transition:opacity .2s ease}',
      '.tr-load__bar{height:calc(var(--u)*13);padding:calc(var(--u)*2.5);border-radius:999px;background:rgba(8,14,34,.82);border:1px solid rgba(95,211,179,.7);box-shadow:0 0 calc(var(--u)*14) rgba(95,211,179,.25)}',
      '.tr-load__bar i{display:block;height:100%;width:0;border-radius:999px;',
      'background:repeating-linear-gradient(-45deg,#5fd3b3 0 calc(var(--u)*4),#a8f5dc calc(var(--u)*4) calc(var(--u)*8));',
      'animation:trLoad 3.6s cubic-bezier(.2,.9,.3,1) forwards,trStripes .7s linear infinite}',
      '.tr-ready{margin-top:calc(var(--u)*34);color:#ffcf4d}',
      '@keyframes trLoad{0%{width:0}25%{width:16%}45%{width:9%}70%{width:13%}100%{width:11%}}',
      '@keyframes trStripes{to{background-position:calc(var(--u)*11.3) 0}}',
    ].join('')
  );

  /* ======================================================================
   * SET
   * ==================================================================== */

  function setup(ctx) {
    set = { stops: [], balls: [] };
    defs(ctx);
    buildCourt(ctx);

    var pig = ctx.pig;
    pig.outfit(true);
    pig.wear('shades', false);
    pig.place(-70, GROUND, { scale: SCALE, facing: 1 });
    pig.pose({ armL: 8, armR: 8, tailWag: 0.6 }, 0);
    pig.express('determined', 0);
    pig.setMode('idle');
    ctx.camera.set({ x: 180, y: 410, zoom: 1.08 });
  }

  function defs(ctx) {
    var d = ctx.svg.querySelector('defs');
    if (d.querySelector('#trSky')) return;
    d.insertAdjacentHTML(
      'beforeend',
      '<linearGradient id="trSky" gradientUnits="userSpaceOnUse" x1="0" y1="-300" x2="0" y2="470"><stop offset="0" stop-color="#3d7bd4"/><stop offset="0.5" stop-color="#7fb7ff"/><stop offset="0.83" stop-color="#cbe5fb"/><stop offset="1" stop-color="#fff0d4"/></linearGradient>' +
        '<radialGradient id="trSunGlow"><stop offset="0" stop-color="#fffbe8" stop-opacity="0.95"/><stop offset="0.2" stop-color="#fff0b8" stop-opacity="0.55"/><stop offset="1" stop-color="#ffd76a" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="trHillFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3e3d6"/><stop offset="1" stop-color="#a7d0c0"/></linearGradient>' +
        '<linearGradient id="trHillNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9bd69f"/><stop offset="1" stop-color="#6fb47f"/></linearGradient>' +
        '<linearGradient id="trCourt" gradientUnits="userSpaceOnUse" x1="0" y1="478" x2="0" y2="900"><stop offset="0" stop-color="#6acdb6"/><stop offset="1" stop-color="#348c7c"/></linearGradient>' +
        '<radialGradient id="trWash"><stop offset="0" stop-color="#fff6e9" stop-opacity="0.34"/><stop offset="1" stop-color="#fff6e9" stop-opacity="0"/></radialGradient>' +
        '<pattern id="trMesh" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0H9M0 0V9" fill="none" stroke="#ffffff" stroke-width="1.1"/></pattern>' +
        // changing room
        '<linearGradient id="trWall" gradientUnits="userSpaceOnUse" x1="0" y1="-200" x2="0" y2="520"><stop offset="0" stop-color="#0e1435"/><stop offset="1" stop-color="#27346f"/></linearGradient>' +
        '<linearGradient id="trRoomFloor" gradientUnits="userSpaceOnUse" x1="0" y1="510" x2="0" y2="900"><stop offset="0" stop-color="#3d3768"/><stop offset="1" stop-color="#17142f"/></linearGradient>' +
        '<radialGradient id="trLamp"><stop offset="0" stop-color="#ffe2a6" stop-opacity="0.42"/><stop offset="1" stop-color="#ffe2a6" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="trGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6f0ff"/><stop offset="0.55" stop-color="#a7c3ec"/><stop offset="1" stop-color="#cadcf6"/></linearGradient>' +
        '<linearGradient id="trFrame" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9850f"/><stop offset="0.45" stop-color="#ffe08a"/><stop offset="1" stop-color="#b9780c"/></linearGradient>'
    );
  }

  function buildCourt(ctx) {
    var L = ctx.layers;
    var M = ctx.M.training || {};

    // sky + sun (almost fixed to the screen)
    var rays = '';
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * Math.PI * 2;
      var w = 0.07;
      rays +=
        'M' + pt(a - w, 50) + 'L' + pt(a - w * 0.4, 250) + 'L' + pt(a + w * 0.4, 250) + 'L' + pt(a + w, 50) + 'Z';
    }
    var sky = ctx.art(
      '<rect x="-800" y="-700" width="2200" height="1220" fill="url(#trSky)"/>' +
        '<g transform="translate(300 96)"><circle r="215" fill="url(#trSunGlow)"/>' +
        '<path class="tr-rays" d="' + rays + '" fill="#fff6d8" opacity="0.16"/>' +
        '<circle r="37" fill="#fff1bf"/><circle r="29" fill="#fffbea"/></g>',
      { depth: 0.08 }
    );
    var rayEl = sky.querySelector('.tr-rays');

    // drifting clouds
    var clouds = ctx.art(
      '<g class="tr-clouds" opacity="0.94">' +
        cloud(-280, 210, 0.8) + cloud(-70, 128, 1) + cloud(118, 236, 0.66) + cloud(232, 150, 0.82) + cloud(452, 252, 0.72) + cloud(640, 140, 1) + cloud(880, 220, 0.8) +
        '</g>',
      { depth: 0.2 }
    );
    var cloudEl = clouds.querySelector('.tr-clouds');
    set.stops.push(
      ctx.loop(function (dt, clock) {
        cloudEl.setAttribute('transform', 'translate(' + ((clock * 5) % 400).toFixed(1) + ' 0)');
        rayEl.setAttribute('transform', 'rotate(' + ((clock * 4) % 360).toFixed(1) + ')');
      })
    );

    // far hills with the competition stadium on the horizon (foreshadowing)
    ctx.art(
      '<path d="M-800 520V392Q-680 340 -560 372T-320 360T-80 346T160 362T400 340T640 358T880 344T1120 362T1400 350V520Z" fill="url(#trHillFar)"/>' +
        '<g transform="translate(262 358)" opacity="0.92">' +
        '<path d="M-38 6V-9Q0 -22 38 -9V6Z" fill="#dcedf1"/><path d="M-38 -9Q0 -22 38 -9" fill="none" stroke="#b5d1db" stroke-width="2.2"/>' +
        '<path d="M-29 -12V-36M29 -12V-36M0 -20V-36" stroke="#b5d1db" stroke-width="2"/>' +
        '<rect x="-35" y="-42" width="12" height="7" rx="2" fill="#fff8de"/><rect x="23" y="-42" width="12" height="7" rx="2" fill="#fff8de"/>' +
        '<path d="M0 -36l11 3.5-11 3.5Z" fill="#f7a8bd"/></g>',
      { depth: 0.35 }
    );

    // near hills, trees, floodlight towers
    ctx.art(
      '<path d="M-800 520V440Q-700 412 -580 426T-340 418T-100 428T140 412T380 426T620 414T860 428T1100 416T1400 424V520Z" fill="url(#trHillNear)"/>' +
        tower(14, 432) + tower(530, 430) +
        tree(-470, 432, 1) + tree(-300, 426, 0.9) + poplar(-180, 432, 1) + tree(-80, 434, 1.1) + tree(70, 424, 0.85) + poplar(150, 422, 0.9) +
        tree(212, 420, 1) + tree(368, 432, 1.15) + poplar(452, 430, 1) + tree(612, 424, 1) + tree(700, 432, 0.9) + tree(860, 434, 1.1),
      { depth: 0.55 }
    );

    // fence with the passing target, grass verge
    var posts = '';
    for (var x = -800; x <= 1400; x += 80) posts += 'M' + (x - 2.5) + ' 414h5v62h-5Z';
    ctx.art(
      '<rect x="-800" y="422" width="2200" height="52" fill="url(#trMesh)" opacity="0.36"/>' +
        '<path d="' + posts + '" fill="#8799b3"/>' +
        '<rect x="-800" y="416" width="2200" height="5" rx="2.5" fill="#a6b6cb"/><rect x="-800" y="416.6" width="2200" height="1.4" fill="#eef4fa"/>' +
        '<rect x="-800" y="469" width="2200" height="11" fill="#8fd4a0"/>' +
        '<g transform="translate(318 446)"><path d="M-12 -27l3 7M12 -27l-3 7" stroke="#8799b3" stroke-width="1.6" stroke-linecap="round"/>' +
        '<circle r="21" fill="#fff6e9" stroke="#e66f92" stroke-width="2"/><circle r="14" fill="#e66f92"/><circle r="8" fill="#fff6e9"/><circle r="3.6" fill="#ffcf4d"/></g>',
      { layer: 'bg' }
    );

    // the court
    ctx.art(
      '<rect x="-800" y="478" width="2200" height="900" fill="url(#trCourt)"/>' +
        '<ellipse cx="250" cy="560" rx="440" ry="130" fill="url(#trWash)"/>' +
        '<g fill="none" stroke="#effff9" stroke-width="3" stroke-linecap="round" opacity="0.85">' +
        '<path d="M-800 494H1400M-800 726H1400M-120 494L-150 726M300 494L312 726M648 494L668 726"/>' +
        '<ellipse cx="96" cy="610" rx="40" ry="11"/>' +
        '<path d="M650 494A236 116 0 0 0 668 726"/>' +
        '</g>' +
        '<path d="M-800 478H1400" stroke="#2f8a78" stroke-width="2" opacity="0.35"/>',
      { layer: 'bg' }
    );

    // props behind the pig: the whiteboard plan, cones, water bottle, ball basket
    ctx.art(whiteboard(M.board), { layer: 'mid' });
    ctx.props.cone(L.mid, 236, 528, 0.8);
    ctx.props.cone(L.mid, 352, 534, 0.8);
    ctx.props.cone(L.mid, 724, 530, 0.8);
    ctx.art(
      // water bottle
      '<g transform="translate(300 546)"><ellipse rx="10" ry="2.6" fill="url(#propShadow)"/>' +
        '<rect x="-6.5" y="-29" width="13" height="29" rx="4.5" fill="#5fd3b3"/><rect x="-6.5" y="-19" width="13" height="8" fill="#fff6e9"/>' +
        '<rect x="-4.5" y="-34" width="9" height="6" rx="2" fill="#ffffff"/><rect x="-1.3" y="-39" width="2.6" height="6" rx="1.2" fill="#e66f92"/>' +
        '<rect x="-4.5" y="-27" width="2.2" height="22" rx="1.1" fill="#ffffff" opacity="0.45"/></g>' +
        // ball basket at the shooting end
        '<g transform="translate(414 548)"><ellipse rx="27" ry="4.5" fill="url(#propShadow)"/>' +
        miniBall(-11, -31) + miniBall(5, -35) + miniBall(14, -28) +
        '<path d="M-22 -27h44l-4 23h-36Z" fill="#1d2a66" opacity="0.18"/>' +
        '<path d="M-22 -27h44l-4 23h-36ZM-11 -27l-1 23M0 -27v23M11 -27l1 23M-20 -15h40" fill="none" stroke="#7d8aa3" stroke-width="2" stroke-linejoin="round"/>' +
        '<circle cx="-14" cy="-2" r="2.8" fill="#4b5670"/><circle cx="14" cy="-2" r="2.8" fill="#4b5670"/></g>',
      { layer: 'mid' }
    );

    // foreground cones (in front of the pig) frame the shot
    ctx.props.cone(L.front, 12, 640, 1.15);
    ctx.props.cone(L.front, 380, 646, 1.15);

    // the post at the far end: pole/back of ring behind, net/front of ring in front
    set.post = ctx.props.post(L.mid, L.front, { x: POST_X, ground: 548 });

    // a ball waiting on the court for the dribble gag
    set.ball = makeBall(ctx, 262, GROUND - 12);
  }

  function pt(a, r) {
    return (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1);
  }
  function cloud(x, y, s) {
    return (
      '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<rect x="-54" y="-12" width="108" height="24" rx="12" fill="#fff"/><circle cx="-22" cy="-14" r="17" fill="#fff"/><circle cx="6" cy="-22" r="23" fill="#fff"/><circle cx="33" cy="-10" r="14" fill="#fff"/>' +
      '<rect x="-46" y="5" width="92" height="7" rx="3.5" fill="#dbe9f9"/></g>'
    );
  }
  function tree(x, y, s) {
    return (
      '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><rect x="-2" y="-4" width="4" height="12" rx="1" fill="#7a6a58"/>' +
      '<circle cy="-14" r="12" fill="#4f9c6c"/><circle cx="-8" cy="-6" r="9" fill="#5aa876"/><circle cx="8" cy="-7" r="9" fill="#56a572"/>' +
      '<circle cx="-3" cy="-18" r="5" fill="#86cd98" opacity="0.7"/></g>'
    );
  }
  function poplar(x, y, s) {
    return (
      '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><rect x="-1.5" y="-4" width="3" height="10" fill="#7a6a58"/>' +
      '<ellipse cy="-20" rx="8" ry="20" fill="#4a9467"/><ellipse cx="-2.5" cy="-25" rx="3" ry="9" fill="#7cc490" opacity="0.6"/></g>'
    );
  }
  function tower(x, y) {
    return (
      '<g transform="translate(' + x + ' ' + y + ')"><path d="M-2.2 0L-1 -112H1L2.2 0Z" fill="#a3b6c8"/>' +
      '<rect x="-12" y="-124" width="24" height="14" rx="2.5" fill="#7f95ab"/><path d="M-8.5 -120h17M-8.5 -114.5h17" stroke="#fff6d8" stroke-width="2.4" stroke-linecap="round"/></g>'
    );
  }
  function miniBall(x, y) {
    return (
      '<g transform="translate(' + x + ' ' + y + ')"><circle r="9" fill="url(#propBall)" stroke="#8d97ab" stroke-width="1"/>' +
      '<path d="M-9 0Q0 -5 9 0" fill="none" stroke="#f2b33d" stroke-width="1.6"/><path d="M-6.5 5.5Q0 1 6.5 5.5" fill="none" stroke="#4f8be0" stroke-width="1.5"/></g>'
    );
  }
  function whiteboard(text) {
    // "PLAN: 1 RUN · 2 PASS · 3 SHOOT · 4 BELIEVE" → a header and a list
    var parts = String(text).split(':');
    var head = parts.length > 1 ? parts.shift() + ':' : '';
    var items = parts.join(':').split('·').map(function (s) {
      return s.trim();
    }).filter(Boolean);
    var lines = '';
    items.forEach(function (it, i) {
      var last = i === items.length - 1;
      lines += '<text x="8" y="' + (25 + i * 8.6).toFixed(1) + '" font-size="7.8" fill="' + (last ? '#e66f92' : '#1d2a66') + '">' + esc(it) + '</text>';
    });
    var hy = 25 + (items.length - 1) * 8.6 - 3;
    return (
      '<g transform="translate(38 418)">' +
      '<path d="M8 52L2 114M66 52L72 114M37 52V110" stroke="#8b97ad" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="-2" y="-2" width="78" height="60" rx="4" fill="#c4cfe0"/><rect x="1" y="1" width="72" height="54" rx="2.5" fill="#ffffff"/>' +
      '<g font-family="Barlow Condensed, Nunito, sans-serif" font-weight="800">' +
      (head ? '<text x="7" y="13" font-size="10" fill="#e66f92" letter-spacing="0.6">' + esc(head) + '</text>' : '') +
      lines +
      '</g>' +
      '<path d="M7 ' + (hy + 4.5) + 'q20 2.5 42 -0.5" fill="none" stroke="#ffcf4d" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M62 ' + hy + 'c-1.6-2.6-5.2-1-3.6 1.8l3.6 3.6 3.6-3.6c1.6-2.8-2-4.4-3.6-1.8Z" fill="#e66f92"/>' +
      '<circle cx="61" cy="12" r="5.5" fill="none" stroke="#5fd3b3" stroke-width="1.5"/><path d="M55.5 12q5.5-3 11 0" fill="none" stroke="#5fd3b3" stroke-width="1.2"/>' +
      '<rect x="-1" y="57" width="76" height="4" rx="2" fill="#a9b5c8"/><rect x="10" y="54.5" width="10" height="3" rx="1.5" fill="#e66f92"/><rect x="24" y="54.5" width="10" height="3" rx="1.5" fill="#1d2a66"/>' +
      '</g>'
    );
  }

  function buildRoom(ctx) {
    var L = ctx.layers;
    // back wall: lockers, tiles, warm lamp
    var lockers = '';
    var vents = '';
    var handles = '';
    for (var i = 0; i < 9; i++) {
      var x = -330 + i * 50;
      lockers += 'M' + x + ' 238h46v262h-46Z';
      vents += 'M' + (x + 12) + ' 262h22M' + (x + 12) + ' 268h22M' + (x + 12) + ' 274h22M' + (x + 12) + ' 420h22M' + (x + 12) + ' 426h22';
      handles += 'M' + (x + 38) + ' 352v18';
    }
    ctx.art(
      '<rect x="-800" y="-700" width="2200" height="1230" fill="url(#trWall)"/>' +
        '<rect x="-800" y="404" width="2200" height="110" fill="#1f2b62"/>' +
        '<path d="' + tileLines() + '" stroke="#2c3a7c" stroke-width="1.4" fill="none"/>' +
        '<circle cx="262" cy="200" r="260" fill="url(#trLamp)"/>' +
        '<path d="' + lockers + '" fill="#2b3c88" stroke="#16204f" stroke-width="3"/>' +
        '<path d="' + vents + '" stroke="#1a2558" stroke-width="2.4" stroke-linecap="round"/>' +
        '<path d="' + handles + '" stroke="#ffcf4d" stroke-width="3.2" stroke-linecap="round"/>' +
        '<path d="M-330 236h446v-8h-446Z" fill="#3a4c9a"/>' +
        // a towel over one locker door and a star sticker
        '<path d="M-36 236h30v48q-15 6-30 0Z" fill="#f7a8bd"/><path d="M-36 248h30M-36 254h30" stroke="#e66f92" stroke-width="2"/>' +
        '<path d="M-110 300l3.5 7 7.6 1.1-5.5 5.4 1.3 7.6-6.9-3.6-6.9 3.6 1.3-7.6-5.5-5.4 7.6-1.1Z" fill="#ffcf4d"/>' +
        // ceiling lamp
        '<path d="M262 -140V40" stroke="#0a0f28" stroke-width="2"/><path d="M236 52h52l-10-14h-32Z" fill="#ffd38a"/><ellipse cx="262" cy="52" rx="26" ry="4" fill="#fff4d6"/>',
      { depth: 0.85 }
    );
    // floor, mat in front of the mirror, bench
    ctx.art(
      '<rect x="-800" y="504" width="2200" height="900" fill="url(#trRoomFloor)"/>' +
        '<path d="M-800 504H1400" stroke="#4a4580" stroke-width="3"/>' +
        '<path d="M-800 560H1400M-800 640H1400M-800 760H1400" stroke="#2a254d" stroke-width="2" opacity="0.7"/>' +
        '<ellipse cx="262" cy="560" rx="260" ry="46" fill="url(#trLamp)"/>' +
        '<ellipse cx="190" cy="580" rx="150" ry="22" fill="#5fd3b3" opacity="0.28"/>' +
        '<ellipse cx="190" cy="580" rx="140" ry="18" fill="none" stroke="#5fd3b3" stroke-width="2" stroke-dasharray="6 6" opacity="0.5"/>',
      { layer: 'bg' }
    );
    ctx.art(
      '<path d="M-240 516h300" stroke="#0b1020" stroke-width="10" stroke-linecap="round" opacity="0.25"/>' +
        '<path d="M-220 520v36M40 520v36" stroke="#6b4f35" stroke-width="6" stroke-linecap="round"/>' +
        '<rect x="-250" y="500" width="320" height="14" rx="6" fill="#b88a5a"/><rect x="-250" y="500" width="320" height="4" rx="2" fill="#d6a874"/>',
      { layer: 'mid' }
    );

    // the full-length mirror: frame, glass, reflection (clipped), shine, bulbs
    var glass = 'M' + (MIRROR_X - 58) + ' 586V318a58 58 0 0 1 116 0V586Z';
    var frame = 'M' + (MIRROR_X - 70) + ' 596V318a70 70 0 0 1 140 0V596Z';
    var mirror = ctx.art(
      '<defs><clipPath id="trMirrorClip"><path d="' + glass + '"/></clipPath></defs>' +
        '<path d="M' + (MIRROR_X - 60) + ' 600l-10 12h22M' + (MIRROR_X + 60) + ' 600l10 12h-22" stroke="#9d6a10" stroke-width="5" stroke-linecap="round" fill="none"/>' +
        '<path d="' + frame + '" fill="url(#trFrame)"/>' +
        '<path d="' + glass + '" fill="url(#trGlass)"/>' +
        '<g clip-path="url(#trMirrorClip)">' +
        '<rect x="' + (MIRROR_X - 70) + '" y="540" width="140" height="60" fill="#8ea6d6" opacity="0.55"/>' +
        '<rect x="' + (MIRROR_X - 70) + '" y="250" width="40" height="300" fill="#b5c9ef" opacity="0.5"/>' +
        '<g class="tr-reflection"></g>' +
        '<path d="M' + (MIRROR_X - 70) + ' 430L' + (MIRROR_X + 10) + ' 250h26L' + (MIRROR_X - 70) + ' 470Z" fill="#ffffff" opacity="0.22"/>' +
        '<path d="M' + (MIRROR_X - 30) + ' 600L' + (MIRROR_X + 70) + ' 420v22L' + (MIRROR_X - 8) + ' 600Z" fill="#ffffff" opacity="0.14"/>' +
        '</g>' +
        bulbs(),
      { layer: 'mid' }
    );
    var refl = mirror.querySelector('.tr-reflection');
    var mp = ctx.Pig.create(refl, { buff: true });
    autoDestroy(mp);
    mp.outfit(true);
    mp.place(MIRROR_X + 2, ROOM_GROUND - 6, { scale: 1.32, facing: -1 });
    mp.express('calm', 0);
    mp.setMode('idle');
    set.mirror = mp;
    set.bump = addBumps(mp);
  }

  function tileLines() {
    var d = '';
    for (var y = 420; y < 514; y += 18) d += 'M-800 ' + y + 'H1400';
    for (var x = -800; x < 1400; x += 26) d += 'M' + x + ' 404V514';
    return d;
  }
  function bulbs() {
    var out = '';
    for (var i = 0; i < 7; i++) {
      var a = Math.PI + (i / 6) * Math.PI;
      var bx = MIRROR_X + Math.cos(a) * 64;
      var by = 318 + Math.sin(a) * 64;
      out += '<circle cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="9" fill="url(#trLamp)"/><circle cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="3.6" fill="#fff4d6"/>';
    }
    return out;
  }

  // the reflection's biceps: little bumps on each arm that pump when it flexes
  function addBumps(mp) {
    var st = { k: 0 };
    var els = ['armL', 'armR'].map(function (k) {
      var g = A.svg('g', null, mp.parts[k]);
      g.innerHTML = '<ellipse cx="-5" cy="7" rx="7" ry="6" fill="url(#pigSkin)" stroke="#c25a78" stroke-width="1.5"/>';
      return g;
    });
    A.onFrame(function () {
      if (!mp.el.isConnected) return false;
      var t = 'translate(-5 7) scale(' + Math.max(0.001, st.k).toFixed(3) + ') translate(5 -7)';
      els[0].setAttribute('transform', t);
      els[1].setAttribute('transform', t);
    });
    return st;
  }

  /* ======================================================================
   * HELPERS
   * ==================================================================== */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // extra props/pigs keep a ticker running until destroyed: destroy them once the runner clears them away
  function autoDestroy(obj) {
    A.onFrame(function () {
      if (!obj.el.isConnected) {
        obj.destroy();
        return false;
      }
    });
    return obj;
  }

  function makeBall(ctx, x, y) {
    var b = ctx.props.ball(ctx.layers.actors, { x: x, y: y, ground: GROUND, r: 12 });
    return autoDestroy(b);
  }

  // keep the ball glued to a pig pose: 'chest' (between both hooves) or 'R' (beyond the right hoof)
  function holdBall(ctx, ball, mode) {
    var pig = ctx.pig;
    function place() {
      var p;
      if (mode === 'chest') {
        var a = pig.pointOn(pig.parts.armL, 0, 20);
        var b = pig.pointOn(pig.parts.armR, 0, 20);
        p = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 5 };
      } else {
        p = pig.pointOn(pig.parts.armR, 0, 32);
      }
      ball.p.x = p.x;
      ball.p.y = p.y;
    }
    place();
    return ctx.loop(place);
  }

  // the camera chases the pig horizontally (not in reduced motion)
  function camTrack(ctx, lo, hi, k) {
    if (ctx.reduced) return function () {};
    var c = ctx.camera.state;
    A.set(c, { x: c.x }); // take the x axis over from any camera tween
    return ctx.loop(function (dt) {
      var tx = A.clamp(ctx.pig.p.x, lo, hi);
      c.x += (tx - c.x) * Math.min(1, dt * (k || 5));
    });
  }

  // drill label: "TRAINING 1 · RUNNING" + a coach's whistle
  function label(ctx, d, T) {
    ctx.sfx('whistle', 0, 0.22);
    return ctx.caption(d.label + ' · ' + d.name, { style: 'label', pos: 'top', hold: T.labelHold, enter: 'pop' });
  }

  // A front-facing kick needs the leg in front of the belly and rotated, which the rig can't do:
  // hide the rig's right leg and draw a stand-in on top. restoreLeg() always undoes it.
  var LEG =
    '<rect x="-6" y="0" width="12" height="20" rx="6" fill="url(#pigSkin)" stroke="#c25a78" stroke-width="1.7" stroke-linejoin="round"/>' +
    '<g transform="translate(0 3)"><path d="M-8 9h12a6 6 0 0 1 6 6v1.5a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2V13a4 4 0 0 1 3-4Z" fill="#fff" stroke="#9aa6c2" stroke-width="1.1"/>' +
    '<path d="M-6 14q5 0 9-3" fill="none" stroke="#5fd3b3" stroke-width="2" stroke-linecap="round"/><rect x="-9" y="16.5" width="20" height="2" rx="1" fill="#d8deeb"/></g>';
  function fakeLeg(ctx) {
    restoreLeg(ctx);
    var pig = ctx.pig;
    var g = A.svg('g', { class: 'tr-leg' }, pig.parts.root);
    g.innerHTML = LEG;
    pig.parts.legR.style.visibility = 'hidden';
    var p = { rot: 0, lift: 0 };
    var stop = A.onFrame(function () {
      g.setAttribute('transform', 'translate(13 ' + (-18 - p.lift).toFixed(2) + ') rotate(' + p.rot.toFixed(2) + ')');
    });
    set.leg = { g: g, stop: stop, p: p };
    return p;
  }
  function restoreLeg(ctx) {
    if (!set.leg) return;
    set.leg.stop();
    set.leg.g.remove();
    ctx.pig.parts.legR.style.visibility = '';
    set.leg = null;
  }

  // a little 4-point glint (eye shine, ring twinkle) in the fx layer
  function glint(ctx, x, y, size, color) {
    var g = A.svg('path', { d: 'M0-10L2.2-2.2 10 0 2.2 2.2 0 10-2.2 2.2-10 0-2.2-2.2Z', fill: color || '#ffffff' }, ctx.layers.fx);
    var st = { s: 0.01, r: 0 };
    var stop = A.onFrame(function () {
      g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + st.r.toFixed(1) + ') scale(' + (st.s * size).toFixed(3) + ')');
    });
    return A.quiet(
      A.tween(st, { s: 1, r: 45 }, 160, 'outBack')
        .then(function () {
          return A.tween(st, { s: 0.01, r: 90 }, 320, 'inQuad');
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

  function sweat(ctx, n) {
    var h = ctx.pig.head();
    for (var i = 0; i < (n || 1); i++) ctx.fx.sweat(h.x + (i % 2 ? -26 : 26), h.y - 18, i % 2 ? -1 : 1);
  }

  /* ======================================================================
   * PLAY
   * ==================================================================== */

  async function play(ctx) {
    var T = ctx.T.training;
    var M = ctx.M.training;
    try {
      await intro(ctx, T, M);
      await stretchGag(ctx, T, M);
      await dribbleGag(ctx, T, M);
      await jumpGag(ctx, T, M);
      await drillRun(ctx, T, M);
      await drillPass(ctx, T, M);
      await drillShoot(ctx, T, M);
      await drillMirror(ctx, T, M);
    } finally {
      restoreLeg(ctx);
    }
  }

  // 0. the coach arrives. Arms crossed. Very professional.
  async function intro(ctx, T, M) {
    var pig = ctx.pig;
    ctx.music('training', 0.6);
    ctx.ambience('room', 0.5);
    ctx.camera.to({ x: 180, y: 432, zoom: 1.3 }, T.jogIn + 500, 'inOutSine');
    ctx.caption(M.title, { style: 'label', pos: 'top', hold: T.jogIn + 900, enter: 'pop' });
    var stopDust = ctx.every(150, function () {
      ctx.fx.puff(pig.p.x - 10, GROUND, { count: 2, size: 0.55, color: DUST });
    });
    await pig.walkTo(180, T.jogIn, { run: true, cycle: 0.9, ease: 'outQuad' });
    stopDust();
    // skid to a stop
    ctx.fx.puff(pig.p.x + 14, GROUND, { count: 5, size: 0.7, color: DUST, angle: -Math.PI * 0.1, spread: Math.PI * 0.6 });
    await pig.pose({ tilt: -10, squash: 0.9 }, 110, 'outQuad');
    pig.pose({ tilt: 0, squash: 1 }, 380, 'outBack');
    // the coach pose
    pig.express('proud', 160);
    ctx.sfx('whistle', 0.05, 0.3);
    await pig.pose({ armL: -72, armR: -72, squash: 1.05, nod: -2 }, 300, 'outBack');
    await pig.pose({ nod: 3 }, 140, 'outQuad');
    await pig.pose({ nod: 0 }, 220, 'outBack');
    await ctx.wait(380);
  }

  // 1a. The stretch. The leg gives up immediately.
  async function stretchGag(ctx, T, M) {
    var pig = ctx.pig;
    ctx.camera.to({ x: 186, y: 440, zoom: 1.38 }, 600, 'inOutCubic');
    pig.express('focused', 200);
    pig.lookAt(320, 420, 200);
    await pig.pose({ armL: 30, armR: 30, squash: 0.9, nod: 1 }, 170, 'outQuad');
    var leg = fakeLeg(ctx);
    ctx.sfx('slideUp');
    await Promise.all([
      pig.pose({ squash: 1.06, armL: 140, armR: 68, tilt: -12, rot: -4, nod: 0 }, 380, 'outBack'),
      A.tween(leg, { rot: -122, lift: 13 }, 380, 'outBack'),
    ]);
    pig.express('proud', 160);
    pig.lookAtViewer(200);
    // the wobble
    var t0 = A.clock();
    var wob = ctx.loop(function (dt, clock) {
      var e = clock - t0;
      var k = Math.min(1, e / (T.wobble / 1000));
      pig.p.rot = -4 + Math.sin(e * 15) * (1 + k * 5);
      pig.p.armL = 140 + Math.sin(e * 15 + 1.2) * 18 * k;
      leg.rot = -122 + Math.sin(e * 22) * 9 * k;
    });
    await ctx.wait(T.wobble * 0.55);
    pig.express('nervous', 160);
    sweat(ctx, 1);
    await ctx.wait(T.wobble * 0.45);
    wob();
    // …and it gives up
    ctx.sfx('slideDown');
    pig.express('embarrassed', 90);
    A.tween(leg, { rot: 0, lift: 0 }, 150, 'inQuad');
    await pig.pose({ squash: 0.74, lift: -8, rot: 0, tilt: 5, armL: -8, armR: -8, nod: 5, headTilt: 6, earL: 38, earR: 38 }, 210, 'inQuad');
    restoreLeg(ctx);
    ctx.sfx('thud');
    ctx.fx.puff(pig.p.x, GROUND, { count: 6, size: 0.7, color: DUST });
    sweat(ctx, 2);
    await ctx.wait(T.freeze);
    // deadpan look at the camera
    ctx.camera.to({ x: 180, y: 470, zoom: 1.6 }, 420, 'outCubic');
    await Promise.all([pig.lookAtViewer(200), pig.express('deadpan', 200)]);
    pig.pose({ earL: 30, earR: 26, headTilt: 0 }, 200);
    await ctx.say(M.stretchGag, { hold: T.gagLine });
    // back up, as if nothing happened
    ctx.camera.to({ x: 196, y: 440, zoom: 1.38 }, 500, 'inOutCubic');
    pig.express('neutral', 260);
    await pig.pose({ squash: 1, lift: 0, tilt: 0, armL: 8, armR: 8, nod: 0, earL: 0, earR: 0 }, 380, 'outBack');
  }

  // 1b. The dribble. Ball, meet face.
  async function dribbleGag(ctx, T, M) {
    var pig = ctx.pig;
    var ball = set.ball;
    // step up to the ball and pop it into the hoof
    pig.express('proud', 200);
    await pig.walkTo(224, 380, { cycle: 1.3 });
    pig.p.facing = 1;
    await pig.pose({ armR: 36, tilt: 4 }, 160, 'outQuad');
    var hand = pig.pointOn(pig.parts.armR, 0, 32);
    ctx.sfx('pop');
    await ball.arc(hand.x, hand.y, 260, 26, { spin: 200 });
    var stopHold = holdBall(ctx, ball, 'R');
    pig.lookAt(hand.x, GROUND, 120);

    // two smooth dribbles, getting cocky
    for (var i = 0; i < 2; i++) {
      stopHold();
      var top = { x: ball.p.x, y: ball.p.y };
      pig.pose({ armR: 18, squash: 0.95 }, T.dribble * 0.4, 'outQuad');
      await A.tween(ball.p, { y: GROUND - ball.r }, T.dribble * 0.45, 'inQuad');
      ctx.sfx('bounce', 0, 0.2);
      pig.pose({ armR: 36, squash: 1 }, T.dribble * 0.5, 'outQuad');
      await A.tween(ball.p, { y: top.y }, T.dribble * 0.55, 'outQuad');
      stopHold = holdBall(ctx, ball, 'R');
      if (i === 0) {
        pig.lookAtViewer(140);
        pig.express('proud', 120);
      }
    }
    // the power dribble: wind up…
    pig.express('determined', 120);
    pig.lookAt(hand.x, GROUND, 120);
    await pig.pose({ armR: 150, squash: 1.07, tilt: -8 }, 240, 'outCubic');
    await ctx.wait(110);
    // …SLAM
    await pig.pose({ armR: 24, squash: 0.9, tilt: 10 }, 80, 'inQuad');
    stopHold();
    await A.tween(ball.p, { y: GROUND - ball.r }, 70, 'inQuad');
    ctx.sfx('bounce', 0, 0.45);
    ctx.fx.puff(ball.p.x, GROUND, { count: 4, size: 0.6, color: DUST });
    var face = pig.pointOn(pig.parts.snout, 0, 0);
    await A.tween(ball.p, { x: face.x + 4, y: face.y - 4 }, 100, 'outQuad');
    // BONK
    ctx.sfx('bonk');
    ctx.fx.impact(face.x, face.y, { size: 3.6 });
    ctx.fx.sparkle(face.x, face.y - 10, { count: 6, color: '#fff6e9' });
    ctx.camera.shake(7, 300);
    ctx.boom(ctx.M.signs.bonk, face.x + 50, face.y - 62, { size: 36, rot: -10, hold: 700 });
    pig.express('ow', 40);
    pig.pose({ headTilt: -20, nod: -3, tilt: -12, squash: 1.1, armL: 60, armR: 70, earL: -24, earR: -24 }, 70, 'outQuad');
    ball.arc(98, GROUND - ball.r, 680, 120, { spin: -620 }).then(function () {
      ctx.sfx('bounce', 0, 0.16);
      return ball.roll(-120, 900, 'outQuad');
    });
    await ctx.wait(140);
    await pig.pose({ squash: 1, earL: 22, earR: 22 }, 260, 'outElastic');
    await ctx.wait(T.freeze);
    // slowly back… deadpan
    await pig.pose({ headTilt: 0, nod: 0, tilt: 0, armL: 8, armR: 8 }, 420, 'inOutSine');
    pig.express('deadpan', 160);
    await ctx.wait(220);
    ctx.camera.to({ x: 226, y: 470, zoom: 1.65 }, 420, 'outCubic');
    await pig.lookAtViewer(220);
    await ctx.say(M.dribbleGag, { hold: T.gagLine });
  }

  // 1c. The jump. Enormous wind-up. Microscopic jump.
  async function jumpGag(ctx, T, M) {
    var pig = ctx.pig;
    ctx.camera.to({ x: 180, y: 452, zoom: 1.32 }, 500, 'inOutCubic');
    pig.express('neutral', 160);
    await pig.walkTo(180, 380, { cycle: 1.3 });
    pig.p.facing = 1;
    await pig.lookAtViewer(120);
    // the hush
    ctx.music('none', 0.25);
    pig.express('determined', 200);
    await ctx.wait(240);
    ctx.sfx('drumroll', 0, T.jumpCharge / 1000);
    ctx.sfx('slideUp', Math.max(0, T.jumpCharge / 1000 - 0.45));
    ctx.camera.to({ x: 180, y: 470, zoom: 1.55 }, T.jumpCharge, 'inSine');
    var base = pig.p.x;
    var charge = { k: 0 };
    A.tween(charge, { k: 1 }, T.jumpCharge, 'inQuad');
    var shake = ctx.loop(function (dt, clock) {
      pig.p.x = base + Math.sin(clock * 75) * 1.4 * charge.k;
    });
    var dust = ctx.every(200, function () {
      ctx.fx.puff(pig.p.x, GROUND, { count: 3, size: 0.6, color: DUST, power: 0.6 + charge.k });
      if (!ctx.reduced && charge.k > 0.4) ctx.fx.sparkle(pig.p.x + A.rand(-50, 50), GROUND - A.rand(20, 120), { count: 1, power: 0.3, color: '#ffcf4d' });
    });
    await pig.pose({ squash: 0.6, armL: -40, armR: -40, earL: -26, earR: -26, nod: 3, browAngle: 22 }, T.jumpCharge, 'inOutSine');
    shake();
    dust();
    pig.p.x = base;
    // LAUNCH (barely)
    pig.pose({ squash: 1.16, armL: 165, armR: 165, earL: -32, earR: -32, nod: 0 }, 90, 'outQuad');
    await A.tween(pig.p, { lift: 6 }, 120, 'outQuad');
    await A.tween(pig.p, { lift: 0 }, 110, 'inQuad');
    ctx.sfx('tap');
    ctx.fx.puff(pig.p.x, GROUND, { count: 2, size: 0.4, color: DUST, power: 0.4 });
    await pig.pose({ squash: 0.94 }, 70, 'outQuad');
    pig.pose({ squash: 1 }, 260, 'outBack');
    pig.express('proud', 120);
    await ctx.wait(T.jumpHold);
    // …it looks down at its feet. Then at us.
    await pig.lookAt(pig.p.x, GROUND + 120, 260);
    pig.express('serious', 200);
    await ctx.wait(420);
    pig.pose({ armL: 8, armR: 8, earL: 8, earR: 8 }, 700, 'inOutSine');
    await Promise.all([pig.lookAtViewer(240), pig.express('deadpan', 240)]);
    ctx.music('training', 0.6);
    await ctx.caption(M.jumpGag, { style: 'hud', pos: 'upper', hold: T.jumpLine });
  }

  // 2. RUNNING: very fast. Briefly.
  async function drillRun(ctx, T, M) {
    var pig = ctx.pig;
    var d = M.drills[0];
    label(ctx, d, T);
    ctx.camera.to({ x: 180, y: 436, zoom: 1.18 }, 500, 'inOutCubic');
    pig.express('determined', 160);
    pig.lookAt(400, 470, 160);
    // sprinter's crouch
    await pig.pose({ squash: 0.84, tilt: 16, armL: 70, armR: -40, nod: 2 }, 300, 'outCubic');
    await ctx.wait(420);
    // GO
    ctx.sfx('whoosh');
    var running = ctx.every(55, function () {
      if (pig.mode() !== 'run') return;
      var f = pig.p.facing;
      if (!ctx.reduced) ctx.fx.speedLine(pig.p.x - f * 46, pig.p.y - A.rand(30, 130), f);
      if (Math.random() < 0.5) ctx.fx.puff(pig.p.x - f * 12, GROUND, { count: 2, size: 0.6, color: DUST, power: 0.6 });
    });
    var track = camTrack(ctx, -30, 430, 5);
    pig.pose({ squash: 1, tilt: 0, nod: 0, armL: 8, armR: 8 }, 120);
    await pig.walkTo(660, T.sprintOut, { run: true, cycle: 1.9, ease: 'inQuad' });
    ctx.sfx('whoosh');
    await pig.walkTo(-260, T.sprintBack, { run: true, cycle: 2.1 });
    ctx.sfx('whoosh');
    await pig.walkTo(30, 320, { run: true, cycle: 1.8 });
    running();
    // …and the battery dies
    pig.express('tired', 260);
    pig.pose({ tilt: 14, nod: 6, armL: -4, armR: -4, tailWag: 0 }, 400);
    var sweaty = ctx.every(320, function () {
      sweat(ctx, 1);
    });
    track();
    ctx.camera.to({ x: 168, y: 474, zoom: 1.36 }, T.tiredWalk, 'inOutSine');
    await pig.walkTo(160, T.tiredWalk, { cycle: 0.55, ease: 'outQuad' });
    await ctx.wait(160);
    await pig.fall();
    pig.express('tired', 80);
    pig.pose({ eyeL: 0.3, eyeR: 0.3 }, 200);
    ctx.sfx('thud');
    ctx.fx.puff(pig.p.x + 30, GROUND, { count: 7, size: 0.8, color: DUST });
    sweaty();
    // STAMINA: LOADING…
    var cap = ctx.caption(d.line, { style: 'hud', pos: 'upper', stay: true });
    var bar = ctx.panel('<div class="tr-load__bar"><i></i></div>', 'tr-load');
    var t0 = A.clock();
    var pant = ctx.loop(function (dt, clock) {
      pig.p.squash = 1 + Math.sin((clock - t0) * 9) * 0.035;
    });
    var drip = ctx.every(900, function () {
      sweat(ctx, 1);
    });
    await cap;
    await ctx.wait(T.staminaMin);
    await ctx.tap();
    cap.hide();
    bar.classList.add('is-out');
    pant();
    drip();
    // up again, shake it off
    pig.pose({ squash: 1, eyeL: 1, eyeR: 1, tailWag: 0.6 }, 0);
    await pig.getUp(460);
    pig.wiggle(420);
    pig.express('determined', 200);
    await ctx.wait(260);
    bar.remove();
  }

  // 3. PASSING: a perfect chest pass… to nobody, into the distance.
  async function drillPass(ctx, T, M) {
    var pig = ctx.pig;
    var d = M.drills[1];
    label(ctx, d, T);
    ctx.camera.to({ x: 196, y: 438, zoom: 1.2 }, 500, 'inOutCubic');
    pig.p.facing = 1;
    await pig.walkTo(140, 360, { cycle: 1.4 });
    pig.p.facing = 1;
    // a ball is tossed in from off-screen: catch!
    pig.express('surprised', 120);
    pig.lookAt(0, 380, 160);
    await pig.pose({ armL: -60, armR: -60 }, 220, 'outBack');
    var a = pig.pointOn(pig.parts.armL, 0, 20);
    var b = pig.pointOn(pig.parts.armR, 0, 20);
    var ball = makeBall(ctx, -60, 330);
    ball.p.ground = null;
    ctx.sfx('whoosh');
    await ball.arc((a.x + b.x) / 2, (a.y + b.y) / 2 - 5, 480, 50, { spin: 400 });
    var stopHold = holdBall(ctx, ball, 'chest');
    ctx.sfx('pop');
    pig.boing(0.6);
    // aim
    pig.express('determined', 160);
    await pig.lookAt(318, 446, 200);
    await pig.pose({ tilt: -10, squash: 0.92, armL: -76, armR: -76 }, 320, 'outCubic');
    await ctx.wait(260);
    // throw!
    pig.pose({ tilt: 14, squash: 1.06, armL: 40, armR: 96 }, 110, 'outQuad');
    await ctx.wait(60);
    stopHold();
    ctx.sfx('whoosh');
    ctx.camera.to({ x: 248, y: 410, zoom: 1.02 }, 900, 'outCubic');
    var watch = ctx.loop(function () {
      pig.lookAt(ball.p.x, ball.p.y, 0);
    });
    await ball.arc(404, 286, T.passFlight, 190, { scale: 0.1, spin: 1300, ease: 'outCubic' });
    // gone. *ting*
    ball.p.opacity = 0;
    glint(ctx, 404, 286, 1.3, '#fff6d8');
    ctx.sfx('sparkle');
    ctx.sfx('bounce', 0.55, 0.05);
    ctx.sfx('bounce', 0.8, 0.025);
    watch();
    // the long silent stare
    ctx.music('none', 0.3);
    await pig.pose({ tilt: 4, squash: 1 }, 400, 'inOutSine');
    await ctx.wait(T.passStare);
    // slowly turns to camera
    ctx.camera.to({ x: 152, y: 462, zoom: 1.62 }, 800, 'inOutSine');
    await Promise.all([pig.lookAtViewer(800), pig.express('deadpan', 600), pig.pose({ tilt: 0, armL: 8, armR: 8 }, 800, 'inOutSine')]);
    await ctx.wait(260);
    await ctx.say(d.line, { hold: T.passLine });
    ctx.music('training', 0.6);
    await ctx.tap();
  }

  // 4. SHOOTING: the cinematic one.
  async function drillShoot(ctx, T, M) {
    var pig = ctx.pig;
    var post = set.post;
    var ring = post.ring;
    var d = M.drills[2];
    label(ctx, d, T);
    // whip-pan down the court
    ctx.sfx('whoosh');
    ctx.camera.to({ x: ZONE_B, y: 430, zoom: 1.04 }, 700, 'inOutCubic');
    await pig.walkTo(SHOOT_X, 720, { run: true, cycle: 1.3, ease: 'inOutSine' });
    pig.p.facing = 1;
    // a ball from the basket
    pig.lookAt(414, 520, 120);
    await pig.pose({ armL: 70, tilt: -6 }, 200, 'outQuad');
    var ball = makeBall(ctx, 419, 512);
    await pig.pose({ armL: 120, armR: 150, tilt: 0, squash: 0.96 }, 160, 'outBack');
    var hold = pig.pointOn(pig.parts.armR, 0, 32);
    ctx.sfx('pop');
    await ball.arc(hold.x, hold.y, 300, 46, { spin: 300 });
    var stopHold = holdBall(ctx, ball, 'R');
    pig.boing(0.5);
    pig.express('focused', 200);
    await pig.lookAt(ring.x, ring.y, 200);

    // the dramatic close-up: letterbox, tense music, heartbeat
    ctx.letterbox(true);
    ctx.music('tense', 0.3);
    ctx.sfx('heartbeat');
    var beat = ctx.every(820, function () {
      ctx.sfx('heartbeat');
    });
    var h = pig.head();
    await ctx.camera.to({ x: h.x + 4, y: h.y - 4, zoom: 3.1 }, 850, 'inOutCubic');
    await pig.pose({ eyeL: 0.55, eyeR: 0.55, browAngle: 18 }, 280, 'outQuad');
    await ctx.wait(320);
    // cut: the ring
    await ctx.camera.to({ x: ring.x, y: ring.y + 8, zoom: 2.7 }, 0);
    await ctx.wait(520);
    // cut: the eye (glint)
    await ctx.camera.to({ x: h.x + 6, y: h.y - 2, zoom: 3.7 }, 0);
    await ctx.wait(160);
    var eye = pig.pointOn(pig.parts.eyeR, 2, -3);
    ctx.sfx('sparkle');
    await glint(ctx, eye.x, eye.y, 0.9, '#ffffff');
    await ctx.wait(120);
    beat();

    // SHOOT
    ctx.camera.to({ x: ZONE_B, y: 424, zoom: 1.04 }, 320, 'outCubic');
    await pig.pose({ squash: 0.86, armR: 140 }, 100, 'outQuad');
    ctx.slowmo(0.5, 140);
    pig.pose({ squash: 1.1, armR: 176, armL: 150, lift: 8 }, 130, 'outQuad');
    await ctx.wait(70);
    stopHold();
    ball.p.ground = null;
    ctx.sfx('whoosh');
    await ball.arc(ring.x, ring.y - 16, T.shotFlight, 120, { spin: 520 });
    pig.pose({ lift: 0, squash: 1 }, 200, 'outQuad');
    // SWISH
    ctx.slowmo(1);
    post.swish();
    ctx.sfx('swish');
    ctx.flash('#ffffff', 320);
    ctx.music('training', 0.2);
    ctx.caption(d.line, { style: 'title', pos: 'upper', enter: 'slam', hold: T.swishHold });
    await A.tween(ball.p, { y: ring.y + 34 }, 150, 'inQuad');
    ball.p.ground = GROUND - 6;
    ball.bounce(GROUND - 6, 700).then(function () {
      return ball.roll(ring.x + 60, 900, 'outQuad');
    });

    // celebrate like it just won the Olympics
    pig.express('joy', 100);
    ctx.camera.to({ x: ZONE_B - 24, y: 418, zoom: 1.06 }, 600, 'outCubic');
    ctx.sfx('cheer', 0, 2.6);
    ctx.fx.confetti(pig.p.x, pig.p.y - 120, { count: 70, power: 560 });
    var pod = podium(ctx, pig.p.x);
    ctx.sfx('boing');
    await A.tween(pod.st, { k: 1 }, 380, 'outBack');
    ctx.sfx('fanfare');
    fireworks(ctx);
    await pig.celebrate(T.celebrate);
    pig.express('proud', 160);
    await pig.pose({ armL: 150, armR: 150, squash: 1.05 }, 260, 'outBack');
    await ctx.wait(360);
    // …the podium was imaginary
    ctx.sfx('pop');
    ctx.fx.puff(pig.p.x, GROUND - 20, { count: 8, size: 1.1, color: '#ffffff', spread: Math.PI * 2 });
    pod.st.o = 0;
    pig.express('surprised', 60);
    await A.tween(pod.st, { k: 0 }, 180, 'inQuad');
    ctx.sfx('thud');
    pig.pose({ squash: 0.8 }, 70, 'outQuad').then(function () {
      return pig.pose({ squash: 1 }, 320, 'outBack');
    });
    pig.pose({ armL: 8, armR: 8 }, 300, 'outBack');
    await ctx.wait(420);
    pig.express('proud', 200);
    pig.lookAtViewer(200);
    pig.thumbsUp('R');
    ctx.letterbox(false);
    await ctx.wait(500);
    await ctx.tap();
  }

  // a tiny podium rises under the pig, carrying it up (and pops, later)
  function podium(ctx, x) {
    var pig = ctx.pig;
    var g = A.svg('g', { class: 'tr-podium' });
    ctx.layers.actors.insertBefore(g, pig.el);
    g.innerHTML =
      '<rect x="-38" y="-46" width="76" height="46" rx="4" fill="#fff6e9"/><rect x="-38" y="-46" width="76" height="8" rx="4" fill="#ffcf4d"/>' +
      '<rect x="-38" y="-6" width="76" height="6" fill="#eadcc4"/>' +
      '<text x="0" y="-13" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-style="italic" font-weight="800" font-size="27" fill="#e66f92">1</text>';
    var st = { k: 0, o: 1 };
    ctx.loop(function () {
      g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + GROUND + ') scale(1 ' + Math.max(0.001, st.k).toFixed(3) + ')');
      g.setAttribute('opacity', st.o);
      pig.p.y = GROUND - 46 * st.k;
    });
    return { st: st, g: g };
  }

  function fireworks(ctx) {
    var spots = [[ZONE_B - 120, 250, '#ffcf4d'], [ZONE_B + 70, 190, '#f7a8bd'], [ZONE_B - 30, 160, '#5fd3b3'], [ZONE_B + 140, 280, '#ffffff']];
    spots.forEach(function (s, i) {
      ctx.wait(500 + i * 260).then(function () {
        ctx.sfx('pop');
        ctx.fx.sparkle(s[0], s[1], { count: 12, power: 1.7, color: s[2] });
        ctx.fx.impact(s[0], s[1], { size: 3.2, color: s[2] });
      }, function () {});
    });
  }

  // 5. CONFIDENCE: the changing room mirror.
  async function drillMirror(ctx, T, M) {
    var pig = ctx.pig;
    var d = M.drills[3];
    // cut to the changing room
    await ctx.curtain('wipe', true);
    teardownCourt(ctx);
    buildRoom(ctx);
    var mp = set.mirror;
    pig.place(112, ROOM_GROUND, { scale: SCALE, facing: 1 });
    pig.setMode('idle');
    pig.pose({ armL: 8, armR: 8, tilt: 0, rot: 0, lift: 0, squash: 1, nod: 0, headTilt: 0, tailWag: 0.4 }, 0);
    pig.express('calm', 0);
    pig.lookAt(MIRROR_X, 450, 0);
    var sync = { on: true };
    var SYNC = ['armL', 'armR', 'legL', 'legR', 'tilt', 'squash', 'nod', 'headTilt', 'lift', 'turn', 'lookX', 'lookY', 'earL', 'earR', 'eyeL', 'eyeR', 'eyeScale', 'browAngle', 'browY', 'blush', 'tailWag', 'eyeStyleL', 'eyeStyleR', 'mouth'];
    ctx.loop(function () {
      if (!sync.on) return;
      for (var i = 0; i < SYNC.length; i++) mp.p[SYNC[i]] = pig.p[SYNC[i]];
    });
    ctx.camera.to({ x: 196, y: 444, zoom: 1.12 }, 0);
    ctx.music('playful', 0.6);
    ctx.ambience('room', 1);
    await ctx.curtain('wipe', false);
    label(ctx, d, T);
    await ctx.wait(450);

    // it's a mirror: the reflection copies the wave
    await pig.pose({ armR: 96, headTilt: 6 }, 380, 'outBack');
    await pig.pose({ armR: 80 }, 150, 'inOutSine');
    await pig.pose({ armR: 96 }, 150, 'inOutSine');
    await ctx.wait(220);

    // …the real pig stops. The reflection doesn't.
    sync.on = false;
    pig.pose({ armR: 8, headTilt: 0 }, 320, 'inOutCubic');
    await ctx.wait(260);
    await mp.pose({ squash: 0.9, armR: 60, armL: 20, headTilt: 0 }, 140, 'outQuad');
    ctx.sfx('powerUp');
    mp.express('determined', 200);
    await Promise.all([mp.pose({ squash: 1.08, armL: 142, armR: 142, tilt: 0 }, 340, 'outBack'), A.tween(set.bump, { k: 1 }, 340, 'outBack')]);
    var sparkles = ctx.every(520, function () {
      ctx.fx.sparkle(MIRROR_X + A.rand(-40, 40), A.rand(380, 540), { count: 1, power: 0.25, color: '#fff6d8' });
    });
    for (var i = 0; i < 2; i++) {
      await Promise.all([mp.pose({ armL: 124, armR: 124 }, 140, 'inOutSine'), A.tween(set.bump, { k: 1.3 }, 140, 'inOutSine')]);
      await Promise.all([mp.pose({ armL: 142, armR: 142 }, 160, 'outBack'), A.tween(set.bump, { k: 1 }, 160, 'outBack')]);
    }
    // the real pig: …?
    pig.express('surprised', 120);
    pig.boing(0.5);
    await ctx.wait(T.mirrorBeat);
    pig.blink();
    await ctx.wait(220);
    // looks at us
    await pig.lookAtViewer(220);
    await ctx.wait(T.mirrorBeat);
    // back to the mirror: a confident nod and a thumbs-up from the reflection
    await pig.lookAt(MIRROR_X, 450, 240);
    pig.express('calm', 300);
    mp.express('proud', 160);
    A.tween(set.bump, { k: 0.7 }, 300, 'outQuad');
    mp.pose({ armL: 8, squash: 1.03 }, 300, 'outBack');
    mp.thumbsUp('R');
    await mp.pose({ nod: 5 }, 180, 'outQuad');
    await mp.pose({ nod: 0 }, 260, 'outBack');
    ctx.sfx('ding');
    await ctx.wait(T.mirrorBeat * 0.6);

    // the real pig nods. Slowly.
    ctx.camera.to({ x: 150, y: 462, zoom: 1.5 }, 1000, 'inOutSine');
    pig.express('determined', 500);
    for (var n = 0; n < 2; n++) {
      await pig.pose({ nod: 7 }, T.nod, 'inOutSine');
      await pig.pose({ nod: 0 }, T.nod, 'inOutSine');
    }
    var okay = ctx.caption(d.lines[0], { style: 'line', pos: 'upper', stay: true, enter: 'rise' });
    await okay;
    await ctx.wait(T.okayHold);
    // turns to us. She's ready.
    await pig.lookAtViewer(300);
    ctx.sfx('sparkle');
    var h = pig.head();
    ctx.fx.sparkle(h.x, h.y - 20, { count: 8, power: 1.1 });
    pig.pose({ armR: 128, squash: 1.04 }, 320, 'outBack');
    var ready = ctx.caption(d.lines[1], { style: 'line', pos: 'upper', stay: true, enter: 'rise', className: 'tr-ready' });
    await ready;
    await ctx.wait(700);
    await ctx.tap();
    sparkles();
    okay.hide();
    ready.hide();
    pig.pose({ armR: 8, squash: 1 }, 300, 'outBack');
    await ctx.wait(200);
  }

  // empty the court before building the changing room (curtain is covering)
  function teardownCourt(ctx) {
    set.stops.forEach(function (s) {
      s();
    });
    set.stops = [];
    ['bg', 'mid', 'front', 'fx'].forEach(function (k) {
      ctx.layers[k].innerHTML = '';
    });
    Array.prototype.slice.call(ctx.layers.actors.children).forEach(function (n) {
      if (n !== ctx.pig.el) n.remove();
    });
    ctx.letterbox(false);
  }

  P.scenes.register({ id: 'training', order: 30, title: 'Training', transition: 'wipe', setup: setup, play: play });
})();

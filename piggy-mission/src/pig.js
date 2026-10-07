/*
 * The pig: an original SVG character rig.
 *
 *   var pig = PIGGY.Pig.create(parentGroup, { outfit: false })
 *   pig.place(180, 520)
 *   await pig.walkTo(240, 900)
 *   pig.express('determined')
 *   await pig.jump({ height: 30 })
 *
 * Coordinates are world units (the stage is 360 × 640). The pig's origin is
 * the ground point between its feet; at scale 1 it is about 135 units tall.
 *
 * Every animatable value lives in `pig.p` (plain numbers), so scenes can also
 * tween them directly:  PIGGY.anim.tween(pig.p, { armR: 150 }, 300, 'outBack')
 *
 * Pose parameters (degrees unless noted):
 *   x, y            position              scale          size (1 = default)
 *   facing          1 / -1 (mirror)       lift           px above ground (jumps)
 *   rot             whole-body rotation around the feet
 *   squash          1 = normal, <1 squashed, >1 stretched (volume preserving)
 *   tilt            torso lean            headTilt       head rotation
 *   nod             head drop in px       turn           -1..1 face looks left/right
 *   armL, armR      0 = hanging; positive raises the arm outward/up; negative swings inward
 *   legL, legR      leg lift in px        earL, earR     ear flop (positive = droop)
 *   lookX, lookY    -1..1 pupils          eyeL, eyeR     0..1 how open
 *   eyeScale        1 = normal (1.25 = wide surprise)
 *   browAngle       + = cross/determined, - = worried    browY  px (negative = raised)
 *   blush           0..1                  tailWag        0..1
 *   mouthScale      1 = normal
 * Non-numeric state: eyeStyleL/R ('open'|'closed'|'happy'|'x'|'tight'), mouth (see MOUTHS).
 */
(function () {
  'use strict';
  var P = (window.PIGGY = window.PIGGY || {});
  var A = P.anim;
  var svg = A.svg;

  var C = {
    line: '#c25a78',
    skin: '#f7a8bd',
    skinLid: '#f7adc0',
    hoof: '#df7893',
    snout: '#f0849f',
    nostril: '#a8455f',
    innerEar: '#ec8aa4',
    cheek: '#ff7f9f',
    eye: '#ffffff',
    pupil: '#2a1d30',
    mouth: '#7b2840',
    tongue: '#ff8aa0',
    jersey: '#26357a',
    jerseyDark: '#1c2760',
    trim: '#ffcf4d',
    mint: '#5fd3b3',
    shoe: '#ffffff',
  };

  var MOUTHS = {
    smile: { d: 'M-6 -1 Q0 5 6 -1', fill: false },
    bigSmile: { d: 'M-8 -2 Q0 8 8 -2', fill: false },
    grin: { d: 'M-8 -2 Q0 11 8 -2 Q0 2 -8 -2Z', fill: true },
    flat: { d: 'M-5 1 L5 1', fill: false },
    frown: { d: 'M-6 3 Q0 -3 6 3', fill: false },
    wobble: { d: 'M-7 1 q1.75 -2.2 3.5 0 t3.5 0 t3.5 0 t3.5 0', fill: false },
    smirk: { d: 'M-5 1 Q2 4 7 -3', fill: false },
    o: { ellipse: [3.2, 3.8] },
    open: { ellipse: [5.2, 5], tongue: true },
    shout: { ellipse: [7.5, 7.5], tongue: true },
    tiny: { d: 'M-2.5 0.5 Q0 2 2.5 0.5', fill: false },
  };

  // Expression presets. Strings switch immediately; numbers blend.
  var EXPRESSIONS = {
    neutral: { eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 1, eyeR: 1, eyeScale: 1, browAngle: 0, browY: 0, mouth: 'smile', blush: 0.45, earL: 0, earR: 0 },
    sleep: { eyeStyleL: 'closed', eyeStyleR: 'closed', browAngle: -4, browY: 1, mouth: 'tiny', blush: 0.35, earL: 22, earR: 22 },
    oneEye: { eyeStyleL: 'closed', eyeStyleR: 'open', eyeR: 0.45, eyeScale: 1, browAngle: 6, browY: 0, mouth: 'flat', blush: 0.3, earL: 14, earR: 6 },
    surprised: { eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 1, eyeR: 1, eyeScale: 1.22, browAngle: -6, browY: -5, mouth: 'o', blush: 0.4, earL: -10, earR: -10 },
    happy: { eyeStyleL: 'happy', eyeStyleR: 'happy', browAngle: -3, browY: -3, mouth: 'grin', blush: 0.85, earL: -6, earR: -6 },
    joy: { eyeStyleL: 'happy', eyeStyleR: 'happy', browAngle: -5, browY: -5, mouth: 'shout', blush: 1, earL: -14, earR: -14 },
    determined: { eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 0.72, eyeR: 0.72, eyeScale: 1, browAngle: 18, browY: 2, mouth: 'flat', blush: 0.35, earL: -4, earR: -4 },
    serious: { eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 0.62, eyeR: 0.62, eyeScale: 1, browAngle: 10, browY: 2, mouth: 'flat', blush: 0.2, earL: 0, earR: 0 },
    deadpan: { eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 0.5, eyeR: 0.5, eyeScale: 1, browAngle: 0, browY: 1, mouth: 'flat', blush: 0.3, earL: 8, earR: 8 },
    embarrassed: { eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 0.8, eyeR: 0.8, eyeScale: 0.95, browAngle: -12, browY: -1, mouth: 'wobble', blush: 1, earL: 30, earR: 30 },
    tired: { eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 0.45, eyeR: 0.45, eyeScale: 1, browAngle: -14, browY: 0, mouth: 'open', blush: 0.9, earL: 34, earR: 34 },
    proud: { eyeStyleL: 'happy', eyeStyleR: 'happy', browAngle: 4, browY: -2, mouth: 'smirk', blush: 0.6, earL: -8, earR: -8 },
    dizzy: { eyeStyleL: 'x', eyeStyleR: 'x', browAngle: -8, browY: -2, mouth: 'wobble', blush: 0.5, earL: 30, earR: 30 },
    ow: { eyeStyleL: 'tight', eyeStyleR: 'tight', browAngle: 14, browY: 1, mouth: 'frown', blush: 0.7, earL: 18, earR: 18 },
    calm: { eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 0.86, eyeR: 0.86, eyeScale: 1.04, browAngle: -4, browY: -1, mouth: 'smile', blush: 0.55, earL: 6, earR: 6 },
    nervous: { eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 1, eyeR: 1, eyeScale: 1.1, browAngle: -14, browY: -3, mouth: 'wobble', blush: 0.6, earL: 18, earR: 18 },
    focused: { eyeStyleL: 'open', eyeStyleR: 'open', eyeL: 0.8, eyeR: 0.8, eyeScale: 1, browAngle: 12, browY: 1, mouth: 'tiny', blush: 0.4, earL: -6, earR: -6 },
  };

  var DEFAULTS = {
    x: 180, y: 520, scale: 1, facing: 1, lift: 0, rot: 0, squash: 1, tilt: 0, headTilt: 0, nod: 0, turn: 0,
    armL: 8, armR: 8, legL: 0, legR: 0, earL: 0, earR: 0, lookX: 0, lookY: 0, eyeL: 1, eyeR: 1, eyeScale: 1,
    browAngle: 0, browY: 0, blush: 0.45, tailWag: 0.4, mouthScale: 1, opacity: 1,
    eyeStyleL: 'open', eyeStyleR: 'open', mouth: 'smile',
  };

  var uid = 0;

  function ensureDefs(root) {
    if (root.querySelector('#pigSkin')) return;
    var defs = root.querySelector('defs') || svg('defs', null, root);
    defs.insertAdjacentHTML(
      'beforeend',
      '<radialGradient id="pigSkin" cx="0.38" cy="0.32" r="0.78">' +
        '<stop offset="0" stop-color="#ffd6e1"/><stop offset="0.55" stop-color="#f8aabf"/><stop offset="1" stop-color="#ec8fa9"/></radialGradient>' +
        '<radialGradient id="pigSnout" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="#ffaabf"/><stop offset="1" stop-color="#ea7f99"/></radialGradient>' +
        '<linearGradient id="pigJersey" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#31439a"/><stop offset="1" stop-color="#1d2a66"/></linearGradient>' +
        '<radialGradient id="pigShadow"><stop offset="0" stop-color="#000" stop-opacity="0.32"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="pigShades" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2b3a"/><stop offset="1" stop-color="#0b0b12"/></linearGradient>'
    );
  }

  function create(parent, opts) {
    opts = opts || {};
    var root = parent.ownerSVGElement || parent;
    ensureDefs(root);
    var id = 'pig' + ++uid;
    var p = {};
    for (var k in DEFAULTS) p[k] = DEFAULTS[k];
    if (opts.x != null) p.x = opts.x;
    if (opts.y != null) p.y = opts.y;
    if (opts.scale != null) p.scale = opts.scale;

    var S = 'stroke="' + C.line + '" stroke-width="1.7" stroke-linejoin="round"';
    var g = svg('g', { class: 'pig', 'data-pig': id }, parent);
    var shadow = svg('ellipse', { cx: 0, cy: 0, rx: 30, ry: 6, fill: 'url(#pigShadow)' }, g);
    var body = svg('g', { class: 'pig-root' }, g);

    var buff = !!opts.buff;
    body.innerHTML =
      // tail (behind)
      '<g class="pig-tail" transform="translate(27 -32)"><path d="M0 0c6-3 11 1 9 6-2 5-9 3-7-2 2-5 10-5 13 0" fill="none" stroke="' + C.line + '" stroke-width="5.2" stroke-linecap="round"/>' +
      '<path d="M0 0c6-3 11 1 9 6-2 5-9 3-7-2 2-5 10-5 13 0" fill="none" stroke="' + C.skin + '" stroke-width="3" stroke-linecap="round"/></g>' +
      // legs
      leg('L', -13) + leg('R', 13) +
      // torso
      '<g class="pig-torso">' +
      '<ellipse cx="0" cy="-38" rx="' + (buff ? 34 : 31) + '" ry="27" fill="url(#pigSkin)" ' + S + '/>' +
      '<ellipse cx="0" cy="-30" rx="17" ry="12" fill="#ffd0dc" opacity="0.55"/>' +
      // jersey
      '<g class="pig-jersey" style="display:none">' +
      '<path d="M-21 -61Q-11 -53 0 -53Q11 -53 21 -61L27 -53Q' + (buff ? 35 : 32) + ' -40 30 -26Q27 -13 0 -12Q-27 -13 -30 -26Q-' + (buff ? 35 : 32) + ' -40 -27 -53Z" fill="url(#pigJersey)" stroke="' + C.jerseyDark + '" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M-21 -61Q-11 -53 0 -53Q11 -53 21 -61" fill="none" stroke="' + C.trim + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M-29 -27Q0 -19 29 -27" fill="none" stroke="' + C.trim + '" stroke-width="1.6" opacity="0.8"/>' +
      '<rect x="-11" y="-46" width="22" height="16" rx="4" fill="#fff"/>' +
      '<text x="0" y="-34" text-anchor="middle" font-family="Barlow Condensed, Nunito, sans-serif" font-weight="800" font-size="12.5" fill="' + C.jersey + '">CB</text>' +
      '</g>' +
      // arms
      arm('L', -25, buff) + arm('R', 25, buff) +
      // head
      '<g class="pig-head">' +
      ear('L', -19) + ear('R', 19) +
      '<circle cx="0" cy="-86" r="32" fill="url(#pigSkin)" ' + S + '/>' +
      '<ellipse cx="-10" cy="-104" rx="9" ry="5" fill="#ffe3ea" opacity="0.55" transform="rotate(-20 -10 -104)"/>' +
      // headband
      '<g class="pig-headband" style="display:none">' +
      '<path d="M-27 -104Q0 -117 27 -104L29 -97Q0 -110 -29 -97Z" fill="' + C.jersey + '" stroke="' + C.jerseyDark + '" stroke-width="1.2"/>' +
      '<path d="M-27.5 -100.5Q0 -113.5 27.5 -100.5" fill="none" stroke="' + C.trim + '" stroke-width="1.6"/>' +
      '<path d="M27 -103l9 -6 1 8zM27 -100l10 3-4 6z" fill="' + C.jersey + '" stroke="' + C.jerseyDark + '" stroke-width="1"/>' +
      '</g>' +
      // face (shifts sideways with `turn`)
      '<g class="pig-face">' +
      '<ellipse class="pig-cheek" cx="-22" cy="-72" rx="5.5" ry="3.6" fill="' + C.cheek + '"/>' +
      '<ellipse class="pig-cheek" cx="22" cy="-72" rx="5.5" ry="3.6" fill="' + C.cheek + '"/>' +
      eye('L', -12, id) + eye('R', 12, id) +
      '<path class="pig-brow pig-brow-L" d="M-5 0Q0 -2.6 5 0" fill="none" stroke="' + C.pupil + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path class="pig-brow pig-brow-R" d="M-5 0Q0 -2.6 5 0" fill="none" stroke="' + C.pupil + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<g class="pig-snout"><ellipse cx="0" cy="0" rx="13.5" ry="9.5" fill="url(#pigSnout)" ' + S + '/>' +
      '<ellipse cx="-4.6" cy="0.5" rx="2.2" ry="3.1" fill="' + C.nostril + '"/><ellipse cx="4.6" cy="0.5" rx="2.2" ry="3.1" fill="' + C.nostril + '"/>' +
      '<ellipse cx="-4" cy="-5" rx="4" ry="1.6" fill="#ffd0dc" opacity="0.7"/></g>' +
      '<g class="pig-mouth"><path class="pig-mouth-path" fill="none" stroke="' + C.mouth + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<ellipse class="pig-mouth-oval" fill="' + C.mouth + '"/>' +
      '<ellipse class="pig-mouth-tongue" fill="' + C.tongue + '"/></g>' +
      // sunglasses
      '<g class="pig-shades" style="display:none">' +
      '<path d="M-23 -95h18a3 3 0 0 1 3 3v4a7 7 0 0 1-7 7h-9a7 7 0 0 1-7-7v-5a2 2 0 0 1 2-2Z" fill="url(#pigShades)"/>' +
      '<path d="M5 -95h18a2 2 0 0 1 2 2v5a7 7 0 0 1-7 7h-9a7 7 0 0 1-7-7v-4a3 3 0 0 1 3-3Z" fill="url(#pigShades)"/>' +
      '<path d="M-2 -92h4" stroke="#0b0b12" stroke-width="3"/>' +
      '<path d="M-20 -92l6 0-9 9z M8 -92l6 0-9 9z" fill="#fff" opacity="0.28"/>' +
      '<path d="M-25 -93l-6 2 M25 -93l6 2" stroke="#0b0b12" stroke-width="2.4" stroke-linecap="round"/>' +
      '</g>' +
      '</g>' + // face
      '</g>' + // head
      '</g>'; // torso

    function leg(side, x) {
      return (
        '<g class="pig-leg pig-leg-' + side + '" transform="translate(' + x + ' -18)">' +
        '<rect x="-6" y="0" width="12" height="17" rx="6" fill="url(#pigSkin)" ' + S + '/>' +
        '<rect class="pig-hoof" x="-6" y="12" width="12" height="6" rx="3" fill="' + C.hoof + '"/>' +
        '<g class="pig-shoe" style="display:none">' +
        '<path d="M-8 9h12a6 6 0 0 1 6 6v1.5a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2V13a4 4 0 0 1 3-4Z" fill="' + C.shoe + '" stroke="#9aa6c2" stroke-width="1.1"/>' +
        '<path d="M-6 14q5 0 9-3" fill="none" stroke="' + C.mint + '" stroke-width="2" stroke-linecap="round"/>' +
        '<rect x="-9" y="16.5" width="20" height="2" rx="1" fill="#d8deeb"/></g>' +
        '</g>'
      );
    }
    function arm(side, x, big) {
      var w = big ? 15 : 10;
      return (
        '<g class="pig-arm pig-arm-' + side + '" transform="translate(' + x + ' -50)">' +
        '<rect x="' + -w / 2 + '" y="-3" width="' + w + '" height="23" rx="' + w / 2 + '" fill="url(#pigSkin)" ' + S + '/>' +
        '<rect x="' + -w / 2 + '" y="15" width="' + w + '" height="6" rx="3" fill="' + C.hoof + '"/>' +
        '<rect class="pig-wrist" x="' + (-w / 2 - 0.5) + '" y="10" width="' + (w + 1) + '" height="4.4" rx="1.5" fill="' + C.trim + '" style="display:none"/>' +
        (big ? '<path d="M-4 3q4 3 8 0" fill="none" stroke="' + C.line + '" stroke-width="1.2" opacity="0.7"/>' : '') +
        '</g>'
      );
    }
    function ear(side, x) {
      var m = side === 'L' ? 1 : -1;
      var d = 'M' + -10 * m + ' 2C' + -13 * m + ' -8 ' + -11 * m + ' -20 ' + -2 * m + ' -27C' + 3 * m + ' -19 ' + 9 * m + ' -9 ' + 9 * m + ' 2Z';
      var di = 'M' + -6 * m + ' 0C' + -8 * m + ' -7 ' + -7 * m + ' -15 ' + -2 * m + ' -20C' + 1 * m + ' -14 ' + 5 * m + ' -7 ' + 5 * m + ' 0Z';
      return '<g class="pig-ear pig-ear-' + side + '" transform="translate(' + x + ' -108)"><path d="' + d + '" fill="url(#pigSkin)" ' + S + '/><path d="' + di + '" fill="' + C.innerEar + '"/></g>';
    }
    function eye(side, x, pid) {
      var clip = pid + '-eye' + side;
      var tight = side === 'L' ? 'M-6 -4L4 0L-6 4' : 'M6 -4L-4 0L6 4';
      return (
        '<g class="pig-eye pig-eye-' + side + '" transform="translate(' + x + ' -88)">' +
        '<clipPath id="' + clip + '"><ellipse rx="7.4" ry="8.8"/></clipPath>' +
        '<g class="eye-open">' +
        '<ellipse rx="7.4" ry="8.8" fill="' + C.eye + '" stroke="' + C.line + '" stroke-width="1.2"/>' +
        '<g class="eye-pupil"><circle r="4.7" fill="' + C.pupil + '"/><circle cx="1.7" cy="-2" r="1.7" fill="#fff"/><circle cx="-1.6" cy="1.8" r="0.8" fill="#fff" opacity="0.7"/></g>' +
        '<g clip-path="url(#' + clip + ')"><g class="eye-lid"><rect x="-9" y="-28" width="18" height="18" fill="' + C.skinLid + '"/>' +
        '<path d="M-8 -10Q0 -8 8 -10" fill="none" stroke="' + C.line + '" stroke-width="1.6" stroke-linecap="round"/></g></g>' +
        '</g>' +
        '<path class="eye-closed" d="M-6 0Q0 4.5 6 0" fill="none" stroke="' + C.pupil + '" stroke-width="2.3" stroke-linecap="round"/>' +
        '<path class="eye-happy" d="M-6 2Q0 -6 6 2" fill="none" stroke="' + C.pupil + '" stroke-width="2.6" stroke-linecap="round"/>' +
        '<path class="eye-x" d="M-4.5 -4.5L4.5 4.5M4.5 -4.5L-4.5 4.5" fill="none" stroke="' + C.pupil + '" stroke-width="2.4" stroke-linecap="round"/>' +
        '<path class="eye-tight" d="' + tight + '" fill="none" stroke="' + C.pupil + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</g>'
      );
    }

    // element refs
    var q = function (sel) {
      return body.querySelector(sel);
    };
    var el = {
      root: body,
      tail: q('.pig-tail'),
      legL: q('.pig-leg-L'),
      legR: q('.pig-leg-R'),
      torso: q('.pig-torso'),
      armL: q('.pig-arm-L'),
      armR: q('.pig-arm-R'),
      head: q('.pig-head'),
      earL: q('.pig-ear-L'),
      earR: q('.pig-ear-R'),
      face: q('.pig-face'),
      snout: q('.pig-snout'),
      browL: q('.pig-brow-L'),
      browR: q('.pig-brow-R'),
      eyeL: q('.pig-eye-L'),
      eyeR: q('.pig-eye-R'),
      mouth: q('.pig-mouth'),
      mouthPath: q('.pig-mouth-path'),
      mouthOval: q('.pig-mouth-oval'),
      mouthTongue: q('.pig-mouth-tongue'),
      cheeks: body.querySelectorAll('.pig-cheek'),
      jersey: q('.pig-jersey'),
      headband: q('.pig-headband'),
      shades: q('.pig-shades'),
      shoes: body.querySelectorAll('.pig-shoe'),
      hooves: body.querySelectorAll('.pig-leg .pig-hoof'),
      wrists: body.querySelectorAll('.pig-wrist'),
    };
    function eyeParts(e) {
      return {
        open: e.querySelector('.eye-open'),
        pupil: e.querySelector('.eye-pupil'),
        lid: e.querySelector('.eye-lid'),
        closed: e.querySelector('.eye-closed'),
        happy: e.querySelector('.eye-happy'),
        x: e.querySelector('.eye-x'),
        tight: e.querySelector('.eye-tight'),
      };
    }
    var eyes = { L: eyeParts(el.eyeL), R: eyeParts(el.eyeR) };

    /* ---------- procedural state ---------- */
    var proc = {
      mode: 'idle', // idle | walk | run | sleep | none
      phase: 0,
      cycleSpeed: 1,
      blinkT: A.rand(1.5, 3.5),
      blinkK: 1,
      t: 0,
      tailT: 0,
    };
    var last = {}; // last rendered string per element, to avoid DOM churn

    function setT(node, key, value) {
      if (last[key] !== value) {
        last[key] = value;
        node.setAttribute('transform', value);
      }
    }
    function f(n) {
      return Math.round(n * 100) / 100;
    }

    var currentMouth = null;
    function renderMouth() {
      if (p.mouth === currentMouth) return;
      currentMouth = p.mouth;
      var m = MOUTHS[p.mouth] || MOUTHS.smile;
      if (m.ellipse) {
        el.mouthPath.style.display = 'none';
        el.mouthOval.style.display = '';
        el.mouthOval.setAttribute('rx', m.ellipse[0]);
        el.mouthOval.setAttribute('ry', m.ellipse[1]);
        el.mouthOval.setAttribute('cy', 1);
        if (m.tongue) {
          el.mouthTongue.style.display = '';
          el.mouthTongue.setAttribute('rx', m.ellipse[0] * 0.62);
          el.mouthTongue.setAttribute('ry', m.ellipse[1] * 0.42);
          el.mouthTongue.setAttribute('cy', 1 + m.ellipse[1] * 0.5);
        } else el.mouthTongue.style.display = 'none';
      } else {
        el.mouthOval.style.display = 'none';
        el.mouthTongue.style.display = 'none';
        el.mouthPath.style.display = '';
        el.mouthPath.setAttribute('d', m.d);
        el.mouthPath.setAttribute('fill', m.fill ? C.mouth : 'none');
      }
    }

    var eyeStyleCache = { L: null, R: null };
    function renderEye(side) {
      var e = eyes[side];
      var style = side === 'L' ? p.eyeStyleL : p.eyeStyleR;
      if (eyeStyleCache[side] !== style) {
        eyeStyleCache[side] = style;
        e.open.style.display = style === 'open' ? '' : 'none';
        e.closed.style.display = style === 'closed' ? '' : 'none';
        e.happy.style.display = style === 'happy' ? '' : 'none';
        e.x.style.display = style === 'x' ? '' : 'none';
        e.tight.style.display = style === 'tight' ? '' : 'none';
      }
      if (style === 'open') {
        var open = A.clamp((side === 'L' ? p.eyeL : p.eyeR) * proc.blinkK, 0, 1);
        // lid slides down from above: fully open → lid hidden above the eye
        setT(e.lid, 'lid' + side, 'translate(0 ' + f(18 * (1 - open)) + ')');
        setT(e.pupil, 'pupil' + side, 'translate(' + f(p.lookX * 2.6) + ' ' + f(p.lookY * 3) + ')');
      }
      var sx = (side === 'L' ? -12 : 12) + p.turn * 6;
      setT(el['eye' + side], 'eye' + side, 'translate(' + f(sx) + ' -88) scale(' + f(p.eyeScale) + ')');
    }

    function render() {
      var walk = proc.mode === 'walk' || proc.mode === 'run';
      var run = proc.mode === 'run';
      var ph = proc.phase;
      var sleeping = proc.mode === 'sleep';

      // procedural offsets
      var breathe = sleeping ? Math.sin(proc.t * 1.6) : Math.sin(proc.t * 2.4);
      var bob = walk ? Math.abs(Math.sin(ph)) * (run ? 6 : 3.5) : 0;
      var legLiftL = walk ? Math.max(0, Math.sin(ph)) * (run ? 9 : 5) : 0;
      var legLiftR = walk ? Math.max(0, -Math.sin(ph)) * (run ? 9 : 5) : 0;
      var armSwing = walk ? Math.sin(ph) * (run ? 38 : 16) : 0;
      var earFlap = run ? Math.sin(ph * 2) * 22 : walk ? Math.sin(ph * 2) * 6 : 0;
      var tiltWalk = walk ? Math.sin(ph) * (run ? 2 : 3) + (run ? 8 : 0) : 0;
      var breatheScale = 1 + breathe * (sleeping ? 0.03 : 0.012);

      // root
      var sq = p.squash;
      var sxk = 1 / Math.sqrt(sq);
      var lift = p.lift + bob;
      g.setAttribute('opacity', p.opacity);
      setT(
        body,
        'root',
        'translate(' + f(p.x) + ' ' + f(p.y - lift) + ') rotate(' + f(p.rot) + ') scale(' + f(p.scale * p.facing * sxk) + ' ' + f(p.scale * sq) + ')'
      );
      // shadow stays on the ground, shrinks as the pig rises
      var sh = A.clamp(1 - lift / 120, 0.35, 1);
      setT(shadow, 'shadow', 'translate(' + f(p.x) + ' ' + f(p.y) + ') scale(' + f(p.scale * sh * sxk) + ' ' + f(p.scale * sh) + ')');

      setT(el.torso, 'torso', 'rotate(' + f(p.tilt + tiltWalk) + ' 0 -20) translate(0 ' + f(-(breatheScale - 1) * 30) + ') scale(1 ' + f(breatheScale) + ')');
      setT(el.head, 'head', 'rotate(' + f(p.headTilt) + ' 0 -58) translate(' + f(p.turn * 2) + ' ' + f(p.nod + (sleeping ? breathe * 0.8 : 0)) + ')');
      setT(el.face, 'face', 'translate(' + f(p.turn * 5) + ' 0)');
      setT(el.snout, 'snout', 'translate(' + f(p.turn * 3) + ' -73)');
      setT(el.mouth, 'mouth', 'translate(' + f(p.turn * 3) + ' -60) scale(' + f(p.mouthScale) + ')');

      // ears: base splay + flop param + flap
      setT(el.earL, 'earL', 'translate(' + f(-19 + p.turn * 2) + ' -108) rotate(' + f(-(16 + p.earL) - earFlap) + ')');
      setT(el.earR, 'earR', 'translate(' + f(19 + p.turn * 2) + ' -108) rotate(' + f(16 + p.earR + earFlap) + ')');

      // brows
      var by = -101 + p.browY;
      setT(el.browL, 'browL', 'translate(' + f(-12 + p.turn * 6) + ' ' + f(by) + ') rotate(' + f(p.browAngle) + ')');
      setT(el.browR, 'browR', 'translate(' + f(12 + p.turn * 6) + ' ' + f(by) + ') rotate(' + f(-p.browAngle) + ')');

      // arms (left raises with positive rotation, right with negative)
      setT(el.armL, 'armL', 'translate(-25 -50) rotate(' + f(p.armL + armSwing) + ')');
      setT(el.armR, 'armR', 'translate(25 -50) rotate(' + f(-(p.armR - armSwing)) + ')');

      // legs
      setT(el.legL, 'legL', 'translate(-13 ' + f(-18 - p.legL - legLiftL) + ')');
      setT(el.legR, 'legR', 'translate(13 ' + f(-18 - p.legR - legLiftR) + ')');

      // tail
      var wag = Math.sin(proc.tailT * 9) * 14 * p.tailWag;
      setT(el.tail, 'tail', 'translate(27 -32) rotate(' + f(wag) + ')');

      // cheeks
      var bl = f(A.clamp(p.blush, 0, 1) * 0.75);
      if (last.blush !== bl) {
        last.blush = bl;
        el.cheeks.forEach(function (c) {
          c.setAttribute('opacity', bl);
        });
      }

      renderEye('L');
      renderEye('R');
      renderMouth();
    }

    var stopLoop = A.onFrame(function (dt) {
      proc.t += dt;
      proc.tailT += dt * (0.5 + p.tailWag);
      if (proc.mode === 'walk' || proc.mode === 'run') proc.phase += dt * (proc.mode === 'run' ? 16 : 9) * proc.cycleSpeed;
      // automatic blinking
      proc.blinkT -= dt;
      if (proc.blinkT <= 0 && proc.mode !== 'sleep') {
        proc.blinkT = A.rand(2.2, 4.8);
        proc.blink = 0.16;
      }
      if (proc.blink > 0) {
        proc.blink -= dt;
        var b = proc.blink / 0.16; // 1 → 0
        proc.blinkK = Math.abs(b - 0.5) * 2; // open → closed → open
        if (proc.blink <= 0) proc.blinkK = 1;
      }
      render();
    });

    /* ---------- API ---------- */
    var pig = {
      id: id,
      el: g,
      parts: el,
      p: p,
      place: function (x, y, o) {
        o = o || {};
        A.set(p, { x: x, y: y });
        if (o.scale != null) A.set(p, { scale: o.scale });
        if (o.facing != null) A.set(p, { facing: o.facing });
        render();
        return pig;
      },
      // Tween any pose params. Returns a promise.
      pose: function (params, ms, ease) {
        var nums = {};
        var any = false;
        for (var k in params) {
          if (typeof params[k] === 'string') p[k] = params[k];
          else {
            nums[k] = params[k];
            any = true;
          }
        }
        if (!any) return Promise.resolve();
        if (!ms) {
          A.set(p, nums);
          return Promise.resolve();
        }
        return A.tween(p, nums, ms, ease || 'inOutCubic');
      },
      express: function (name, ms) {
        var e = EXPRESSIONS[name];
        if (!e) return Promise.resolve();
        return pig.pose(e, ms == null ? 180 : ms, 'outCubic');
      },
      setMode: function (mode, speed) {
        proc.mode = mode;
        proc.cycleSpeed = speed || 1;
        if (mode !== 'walk' && mode !== 'run') proc.phase = 0;
      },
      mode: function () {
        return proc.mode;
      },
      blink: function () {
        proc.blink = 0.16;
      },
      wear: function (items, on) {
        if (typeof items === 'string') items = [items];
        items.forEach(function (it) {
          var show = on === false ? 'none' : '';
          if (it === 'jersey') el.jersey.style.display = show;
          if (it === 'headband') el.headband.style.display = show;
          if (it === 'shades' || it === 'sunglasses') el.shades.style.display = show;
          if (it === 'shoes' || it === 'trainers') {
            el.shoes.forEach(function (s) {
              s.style.display = show;
            });
            el.hooves.forEach(function (h) {
              h.style.display = on === false ? '' : 'none';
            });
          }
          if (it === 'wristbands') {
            el.wrists.forEach(function (w) {
              w.style.display = show;
            });
          }
        });
        return pig;
      },
      outfit: function (on) {
        return pig.wear(['jersey', 'headband', 'shoes', 'wristbands'], on);
      },
      isWearing: function (item) {
        var node = { jersey: el.jersey, headband: el.headband, shades: el.shades, sunglasses: el.shades }[item];
        return !!node && node.style.display !== 'none';
      },

      /* --- movement --- */
      moveTo: function (x, y, ms, ease) {
        var to = { x: x };
        if (y != null) to.y = y;
        return A.tween(p, to, ms, ease || 'inOutCubic');
      },
      walkTo: function (x, ms, o) {
        o = o || {};
        var style = o.run ? 'run' : 'walk';
        if (x !== p.x) p.facing = Math.sign(x - p.x) * Math.abs(p.facing || 1) || p.facing;
        if (o.keepFacing) p.facing = o.keepFacing;
        pig.setMode(style, o.cycle || 1);
        var t = A.tween(p, o.y != null ? { x: x, y: o.y } : { x: x }, ms, o.ease || 'linear');
        return t.then(function () {
          if (proc.mode === style) pig.setMode('idle');
        });
      },
      // anticipation → stretch up → land squash → settle
      jump: function (o) {
        o = o || {};
        var h = o.height == null ? 40 : o.height;
        var up = o.ms || 320;
        return A.tween(p, { squash: 0.78, armL: 30, armR: 30 }, 120, 'outQuad')
          .then(function () {
            pig.pose({ earL: -18, earR: -18 }, 140);
            return Promise.all([A.tween(p, { lift: h }, up, 'outQuad'), A.tween(p, { squash: 1.14, armL: o.armsUp ? 160 : 110, armR: o.armsUp ? 160 : 110 }, up * 0.5, 'outQuad')]);
          })
          .then(function () {
            A.tween(p, { squash: 1 }, up * 0.6, 'inOutSine');
            return A.tween(p, { lift: 0 }, up * 0.85, 'inQuad');
          })
          .then(function () {
            pig.pose({ earL: 10, earR: 10 }, 90);
            return A.tween(p, { squash: 0.8, armL: 20, armR: 20 }, 90, 'outQuad');
          })
          .then(function () {
            pig.pose({ earL: 0, earR: 0 }, 260, 'outBack');
            return A.tween(p, { squash: 1 }, 320, 'outBack');
          });
      },
      hop: function (h) {
        return pig.jump({ height: h || 14, ms: 180 });
      },
      // quick squash-and-stretch reaction (taps, impacts)
      boing: function (k) {
        k = k || 1;
        return A.tween(p, { squash: 1 - 0.22 * k }, 80, 'outQuad').then(function () {
          return A.tween(p, { squash: 1 }, 420, 'outElastic');
        });
      },
      wiggle: function (ms) {
        ms = ms || 900;
        var t0 = A.clock();
        var base = p.tilt;
        var stop = A.onFrame(function (dt, clock) {
          var e = (clock - t0) * 1000;
          if (e >= ms) {
            p.tilt = base;
            return false;
          }
          p.tilt = base + Math.sin(e / 45) * 9 * (1 - e / ms);
        });
        return A.wait(ms).then(stop, stop);
      },
      celebrate: function (ms) {
        ms = ms || 1400;
        pig.express('joy', 120);
        p.tailWag = 1;
        var end = A.clock() + ms / 1000;
        var t0 = A.clock();
        A.onFrame(function (dt, clock) {
          if (clock >= end) {
            p.armL = 120;
            p.armR = 120;
            return false;
          }
          var e = clock - t0;
          p.armL = 140 + Math.sin(e * 18) * 25;
          p.armR = 140 - Math.sin(e * 18) * 25;
          p.tilt = Math.sin(e * 14) * 7;
        });
        var hops = [];
        var n = Math.max(1, Math.round(ms / 520));
        var chain = Promise.resolve();
        for (var i = 0; i < n; i++) {
          chain = chain.then(function () {
            return pig.jump({ height: 22, ms: 200, armsUp: true });
          });
        }
        hops.push(chain);
        return Promise.all(hops).then(function () {
          p.tilt = 0;
          return pig.pose({ armL: 8, armR: 8 }, 260, 'outBack');
        });
      },
      // faceplant forward (trip) or flop backward (fall)
      fall: function (o) {
        o = o || {};
        var back = o.backward;
        var dir = back ? -1 : 1;
        pig.setMode('idle');
        return A.tween(p, { rot: dir * -12, armL: 120, armR: 120, squash: 1.05 }, 120, 'outQuad')
          .then(function () {
            pig.express(back ? 'surprised' : 'dizzy', 60);
            return Promise.all([A.tween(p, { rot: dir * 88 * p.facing }, 300, 'inQuad'), A.tween(p, { lift: 6 }, 150, 'outQuad').then(function () {
              return A.tween(p, { lift: -8 }, 150, 'inQuad');
            })]);
          })
          .then(function () {
            return A.tween(p, { squash: 0.88 }, 90, 'outQuad');
          })
          .then(function () {
            return A.tween(p, { squash: 1, armL: 60, armR: 60 }, 300, 'outBack');
          });
      },
      getUp: function (ms) {
        ms = ms || 520;
        return Promise.all([A.tween(p, { rot: 0, lift: 0, armL: 8, armR: 8 }, ms, 'outBack'), pig.express('neutral', ms)]);
      },
      sit: function (ms) {
        ms = ms || 420;
        return A.tween(p, { lift: -10, squash: 0.86, legL: 6, legR: 6, nod: 3 }, ms, 'outCubic');
      },
      stand: function (ms) {
        ms = ms || 420;
        return A.tween(p, { lift: 0, squash: 1, legL: 0, legR: 0, nod: 0 }, ms, 'outBack');
      },
      // the hilariously bad salute: overshoots and bonks its own snout
      badSalute: function (onBonk) {
        return A.tween(p, { armR: -150, headTilt: -4 }, 160, 'outQuad')
          .then(function () {
            if (onBonk) onBonk();
            pig.express('ow', 40);
            return Promise.all([A.tween(p, { headTilt: 12, nod: 3, squash: 0.9 }, 90, 'outQuad'), A.tween(p, { armR: -118 }, 90, 'outQuad')]);
          })
          .then(function () {
            return A.tween(p, { headTilt: 0, nod: 0, squash: 1 }, 380, 'outElastic');
          })
          .then(function () {
            pig.express('determined', 160);
            // wobbly hold
            var t0 = A.clock();
            var stop = A.onFrame(function (dt, clock) {
              var e = clock - t0;
              if (e > 0.9) return false;
              p.armR = -128 + Math.sin(e * 30) * 6;
              p.tilt = Math.sin(e * 12) * 2;
            });
            return A.wait(900).then(stop, stop);
          })
          .then(function () {
            p.tilt = 0;
            return pig.pose({ armR: 8 }, 260, 'outBack');
          });
      },
      thumbsUp: function (side) {
        side = side || 'R';
        var o = {};
        o['arm' + side] = 150;
        return pig.pose(o, 300, 'outBack');
      },
      point: function (side, angle) {
        var o = {};
        o['arm' + (side || 'R')] = angle == null ? 95 : angle;
        return pig.pose(o, 260, 'outBack');
      },
      // world-space position of a hoof tip (for holding props)
      hand: function (side) {
        return pig.pointOn(el['arm' + (side || 'R')], 0, 20);
      },
      head: function () {
        return pig.pointOn(el.head, 0, -86);
      },
      // map a point in a part's local coordinates to the coordinates of the pig's parent layer
      pointOn: function (node, x, y) {
        var parentCTM = g.parentNode.getCTM();
        var m = node.getCTM();
        if (!m || !parentCTM) return { x: p.x, y: p.y - 90 * p.scale };
        var pt = (node.ownerSVGElement || root).createSVGPoint();
        pt.x = x;
        pt.y = y;
        var screen = pt.matrixTransform(m);
        return screen.matrixTransform(parentCTM.inverse());
      },
      // screen (client) rectangle of the head, for placing speech bubbles
      headRect: function () {
        return el.head.querySelector('circle').getBoundingClientRect();
      },
      lookAt: function (x, y, ms) {
        var dx = A.clamp((x - p.x) / 120, -1, 1) * (p.facing < 0 ? -1 : 1);
        var dy = A.clamp((y - (p.y - 88 * p.scale)) / 160, -1, 1);
        return pig.pose({ lookX: dx, lookY: dy, turn: dx * 0.5 }, ms == null ? 160 : ms, 'outCubic');
      },
      lookAtViewer: function (ms) {
        return pig.pose({ lookX: 0, lookY: 0, turn: 0, headTilt: 0 }, ms == null ? 160 : ms, 'outCubic');
      },
      reset: function () {
        var keep = { x: p.x, y: p.y, scale: p.scale, facing: p.facing };
        A.set(p, Object.assign({}, DEFAULTS, keep));
        pig.setMode('idle');
        render();
        return pig;
      },
      destroy: function () {
        stopLoop();
        g.remove();
      },
      render: render,
    };
    pig.express('neutral', 0);
    render();
    return pig;
  }

  P.Pig = {
    create: create,
    EXPRESSIONS: EXPRESSIONS,
    MOUTHS: MOUTHS,
    COLORS: C,
  };
})();

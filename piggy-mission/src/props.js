/*
 * Reusable props, drawn in SVG world units (stage = 360 × 640).
 *
 *   var ball = PIGGY.props.ball(layer, { x: 100, y: 500 })
 *   await ball.roll(200, 900)          // rolls along the ground, spinning
 *   await ball.arc(260, 300, 500, 90)  // thrown in an arc (x, y, ms, peak height)
 *
 *   var post = PIGGY.props.post(midLayer, frontLayer, { x: 290, ground: 520 })
 *   post.ring   → {x, y} world centre of the ring;  post.swish()
 *
 *   var cup = PIGGY.props.trophy(layer, { x: 180, y: 500, scale: 1.4 })
 *   var crowd = PIGGY.props.crowd(layer, { y: 330 });  crowd.cheer(true)
 */
(function () {
  'use strict';
  var P = (window.PIGGY = window.PIGGY || {});
  var A = P.anim;
  var svg = A.svg;

  function ensureDefs(root) {
    if (root.querySelector('#propGold')) return;
    var defs = root.querySelector('defs') || svg('defs', null, root);
    defs.insertAdjacentHTML(
      'beforeend',
      '<linearGradient id="propGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset="0.45" stop-color="#ffcc3d"/><stop offset="1" stop-color="#d98e12"/></linearGradient>' +
        '<linearGradient id="propGoldDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3a21c"/><stop offset="1" stop-color="#a86a06"/></linearGradient>' +
        '<radialGradient id="propBall" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffffff"/><stop offset="0.7" stop-color="#f4f1e8"/><stop offset="1" stop-color="#d9d3c3"/></radialGradient>' +
        '<linearGradient id="propPole" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b9c2d4"/><stop offset="0.5" stop-color="#eef2f8"/><stop offset="1" stop-color="#9aa4b8"/></linearGradient>' +
        '<radialGradient id="propShadow"><stop offset="0" stop-color="#000" stop-opacity="0.3"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'
    );
  }
  function rootOf(layer) {
    return layer.ownerSVGElement || layer;
  }
  function f(n) {
    return Math.round(n * 100) / 100;
  }

  /* ---------- netball ---------- */
  function ball(layer, o) {
    o = o || {};
    ensureDefs(rootOf(layer));
    var r = o.r || 11;
    var p = { x: o.x || 0, y: o.y || 0, z: 0, rot: 0, scale: 1, opacity: 1, ground: o.ground == null ? null : o.ground };
    var g = svg('g', { class: 'prop-ball' }, layer);
    var shadow = svg('ellipse', { rx: r * 1.1, ry: r * 0.32, fill: 'url(#propShadow)' }, g);
    var b = svg('g', null, g);
    b.innerHTML =
      '<circle r="' + r + '" fill="url(#propBall)" stroke="#8d97ab" stroke-width="1.2"/>' +
      '<path d="M' + -r + ' 0Q0 ' + -r * 0.55 + ' ' + r + ' 0" fill="none" stroke="#f2b33d" stroke-width="2"/>' +
      '<path d="M' + -r * 0.75 + ' ' + r * 0.65 + 'Q0 ' + r * 0.1 + ' ' + r * 0.75 + ' ' + r * 0.65 + '" fill="none" stroke="#4f8be0" stroke-width="1.8"/>' +
      '<path d="M0 ' + -r + 'Q' + r * 0.5 + ' 0 0 ' + r + '" fill="none" stroke="#8d97ab" stroke-width="1.1"/>';
    var lastT = '';
    var stop = A.onFrame(function () {
      if (!g.isConnected) return false; // removed by a scene clear: stop ticking
      // z = height above the ball's ground line (for shadows); y is the ball centre on screen
      var t = 'translate(' + f(p.x) + ' ' + f(p.y) + ') rotate(' + f(p.rot) + ') scale(' + f(p.scale) + ')';
      if (t !== lastT) {
        lastT = t;
        b.setAttribute('transform', t);
      }
      var gy = p.ground == null ? p.y + r : p.ground;
      var h = Math.max(0, gy - (p.y + r));
      var k = A.clamp(1 - h / 160, 0.3, 1);
      shadow.setAttribute('transform', 'translate(' + f(p.x) + ' ' + f(gy) + ') scale(' + f(k * p.scale) + ')');
      shadow.style.display = p.ground == null && !o.shadow ? 'none' : '';
      g.setAttribute('opacity', p.opacity);
    });
    var api = {
      el: g,
      p: p,
      r: r,
      place: function (x, y) {
        A.set(p, { x: x, y: y });
        return api;
      },
      // roll along the ground; spin matches distance travelled
      roll: function (x, ms, ease) {
        var dist = x - p.x;
        return Promise.all([A.tween(p, { x: x }, ms, ease || 'outQuad'), A.tween(p, { rot: p.rot + (dist / (2 * Math.PI * r)) * 360 }, ms, ease || 'outQuad')]);
      },
      // throw in a parabola to (x, y) with an extra peak height
      arc: function (x, y, ms, peak, o2) {
        o2 = o2 || {};
        var x0 = p.x;
        var y0 = p.y;
        var t = { k: 0 };
        var spin = o2.spin == null ? 540 : o2.spin;
        var r0 = p.rot;
        var s0 = p.scale;
        var s1 = o2.scale == null ? s0 : o2.scale;
        var stopF = A.onFrame(function () {
          var k = t.k;
          p.x = x0 + (x - x0) * k;
          p.y = y0 + (y - y0) * k - 4 * (peak || 0) * k * (1 - k);
          p.rot = r0 + spin * k;
          p.scale = s0 + (s1 - s0) * k;
        });
        return A.tween(t, { k: 1 }, ms, o2.ease || 'linear').then(
          function () {
            stopF();
          },
          function (e) {
            stopF();
            throw e;
          }
        );
      },
      // drop and bounce on its ground line
      bounce: function (groundY, ms) {
        var startY = p.y;
        var land = groundY - r;
        return A.tween(p, { y: land }, ms * 0.45, 'inQuad')
          .then(function () {
            if (P.audio) P.audio.bounce(0.18);
            return A.tween(p, { y: land - (land - startY) * 0.35 }, ms * 0.25, 'outQuad');
          })
          .then(function () {
            return A.tween(p, { y: land }, ms * 0.3, 'inQuad');
          });
      },
      destroy: function () {
        stop();
        g.remove();
      },
    };
    return api;
  }

  /* ---------- netball goal post (no backboard, ring + net) ---------- */
  // Draws the pole + back of the ring in `backLayer`, net + front of ring in `frontLayer`,
  // so a ball drawn between the two layers passes "through" the ring.
  function post(backLayer, frontLayer, o) {
    o = o || {};
    ensureDefs(rootOf(backLayer));
    var x = o.x == null ? 290 : o.x;
    var ground = o.ground == null ? 520 : o.ground;
    var h = o.height || 230;
    var s = o.scale || 1;
    var ringX = x - 20 * s;
    var ringY = ground - h * s;
    var rx = 17 * s;
    var ry = 5 * s;
    var back = svg('g', { class: 'prop-post' }, backLayer);
    back.innerHTML =
      '<ellipse cx="' + x + '" cy="' + ground + '" rx="' + 22 * s + '" ry="' + 5 * s + '" fill="url(#propShadow)"/>' +
      '<rect x="' + (x - 3.5 * s) + '" y="' + (ringY - 4 * s) + '" width="' + 7 * s + '" height="' + (h * s + 4 * s) + '" rx="' + 3 * s + '" fill="url(#propPole)"/>' +
      '<rect x="' + (x - 9 * s) + '" y="' + (ground - 6 * s) + '" width="' + 18 * s + '" height="' + 7 * s + '" rx="' + 3 * s + '" fill="#7d879b"/>' +
      '<path d="M' + x + ' ' + (ringY - 1 * s) + 'H' + (ringX + rx) + '" stroke="#9aa4b8" stroke-width="' + 3 * s + '" stroke-linecap="round"/>' +
      '<path d="M' + (ringX - rx) + ' ' + ringY + 'A' + rx + ' ' + ry + ' 0 0 1 ' + (ringX + rx) + ' ' + ringY + '" fill="none" stroke="#c9542f" stroke-width="' + 2.6 * s + '"/>';
    var front = svg('g', { class: 'prop-net' }, frontLayer);
    var net = svg('g', null, front);
    var netDepth = 26 * s;
    function drawNet(sway, stretch) {
      var lines = '';
      var n = 7;
      for (var i = 0; i <= n; i++) {
        var a = Math.PI * (i / n);
        var tx = ringX + Math.cos(a) * rx;
        var ty = ringY + Math.sin(a) * ry;
        var bx = ringX + Math.cos(a) * rx * 0.55 + Math.sin(i + sway * 9) * sway * 3 * s;
        var by = ringY + netDepth * stretch + Math.sin(a) * ry * 0.5;
        lines += 'M' + f(tx) + ' ' + f(ty) + 'L' + f(bx) + ' ' + f(by);
      }
      for (var j = 1; j <= 2; j++) {
        var k = j / 3;
        var cy = ringY + netDepth * stretch * k;
        var crx = rx - rx * 0.45 * k;
        lines += 'M' + f(ringX - crx) + ' ' + f(cy) + 'A' + f(crx) + ' ' + f(ry * (1 - k * 0.4)) + ' 0 0 0 ' + f(ringX + crx) + ' ' + f(cy);
      }
      net.innerHTML =
        '<path d="' + lines + '" fill="none" stroke="#ffffff" stroke-width="' + 1.2 * s + '" opacity="0.9"/>' +
        '<path d="M' + (ringX - rx) + ' ' + ringY + 'A' + rx + ' ' + ry + ' 0 0 0 ' + (ringX + rx) + ' ' + ringY + '" fill="none" stroke="#e8673c" stroke-width="' + 2.8 * s + '"/>';
    }
    drawNet(0, 1);
    var api = {
      back: back,
      front: front,
      ring: { x: ringX, y: ringY, rx: rx },
      swish: function () {
        var st = { k: 1 };
        var stopF = A.onFrame(function () {
          drawNet(st.k, 1 + st.k * 0.35);
        });
        return A.tween(st, { k: 0 }, 700, 'outElastic').then(
          function () {
            stopF();
            drawNet(0, 1);
          },
          function (e) {
            stopF();
            throw e;
          }
        );
      },
      destroy: function () {
        back.remove();
        front.remove();
      },
    };
    return api;
  }

  /* ---------- trophy ---------- */
  function trophy(layer, o) {
    o = o || {};
    ensureDefs(rootOf(layer));
    var p = { x: o.x || 180, y: o.y || 500, scale: o.scale || 1, rot: 0, opacity: 1 };
    var g = svg('g', { class: 'prop-trophy' }, layer);
    // origin at the bottom centre of the base; ~110 units tall at scale 1
    g.innerHTML =
      '<ellipse cx="0" cy="0" rx="34" ry="6" fill="url(#propShadow)"/>' +
      '<rect x="-30" y="-14" width="60" height="14" rx="3" fill="#5a3a24"/>' +
      '<rect x="-24" y="-24" width="48" height="11" rx="2" fill="#7a5233"/>' +
      '<rect x="-14" y="-23" width="28" height="7" rx="1" fill="url(#propGold)"/>' +
      '<path d="M-8 -24h16l-3-16h-10Z" fill="url(#propGoldDark)"/>' +
      '<path d="M-30 -104h60v10c0 26-13 44-30 46-17-2-30-20-30-46Z" fill="url(#propGold)" stroke="#b9780c" stroke-width="1.5"/>' +
      '<path d="M-30 -96c-20-2-24 22-4 32" fill="none" stroke="url(#propGoldDark)" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M30 -96c20-2 24 22 4 32" fill="none" stroke="url(#propGoldDark)" stroke-width="6" stroke-linecap="round"/>' +
      '<ellipse cx="0" cy="-104" rx="30" ry="5" fill="#ffe27a" stroke="#b9780c" stroke-width="1.2"/>' +
      '<path d="M0 -92l3.7 7.5 8.3 1.2-6 5.8 1.4 8.2L0 -73.2l-7.4 3.9 1.4-8.2-6-5.8 8.3-1.2Z" fill="#fff6c9"/>' +
      '<path d="M-20 -98c0 18 5 30 11 37" fill="none" stroke="#fff6c9" stroke-width="3" stroke-linecap="round" opacity="0.65"/>' +
      '<text x="0" y="-15" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="7" fill="#3a2414">1ST</text>';
    var stop = A.onFrame(function () {
      if (!g.isConnected) return false; // removed by a scene clear: stop ticking
      g.setAttribute('transform', 'translate(' + f(p.x) + ' ' + f(p.y) + ') rotate(' + f(p.rot) + ') scale(' + f(p.scale) + ')');
      g.setAttribute('opacity', p.opacity);
    });
    return {
      el: g,
      p: p,
      // world position of the cup's rim centre
      top: function () {
        return { x: p.x, y: p.y - 104 * p.scale };
      },
      destroy: function () {
        stop();
        g.remove();
      },
    };
  }

  /* ---------- training cone ---------- */
  function cone(layer, x, y, s) {
    s = s || 1;
    var g = svg('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + s + ')' }, layer);
    g.innerHTML =
      '<ellipse cx="0" cy="0" rx="12" ry="3" fill="url(#propShadow)"/>' +
      '<rect x="-11" y="-3" width="22" height="4" rx="1.5" fill="#e0602c"/>' +
      '<path d="M-7 -3L-2 -22h4L7 -3Z" fill="#ff8a3d"/>' +
      '<path d="M-5.2 -10h10.4l-1-4h-8.4Z" fill="#fff"/>';
    return g;
  }

  /* ---------- crowd (rows of bobbing heads) ---------- */
  function crowd(layer, o) {
    o = o || {};
    var y = o.y || 330;
    var rows = o.rows || 3;
    var x0 = o.x0 == null ? -120 : o.x0;
    var x1 = o.x1 == null ? 480 : o.x1;
    var colors = o.colors || ['#ff8fab', '#7fb7ff', '#ffd75e', '#7ae0c3', '#c9a7ff', '#ffb35c', '#f4f1e8'];
    var g = svg('g', { class: 'prop-crowd' }, layer);
    var people = [];
    for (var r = 0; r < rows; r++) {
      var rowY = y + r * 22;
      var shade = 0.55 + r * 0.18;
      for (var x = x0 + (r % 2) * 9; x < x1; x += 18) {
        var c = colors[(people.length * 7 + r * 3) % colors.length];
        var pg = svg('g', null, g);
        pg.innerHTML =
          '<rect x="-8" y="0" width="16" height="22" rx="7" fill="' + c + '" opacity="' + shade + '"/>' +
          '<circle cx="0" cy="-5" r="7" fill="#2a2440" opacity="' + (0.25 + r * 0.25) + '"/>';
        people.push({ el: pg, x: x, y: rowY, ph: Math.random() * 6.28, arm: Math.random() < 0.4 });
      }
    }
    var level = { k: o.excited ? 1 : 0.15 };
    var stop = A.onFrame(function (dt, clock) {
      if (!g.isConnected) return false; // removed by a scene clear: stop ticking
      for (var i = 0; i < people.length; i++) {
        var pp = people[i];
        var hop = Math.max(0, Math.sin(clock * (5 + level.k * 5) + pp.ph)) * (1.5 + level.k * 7);
        pp.el.setAttribute('transform', 'translate(' + pp.x + ' ' + f(pp.y - hop) + ')');
      }
    });
    return {
      el: g,
      cheer: function (on, ms) {
        return A.tween(level, { k: on ? 1 : 0.15 }, ms || 400, 'outQuad');
      },
      destroy: function () {
        stop();
        g.remove();
      },
    };
  }

  P.props = {
    ball: ball,
    post: post,
    trophy: trophy,
    cone: cone,
    crowd: crowd,
    ensureDefs: ensureDefs,
  };
})();

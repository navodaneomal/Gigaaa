/*
 * Scene runner + the toolkit every scene gets as `ctx`.
 *
 * A scene file registers itself:
 *
 *   PIGGY.scenes.register({
 *     id: 'training', order: 30, title: 'Training',
 *     transition: 'wipe',            // how we arrive: fade | iris | wipe | flash | cut
 *     setup: function (ctx) {...},   // optional: build the set while the screen is covered
 *     play: async function (ctx) {...}
 *   })
 *
 * World coordinates: the stage is 360 × 640 (x right, y down), always fully
 * visible; taller/wider screens see extra "bleed" around it, so backgrounds
 * should extend to roughly x -300…660, y -300…940.
 *
 * Layers (back → front): ctx.layers.bg, mid, actors (the pig lives here), front, fx
 */
(function () {
  'use strict';
  var P = (window.PIGGY = window.PIGGY || {});
  var A = P.anim;
  var T = window.PIGGY_TIMING || {};
  var M = window.PIGGY_MESSAGES || {};
  var params = new URLSearchParams(location.search);
  var AUTO = params.has('auto');

  var registry = [];
  function register(scene) {
    registry.push(scene);
    registry.sort(function (a, b) {
      return a.order - b.order;
    });
  }

  /* ---------- stage refs ---------- */
  var stage, svgRoot, camG, layers, ui, curtain, progressEl;
  var parallaxList = [];
  var sceneLoops = [];
  var camera = { x: 180, y: 320, zoom: 1, rot: 0, sx: 0, sy: 0 };
  var unit = 1; // px per world unit

  function f(n) {
    return Math.round(n * 100) / 100;
  }

  var pointerHeld = false;
  function mount() {
    stage = document.getElementById('stage');
    stage.addEventListener(
      'pointerdown',
      function (e) {
        if (!isHud(e)) pointerHeld = true;
      },
      true
    );
    ['pointerup', 'pointercancel'].forEach(function (t) {
      window.addEventListener(
        t,
        function () {
          pointerHeld = false;
        },
        true
      );
    });
    svgRoot = document.getElementById('world');
    camG = document.getElementById('cam');
    layers = {
      bg: document.getElementById('layer-bg'),
      mid: document.getElementById('layer-mid'),
      actors: document.getElementById('layer-actors'),
      front: document.getElementById('layer-front'),
      fx: document.getElementById('layer-fx'),
    };
    ui = document.getElementById('ui');
    curtain = document.getElementById('curtain');
    progressEl = document.getElementById('progress');
    P.props.ensureDefs(svgRoot);
    measure();
    window.addEventListener('resize', measure);
    if (window.ResizeObserver) new ResizeObserver(measure).observe(stage);
    A.onFrame(renderCamera);
  }

  function measure() {
    var r = stage.getBoundingClientRect();
    unit = Math.min(r.width / 360, r.height / 640);
    stage.style.setProperty('--u', unit.toFixed(4) + 'px');
    A.resizeConfetti();
  }

  /* ---------- camera ---------- */
  var lastCam = '';
  function renderCamera() {
    var t =
      'translate(' + f(180 + camera.sx) + ' ' + f(320 + camera.sy) + ') rotate(' + f(camera.rot) + ') scale(' + f(camera.zoom) + ') translate(' + f(-camera.x) + ' ' + f(-camera.y) + ')';
    if (t !== lastCam) {
      lastCam = t;
      camG.setAttribute('transform', t);
      for (var i = 0; i < parallaxList.length; i++) {
        var pl = parallaxList[i];
        var k = 1 - pl.depth;
        pl.el.setAttribute('transform', 'translate(' + f((camera.x - 180) * k) + ' ' + f((camera.y - 320) * k * 0.6) + ')');
      }
    }
  }
  var cam = {
    state: camera,
    // move the camera to look at world point (x, y) with a zoom
    to: function (o, ms, ease) {
      var to = {};
      var red = A.reduced();
      if (o.x != null) to.x = o.x;
      if (o.y != null) to.y = o.y;
      if (o.zoom != null) to.zoom = red ? 1 + (o.zoom - 1) * 0.35 : o.zoom;
      if (o.rot != null) to.rot = red ? 0 : o.rot;
      if (red) {
        // reduced motion: no sweeping moves, just a quick settle
        ms = Math.min(ms || 0, 250);
        ease = 'outQuad';
      }
      return A.tween(camera, to, ms || 0, ease || 'inOutCubic');
    },
    set: function (o) {
      A.set(camera, o);
    },
    reset: function (ms) {
      return cam.to({ x: 180, y: 320, zoom: 1, rot: 0 }, ms || 0);
    },
    shake: function (amount, ms) {
      if (A.reduced()) return Promise.resolve();
      amount = amount || 6;
      ms = ms || 300;
      var t0 = A.clock();
      return new Promise(function (res) {
        A.onFrame(function (dt, clock) {
          var e = (clock - t0) * 1000;
          if (e >= ms) {
            camera.sx = camera.sy = 0;
            res();
            return false;
          }
          var k = 1 - e / ms;
          camera.sx = (Math.random() * 2 - 1) * amount * k;
          camera.sy = (Math.random() * 2 - 1) * amount * k;
        });
      });
    },
  };

  // world point → px relative to the stage's top-left
  function worldToStage(x, y) {
    var m = camG.getScreenCTM();
    var sr = stage.getBoundingClientRect();
    if (!m) return { x: sr.width / 2, y: sr.height / 2 };
    var pt = svgRoot.createSVGPoint();
    pt.x = x;
    pt.y = y;
    var s = pt.matrixTransform(m);
    return { x: s.x - sr.left, y: s.y - sr.top };
  }

  /* ---------- text ---------- */
  // styles: title | line | hud | soft | big | label    positions: top | upper | center | lower | bottom
  function caption(text, o) {
    o = o || {};
    var el = document.createElement('div');
    el.className = 'cap cap--' + (o.style || 'line') + ' cap--at-' + (o.pos || 'upper') + (o.className ? ' ' + o.className : '');
    if (o.y != null) el.style.top = o.y + '%';
    el.setAttribute('role', 'status');
    var inner = document.createElement('span');
    inner.className = 'cap__text';
    el.appendChild(inner);
    var typing = (o.type || o.style === 'hud') && !A.reduced();
    if (typing) {
      // screen readers get the whole line once, not letter by letter
      inner.setAttribute('aria-hidden', 'true');
      var sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      el.appendChild(sr);
    }
    ui.appendChild(el);
    var enter = A.reduced() ? 'fade' : o.enter || 'pop';
    el.classList.add('enter-' + enter);
    var shown;
    if (typing) {
      shown = typeText(inner, text, o.cps || 32, o.blips !== false);
    } else {
      inner.textContent = text;
      shown = A.wait(o.style === 'title' ? 260 : 220);
    }
    // force a frame so the entrance animation runs
    requestAnimationFrame(function () {
      el.classList.add('is-in');
    });
    var handle = {
      el: el,
      hide: function (ms) {
        if (!el.isConnected) return Promise.resolve();
        el.classList.add('is-out');
        return A.wait(ms || 260).then(
          function () {
            el.remove();
          },
          function () {
            el.remove();
          }
        );
      },
    };
    var hold = o.hold == null ? T.captionHold || 1500 : o.hold;
    handle.done = A.quiet(shown.then(function () {
      if (o.stay) return; // (never resolve to the thenable handle itself: that would deadlock)
      return A.wait(hold).then(function () {
        return handle.hide();
      });
    }));
    handle.then = function (a, b) {
      return handle.done.then(a, b);
    };
    return handle;
  }

  function typeText(node, text, cps, blips) {
    var chars = Array.from(text);
    var i = 0;
    node.textContent = '';
    var acc = 0;
    return new Promise(function (res, rej) {
      var gen = A.generation();
      A.onFrame(function (dt) {
        if (gen !== A.generation()) {
          rej(new A.Cancelled());
          return false;
        }
        acc += dt * cps;
        var n = Math.floor(acc);
        if (n > 0) {
          acc -= n;
          var before = i;
          i = Math.min(chars.length, i + n);
          node.textContent = chars.slice(0, i).join('');
          if (blips && before !== i && chars[i - 1] !== ' ' && i % 2) P.audio.sfx('blip');
        }
        if (i >= chars.length) {
          res();
          return false;
        }
      });
    });
  }

  function clearText() {
    Array.prototype.forEach.call(ui.querySelectorAll('.cap, .bubble'), function (n) {
      n.remove();
    });
  }

  /* ---------- speech / thought bubbles that follow the pig ---------- */
  function say(text, o) {
    o = o || {};
    var pig = o.pig || ctx.pig;
    var b = document.createElement('div');
    b.className = 'bubble' + (o.thought ? ' bubble--thought' : '') + (o.className ? ' ' + o.className : '');
    b.setAttribute('role', 'status');
    b.innerHTML = '<span class="bubble__text"></span>';
    b.firstChild.textContent = text;
    ui.appendChild(b);
    var stopFollow = A.onFrame(function () {
      if (!b.isConnected) return false;
      var hr = pig.headRect();
      var sr = stage.getBoundingClientRect();
      var cx = hr.left + hr.width / 2 - sr.left + (o.dx || 0) * unit;
      var top = hr.top - sr.top - (o.lift == null ? 30 : o.lift) * unit; // clears the ears
      var w = b.offsetWidth;
      var half = w / 2;
      var minX = half + 8;
      var maxX = sr.width - half - 8;
      var x = A.clamp(cx, minX, maxX);
      b.style.transform = 'translate(' + f(x - half) + 'px,' + f(top - b.offsetHeight) + 'px)';
      b.style.setProperty('--tail', f(A.clamp(cx - (x - half), 18, w - 18)) + 'px');
    });
    requestAnimationFrame(function () {
      b.classList.add('is-in');
    });
    if (!o.silent) P.audio.sfx('pop');
    var handle = {
      el: b,
      hide: function () {
        b.classList.add('is-out');
        return A.wait(200).then(
          function () {
            stopFollow();
            b.remove();
          },
          function () {
            stopFollow();
            b.remove();
          }
        );
      },
    };
    var hold = o.hold == null ? T.bubbleHold || 1500 : o.hold;
    handle.done = A.quiet(A.wait(180).then(function () {
      if (o.stay) return; // (never resolve to the thenable handle itself: that would deadlock)
      return A.wait(hold).then(function () {
        return handle.hide();
      });
    }));
    handle.then = function (a, c) {
      return handle.done.then(a, c);
    };
    return handle;
  }

  /* ---------- prompts: tap / hold / swipe ---------- */
  var activePrompt = null;
  var keyHandlers = [];
  window.addEventListener('keydown', function (e) {
    keyHandlers.slice().forEach(function (h) {
      h(e, 'down');
    });
  });
  window.addEventListener('keyup', function (e) {
    keyHandlers.slice().forEach(function (h) {
      h(e, 'up');
    });
  });
  function onKeys(fn) {
    keyHandlers.push(fn);
    return function () {
      keyHandlers = keyHandlers.filter(function (h) {
        return h !== fn;
      });
    };
  }
  function isHud(e) {
    return e.target && e.target.closest && e.target.closest('.hud, .gate');
  }
  function promptEl(cls, html) {
    var el = document.createElement('div');
    el.className = 'prompt ' + cls;
    el.innerHTML = html;
    ui.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add('is-in');
    });
    return el;
  }
  function removePrompt(el) {
    el.classList.add('is-out');
    setTimeout(function () {
      el.remove();
    }, 260);
  }
  function guardGen(rej) {
    var gen = A.generation();
    return function () {
      if (gen !== A.generation()) {
        rej(new A.Cancelled());
        return false;
      }
    };
  }

  // Resolves on a tap anywhere on the stage (or on `target`: 'pig' | Element).
  function tap(o) {
    o = o || {};
    var label = o.label == null ? M.ui.tap : o.label;
    return A.quiet(
      new Promise(function (res, rej) {
        var el = null;
        var hintTimer = A.wait(o.hintDelay == null ? T.tapHintDelay : o.hintDelay).then(function () {
          if (label && !finished) {
            el = promptEl('prompt--tap' + (o.pos === 'top' ? ' prompt--top' : ''), '<span class="prompt__dot"></span><span class="prompt__label"></span>');
            el.querySelector('.prompt__label').textContent = label;
          }
        });
        hintTimer.catch(function () {});
        var check = guardGen(rej);
        var stopGuard = A.onFrame(function () {
          if (check() === false) cleanup();
        });
        function hit(e) {
          if (isHud(e)) return;
          if (o.target === 'pig') {
            var r = ctx.pig.el.getBoundingClientRect();
            var pad = 24;
            if (e.clientX < r.left - pad || e.clientX > r.right + pad || e.clientY < r.top - pad || e.clientY > r.bottom + pad) return;
          } else if (o.target && o.target.getBoundingClientRect) {
            if (!o.target.contains(e.target)) return;
          }
          done();
        }
        var offKeys = onKeys(function (e, phase) {
          if (phase === 'down' && (e.key === ' ' || e.key === 'Enter') && !e.repeat && !isHud(e)) {
            e.preventDefault();
            done();
          }
        });
        stage.addEventListener('pointerdown', hit);
        var autoT = AUTO ? A.wait(350).then(done) : null;
        if (autoT) autoT.catch(function () {});
        if (T.promptTimeout) A.wait(T.promptTimeout).then(done, function () {});
        var finished = false;
        function cleanup() {
          stage.removeEventListener('pointerdown', hit);
          offKeys();
          stopGuard();
          if (el) removePrompt(el);
        }
        function done() {
          if (finished) return;
          finished = true;
          cleanup();
          if (!o.silent) P.audio.sfx('tap');
          res();
        }
      })
    );
  }

  // Hold anywhere (or on the button) for T.holdMs. Forgiving: after a couple of
  // short presses it simply completes. Resolves {forgiven: bool}.
  function hold(o) {
    o = o || {};
    var need = o.ms || T.holdMs || 700;
    var label = o.label || M.ui.hold;
    return A.quiet(
      new Promise(function (res, rej) {
        var el = promptEl('prompt--hold', '<span class="hold__ring"><svg viewBox="0 0 64 64"><circle class="hold__track" cx="32" cy="32" r="28"/><circle class="hold__fill" cx="32" cy="32" r="28" pathLength="1"/></svg><span class="hold__icon">' + (o.icon || '🏐') + '</span></span><span class="prompt__label"></span>');
        el.querySelector('.prompt__label').textContent = label;
        var fill = el.querySelector('.hold__fill');
        var held = false;
        var k = 0;
        var fails = 0;
        var finished = false;
        var check = guardGen(rej);
        var stopTick = A.onFrame(function (dt) {
          if (check() === false) {
            cleanup();
            return false;
          }
          // progress uses real time so slow motion doesn't make holding harder
          var rdt = dt / Math.max(0.05, A.timeScale());
          k = held ? Math.min(1, k + (rdt * 1000) / need) : Math.max(0, k - rdt * 2.5);
          fill.style.strokeDashoffset = (1 - k).toFixed(3);
          el.classList.toggle('is-holding', held);
          if (o.onProgress) o.onProgress(k);
          if (k >= 1) finish(false);
        });
        function down(e) {
          if (isHud(e)) return;
          if (e.type === 'pointerdown') e.preventDefault();
          held = true;
          if (o.onStart) o.onStart();
        }
        function up() {
          if (!held) return;
          held = false;
          if (k < 1 && k > 0.02) {
            fails++;
            if (o.onFail) o.onFail(fails);
            if (fails >= (T.holdForgiveAfter || 2)) finish(true);
          }
        }
        var offKeys = onKeys(function (e, phase) {
          if (isHud(e) || (e.key !== ' ' && e.key !== 'Enter')) return;
          e.preventDefault();
          if (phase === 'down' && !e.repeat) down(e);
          if (phase === 'up') up();
        });
        stage.addEventListener('pointerdown', down);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        // already pressing when the prompt appears? that counts
        if (pointerHeld) {
          held = true;
          if (o.onStart) o.onStart();
        }
        if (AUTO) A.wait(400).then(function () {
          finish(false);
        }, function () {});
        function cleanup() {
          stage.removeEventListener('pointerdown', down);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          offKeys();
          stopTick();
          removePrompt(el);
        }
        function finish(forgiven) {
          if (finished) return;
          finished = true;
          cleanup();
          res({ forgiven: forgiven });
        }
      })
    );
  }

  // Swipe left/right (or tap the arrow, or press an arrow key).
  function swipe(o) {
    o = o || {};
    var label = o.label || M.ui.swipe;
    return A.quiet(
      new Promise(function (res, rej) {
        var el = promptEl('prompt--swipe', '<span class="swipe__hand"></span><span class="prompt__label"></span><button class="swipe__btn" type="button" aria-label="Next">→</button>');
        el.querySelector('.prompt__label').textContent = label;
        var start = null;
        var finished = false;
        var check = guardGen(rej);
        var stopGuard = A.onFrame(function () {
          if (check() === false) cleanup();
        });
        function down(e) {
          if (isHud(e)) return;
          start = { x: e.clientX, y: e.clientY };
        }
        function move(e) {
          if (!start) return;
          var dx = e.clientX - start.x;
          if (Math.abs(dx) >= (T.swipeDistance || 40) && Math.abs(dx) > Math.abs(e.clientY - start.y)) done();
        }
        function up() {
          start = null;
        }
        el.querySelector('.swipe__btn').addEventListener('click', done);
        var offKeys = onKeys(function (e, phase) {
          if (isHud(e)) return;
          if (phase === 'down' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault();
            done();
          }
        });
        stage.addEventListener('pointerdown', down);
        stage.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        if (AUTO) A.wait(400).then(done, function () {});
        function cleanup() {
          stage.removeEventListener('pointerdown', down);
          stage.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          offKeys();
          stopGuard();
          removePrompt(el);
        }
        function done() {
          if (finished) return;
          finished = true;
          cleanup();
          P.audio.sfx('whoosh');
          res();
        }
      })
    );
  }

  // Calls onTap for every tap on the pig until the returned stop() is called.
  function onPigTap(onTap) {
    function hit(e) {
      if (isHud(e)) return;
      var r = ctx.pig.el.getBoundingClientRect();
      var pad = 22;
      if (e.clientX < r.left - pad || e.clientX > r.right + pad || e.clientY < r.top - pad || e.clientY > r.bottom + pad) return;
      onTap(e);
    }
    stage.addEventListener('pointerdown', hit);
    return function () {
      stage.removeEventListener('pointerdown', hit);
    };
  }

  /* ---------- transitions & cinematic tools ---------- */
  function curtainTo(kind, cover, ms) {
    ms = ms || T.transition || 650;
    if (A.reduced() && kind !== 'cut') kind = 'fade';
    curtain.className = 'curtain curtain--' + kind;
    if (kind === 'cut') {
      curtain.style.opacity = cover ? 1 : 0;
      return Promise.resolve();
    }
    if (!curtain.animate) {
      curtain.style.opacity = cover ? 1 : 0;
      return Promise.resolve();
    }
    var frames;
    if (kind === 'iris') {
      return irisStage(cover, ms);
    } else if (kind === 'wipe') {
      frames = cover
        ? [{ transform: 'translateX(-120%) skewX(-12deg)', opacity: 1 }, { transform: 'translateX(0) skewX(-12deg)', opacity: 1 }]
        : [{ transform: 'translateX(0) skewX(-12deg)', opacity: 1 }, { transform: 'translateX(120%) skewX(-12deg)', opacity: 1 }];
    } else if (kind === 'flash') {
      frames = cover ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }];
      ms = cover ? 90 : 420;
    } else {
      frames = cover ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }];
    }
    var anim = curtain.animate(frames, { duration: ms / A.SPEED, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
    return anim.finished.then(function () {
      curtain.style.opacity = cover ? 1 : 0;
      curtain.style.transform = '';
      anim.cancel();
    });
  }
  // iris: shrink/grow a circular window onto the world (classic cartoon close)
  function irisStage(cover, ms) {
    var sceneEl = document.getElementById('scene-view');
    curtain.style.opacity = 0;
    if (!sceneEl.animate) return Promise.resolve();
    var frames = cover ? [{ clipPath: 'circle(120% at 50% 50%)' }, { clipPath: 'circle(0% at 50% 50%)' }] : [{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(120% at 50% 50%)' }];
    var a = sceneEl.animate(frames, { duration: ms / A.SPEED, easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards' });
    return a.finished.then(function () {
      if (!cover) {
        a.cancel();
        sceneEl.style.clipPath = '';
      } else {
        sceneEl.style.clipPath = 'circle(0% at 50% 50%)';
        a.cancel();
      }
    });
  }

  function letterbox(on) {
    stage.classList.toggle('is-letterbox', !!on);
  }
  var slowSeq = 0; // a newer slowmo() (or clear()) cancels a ramp still running
  function slowmo(k, ms) {
    var my = ++slowSeq;
    var from = { s: A.timeScale() };
    if (!ms) {
      A.setTimeScale(k);
      return Promise.resolve();
    }
    // ramp the global time scale (driven by real frames, not by itself)
    return new Promise(function (res) {
      var t = 0;
      A.onFrame(function (dt) {
        if (my !== slowSeq) {
          res();
          return false;
        }
        t += (dt / Math.max(0.05, A.timeScale())) * 1000;
        var p = Math.min(1, t / ms);
        A.setTimeScale(from.s + (k - from.s) * p);
        if (p >= 1) {
          res();
          return false;
        }
      });
    });
  }
  function flash(color, ms) {
    var el = document.createElement('div');
    el.className = 'flash';
    el.style.background = color || '#fff';
    stage.appendChild(el);
    var a = el.animate ? el.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: (ms || 380) / A.SPEED, easing: 'ease-out' }) : null;
    var done = a ? a.finished : A.wait(ms || 380);
    return done.then(function () {
      el.remove();
    });
  }

  /* ---------- backgrounds ---------- */
  var gradSeq = 0;
  // Full-bleed vertical gradient sky/wall behind everything.
  function backdrop(top, bottom, o) {
    o = o || {};
    var id = 'bdg' + ++gradSeq;
    var g = A.svg('g', null, layers.bg);
    g.innerHTML =
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + top + '"/><stop offset="1" stop-color="' + bottom + '"/></linearGradient></defs>' +
      '<rect x="-400" y="' + (o.y0 == null ? -400 : o.y0) + '" width="1160" height="' + (o.h || 1440) + '" fill="url(#' + id + ')"/>';
    return g;
  }
  // Add SVG markup to a layer, optionally with parallax depth (0 = fixed to screen, 1 = moves with world).
  function art(markup, o) {
    o = o || {};
    var layer = layers[o.layer || 'bg'];
    var g = A.svgFrag(markup, layer, o.attrs);
    if (o.depth != null && o.depth !== 1) {
      var wrap = A.svg('g', null, layer);
      layer.insertBefore(wrap, g);
      wrap.appendChild(g);
      parallaxList.push({ el: wrap, depth: o.depth });
      lastCam = '';
      return g;
    }
    return g;
  }
  function uid(prefix) {
    return (prefix || 'id') + ++gradSeq;
  }

  /* ---------- clearing between scenes ---------- */
  function clear() {
    sceneLoops.forEach(function (stop) {
      stop();
    });
    sceneLoops = [];
    ['bg', 'mid', 'front', 'fx'].forEach(function (k) {
      layers[k].innerHTML = '';
    });
    Array.prototype.slice.call(layers.actors.children).forEach(function (n) {
      if (n !== ctx.pig.el) n.remove();
    });
    parallaxList = [];
    lastCam = '';
    clearText();
    Array.prototype.forEach.call(ui.querySelectorAll('.prompt, .panel, .scene-ui'), function (n) {
      n.remove();
    });
    A.set(camera, { x: 180, y: 320, zoom: 1, rot: 0, sx: 0, sy: 0 });
    slowSeq++;
    A.setTimeScale(1);
    letterbox(false);
    stage.className = stage.className.replace(/\bscene-\S+/g, '').trim();
    var view = document.getElementById('scene-view');
    view.style.clipPath = '';
    ctx.pig.reset();
    ctx.pig.el.style.display = '';
  }

  /* ---------- progress HUD ---------- */
  function buildProgress() {
    progressEl.innerHTML = '';
    registry.forEach(function (s) {
      var seg = document.createElement('span');
      seg.className = 'seg';
      seg.title = s.title || s.id;
      seg.innerHTML = '<i></i>';
      progressEl.appendChild(seg);
    });
  }
  function setProgress(i) {
    Array.prototype.forEach.call(progressEl.children, function (seg, k) {
      seg.classList.toggle('is-done', k < i);
      seg.classList.toggle('is-now', k === i);
    });
  }

  /* ---------- the runner ---------- */
  var running = false;
  var ctx = {
    get layers() {
      return layers;
    },
    get stage() {
      return stage;
    },
    get svg() {
      return svgRoot;
    },
    pig: null,
    M: M,
    T: T,
    A: A,
    Pig: P.Pig,
    props: P.props,
    camera: cam,
    wait: function (ms) {
      return A.wait(ms);
    },
    tween: A.tween,
    caption: caption,
    say: say,
    clearText: clearText,
    tap: tap,
    hold: hold,
    swipe: swipe,
    onPigTap: onPigTap,
    flash: flash,
    letterbox: letterbox,
    slowmo: slowmo,
    curtain: curtainTo,
    backdrop: backdrop,
    art: art,
    uid: uid,
    worldToStage: worldToStage,
    sfx: function (n, d, arg) {
      P.audio.sfx(n, d, arg);
    },
    music: function (m, fade) {
      P.audio.music(m, fade);
    },
    ambience: function (k, l, fade) {
      P.audio.ambience(k, l, fade);
    },
    get reduced() {
      return A.reduced();
    },
    fx: {
      puff: function (x, y, o) {
        A.fx.puff(layers.fx, x, y, o);
      },
      sparkle: function (x, y, o) {
        A.fx.sparkle(layers.fx, x, y, o);
      },
      zzz: function (x, y) {
        A.fx.zzz(layers.fx, x, y);
      },
      sweat: function (x, y, dir) {
        A.fx.sweat(layers.fx, x, y, dir);
      },
      speedLine: function (x, y, dir) {
        A.fx.speedLine(layers.fx, x, y, dir);
      },
      impact: function (x, y, o) {
        A.fx.impact(layers.fx, x, y, o);
      },
      // confetti burst from a world point
      confetti: function (x, y, o) {
        var s = worldToStage(x, y);
        A.confetti(s.x, s.y, o);
      },
    },
    // Comic-book sound word ("BONK!") that pops at a world point, then fades.
    boom: function (text, x, y, o) {
      o = o || {};
      var size = o.size || 30;
      var g = A.svg('g', { class: 'boom' }, layers.fx);
      var t = A.svg('text', {
        x: 0,
        y: 0,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'font-family': 'Barlow Condensed, Impact, sans-serif',
        'font-style': 'italic',
        'font-weight': 800,
        'font-size': size,
        fill: o.color || '#ffcf4d',
        stroke: o.stroke || '#1b1630',
        'stroke-width': size * 0.14,
        'paint-order': 'stroke',
        'stroke-linejoin': 'round',
      }, g);
      t.textContent = text;
      var st = { s: 0.2, o: 1 };
      var rot = o.rot == null ? -8 : o.rot;
      var stop = A.onFrame(function () {
        g.setAttribute('transform', 'translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + st.s.toFixed(3) + ')');
        g.setAttribute('opacity', st.o.toFixed(3));
      });
      var hold = o.hold == null ? 700 : o.hold;
      return A.quiet(A.tween(st, { s: 1 }, 260, 'outBackBig')
        .then(function () {
          return A.wait(hold);
        })
        .then(function () {
          return A.tween(st, { o: 0, s: 1.15 }, 260, 'inQuad');
        })
        .then(
          function () {
            stop();
            g.remove();
          },
          function (e) {
            stop();
            g.remove();
            throw e;
          }
        ));
    },
    // Per-frame loop owned by the current scene; stopped automatically between scenes.
    loop: function (fn) {
      var stop = A.onFrame(fn);
      sceneLoops.push(stop);
      return stop;
    },
    // Call fn every `ms` of film time until stopped (or the scene ends).
    every: function (ms, fn) {
      var t = 0;
      return ctx.loop(function (dt) {
        t += dt * 1000;
        if (t >= ms) {
          t -= ms;
          return fn();
        }
      });
    },
    // HTML panel in the UI layer (mission cards, scoreboards…); removed on clear
    panel: function (html, className) {
      var el = document.createElement('div');
      el.className = 'panel ' + (className || '');
      el.innerHTML = html;
      ui.appendChild(el);
      requestAnimationFrame(function () {
        el.classList.add('is-in');
      });
      return el;
    },
  };

  function prepare(scene) {
    clear();
    stage.classList.add('scene-' + scene.id);
    if (scene.setup) scene.setup(ctx);
  }

  async function run(from, opts) {
    opts = opts || {};
    running = true;
    for (var i = from; i < registry.length; i++) {
      var sc = registry[i];
      setProgress(i);
      if (!(i === from && opts.alreadySetUp)) {
        var kind = sc.transition || 'fade';
        await curtainTo(kind, true);
        prepare(sc);
        await curtainTo(kind, false);
      }
      try {
        await sc.play(ctx);
      } catch (err) {
        if (A.isCancel(err)) return;
        // never strand the viewer: log and carry on to the next scene
        if (window.console) console.error('Scene "' + sc.id + '" failed:', err);
      }
    }
    setProgress(registry.length);
    running = false;
    if (opts.onEnd) opts.onEnd();
  }

  function restart(from, opts) {
    A.cancelAll();
    A.setTimeScale(1);
    return A.wait(30).then(function () {
      return run(from || 0, opts);
    });
  }

  function indexOf(id) {
    for (var i = 0; i < registry.length; i++) if (registry[i].id === id) return i;
    return -1;
  }

  // Scenes ship their own CSS (scoped under .scene-<id> on the stage); injected once.
  var cssDone = {};
  function css(id, text) {
    if (cssDone[id]) return;
    cssDone[id] = true;
    var st = document.createElement('style');
    st.setAttribute('data-scene-css', id);
    st.textContent = text;
    document.head.appendChild(st);
  }

  P.scenes = {
    register: register,
    css: css,
    list: function () {
      return registry;
    },
    mount: function () {
      mount();
      ctx.pig = P.Pig.create(layers.actors, { x: 180, y: 520 });
      buildProgress();
      return ctx;
    },
    prepare: prepare,
    run: run,
    restart: restart,
    indexOf: indexOf,
    ctx: function () {
      return ctx;
    },
    isRunning: function () {
      return running;
    },
  };
})();

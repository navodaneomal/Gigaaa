/*
 * Sound: every effect is synthesised with the Web Audio API, so there are
 * no audio files to download. Nothing plays until the first tap (unlock()).
 */
(function () {
  'use strict';
  var RFC = (window.RFC = window.RFC || {});
  var MUTE_KEY = 'rfc.muted';

  var ctx = null;
  var master = null;
  var sfx = null;
  var amb = null;
  var ambStarted = false;
  var ambTarget = 0;
  var noise = {};
  var muted = false;

  try {
    muted = localStorage.getItem(MUTE_KEY) === '1';
  } catch (e) {}

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    chain(master, comp, ctx.destination);
    sfx = ctx.createGain();
    sfx.connect(master);
    amb = ctx.createGain();
    amb.gain.value = 0;
    amb.connect(master);
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Connect nodes in series. (Older Safari's connect() doesn't return the node.)
  function chain() {
    for (var i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]);
  }

  function ready() {
    return ctx && ctx.state !== 'closed' && !muted;
  }

  function noiseBuffer(kind) {
    if (noise[kind]) return noise[kind];
    var len = Math.floor(ctx.sampleRate * 2);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      } else {
        d[i] = w;
      }
    }
    noise[kind] = buf;
    return buf;
  }

  function noiseSource(kind, loop) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(kind || 'white');
    src.loop = !!loop;
    return src;
  }

  // Simple attack/decay envelope on a gain node.
  function envelope(g, t, peak, attack, hold, release) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    return t + attack + hold + release;
  }

  /* --- effects --- */

  // Pea whistle: a high tone with a fast warble from the rattling pea.
  function whistle(dur, delay, opts) {
    if (!ready()) return;
    opts = opts || {};
    dur = dur || 0.28;
    var t = ctx.currentTime + (delay || 0);
    var pitch = opts.pitch || 2900;
    var vol = opts.volume == null ? 0.16 : opts.volume;

    var out = ctx.createGain();
    out.connect(sfx);
    var end = envelope(out, t, vol, 0.015, Math.max(0.01, dur - 0.08), 0.07);

    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch * 0.96, t);
    osc.frequency.exponentialRampToValueAtTime(pitch, t + 0.05);

    var osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(pitch * 1.5, t);
    var g2 = ctx.createGain();
    g2.gain.value = 0.12;

    var lfo = ctx.createOscillator();
    lfo.frequency.value = opts.trill || 34;
    var lfoDepth = ctx.createGain();
    lfoDepth.gain.value = pitch * 0.05;
    lfo.connect(lfoDepth);
    lfoDepth.connect(osc.frequency);
    lfoDepth.connect(osc2.frequency);

    var trem = ctx.createGain();
    trem.gain.value = 0.7;
    var tremDepth = ctx.createGain();
    tremDepth.gain.value = 0.3;
    chain(lfo, tremDepth, trem.gain);

    osc.connect(trem);
    chain(osc2, g2, trem);
    trem.connect(out);

    // breath
    var n = noiseSource('white');
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = pitch;
    bp.Q.value = 1.4;
    var ng = ctx.createGain();
    ng.gain.value = 0.18;
    chain(n, bp, ng, out);

    [osc, osc2, lfo, n].forEach(function (s) {
      s.start(t);
      s.stop(end + 0.05);
    });
  }

  function finalWhistle() {
    whistle(0.2, 0);
    whistle(0.2, 0.32);
    whistle(1.05, 0.64);
  }

  function tap() {
    if (!ready()) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(660, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.06);
    chain(o, g, sfx);
    var end = envelope(g, t, 0.07, 0.004, 0.01, 0.06);
    o.start(t);
    o.stop(end);
  }

  function bounce(vol) {
    if (!ready()) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.14);
    chain(o, g, sfx);
    var end = envelope(g, t, vol || 0.32, 0.004, 0.02, 0.14);
    o.start(t);
    o.stop(end);

    var n = noiseSource('white');
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    var ng = ctx.createGain();
    chain(n, lp, ng, sfx);
    var e2 = envelope(ng, t, (vol || 0.32) * 0.35, 0.002, 0.005, 0.05);
    n.start(t);
    n.stop(e2);
  }

  function swish() {
    if (!ready()) return;
    var t = ctx.currentTime;
    var n = noiseSource('white');
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(4200, t);
    bp.frequency.exponentialRampToValueAtTime(1100, t + 0.35);
    var g = ctx.createGain();
    chain(n, bp, g, sfx);
    var end = envelope(g, t, 0.3, 0.02, 0.06, 0.3);
    n.start(t);
    n.stop(end);
  }

  function rim() {
    if (!ready()) return;
    var t = ctx.currentTime;
    [620, 1590, 2420, 3310].forEach(function (f, i) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      chain(o, g, sfx);
      var end = envelope(g, t, 0.07 / (i + 1), 0.002, 0.01, 0.35 - i * 0.05);
      o.start(t);
      o.stop(end);
    });
  }

  function cheer(dur) {
    if (!ready()) return;
    dur = dur || 1.6;
    var t = ctx.currentTime;
    var n = noiseSource('white');
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1050;
    bp.Q.value = 0.6;
    var bp2 = ctx.createBiquadFilter();
    bp2.type = 'peaking';
    bp2.frequency.value = 2600;
    bp2.gain.value = 5;
    var g = ctx.createGain();
    var flutter = ctx.createOscillator();
    flutter.frequency.value = 6.5;
    var fd = ctx.createGain();
    fd.gain.value = 0.03;
    chain(flutter, fd, g.gain);
    chain(n, bp, bp2, g, sfx);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.22);
    g.gain.setValueAtTime(0.16, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.start(t);
    flutter.start(t);
    n.stop(t + dur + 0.05);
    flutter.stop(t + dur + 0.05);
  }

  function chime() {
    if (!ready()) return;
    var t = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      chain(o, g, sfx);
      var st = t + i * 0.09;
      var end = envelope(g, st, 0.09, 0.01, 0.05, 1.1);
      o.start(st);
      o.stop(end);
    });
  }

  function paper() {
    if (!ready()) return;
    var t0 = ctx.currentTime;
    for (var i = 0; i < 6; i++) {
      var t = t0 + i * 0.06 + Math.random() * 0.04;
      var n = noiseSource('white');
      var hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2200 + Math.random() * 1800;
      var g = ctx.createGain();
      chain(n, hp, g, sfx);
      var end = envelope(g, t, 0.05 + Math.random() * 0.04, 0.005, 0.01, 0.07);
      n.start(t, Math.random());
      n.stop(end);
    }
  }

  function stamp() {
    if (!ready()) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.16);
    chain(o, g, sfx);
    var end = envelope(g, t, 0.35, 0.003, 0.01, 0.18);
    o.start(t);
    o.stop(end);
    var n = noiseSource('white');
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    var ng = ctx.createGain();
    chain(n, lp, ng, sfx);
    var e2 = envelope(ng, t, 0.2, 0.002, 0.01, 0.08);
    n.start(t);
    n.stop(e2);
  }

  function whoosh() {
    if (!ready()) return;
    var t = ctx.currentTime;
    var n = noiseSource('white');
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.4);
    var g = ctx.createGain();
    chain(n, bp, g, sfx);
    var end = envelope(g, t, 0.07, 0.12, 0.05, 0.3);
    n.start(t);
    n.stop(end);
  }

  function buzz() {
    if (!ready()) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 140;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    chain(o, lp, g, sfx);
    var end = envelope(g, t, 0.06, 0.005, 0.12, 0.08);
    o.start(t);
    o.stop(end);
  }

  /* --- stadium ambience: distant crowd hum, faded in and out --- */
  function startAmbience() {
    if (ambStarted || !ctx) return;
    ambStarted = true;
    var hum = noiseSource('brown', true);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    var hg = ctx.createGain();
    hg.gain.value = 0.55;
    chain(hum, lp, hg, amb);

    var crowd = noiseSource('white', true);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 650;
    bp.Q.value = 0.5;
    var cg = ctx.createGain();
    cg.gain.value = 0.05;
    var swell = ctx.createOscillator();
    swell.frequency.value = 0.13;
    var sd = ctx.createGain();
    sd.gain.value = 0.025;
    chain(swell, sd, cg.gain);
    chain(crowd, bp, cg, amb);

    hum.start();
    crowd.start(0, 0.7);
    swell.start();
  }

  function setAmbience(level, seconds) {
    ambTarget = level;
    if (!ctx) return;
    if (level > 0) startAmbience();
    var t = ctx.currentTime;
    amb.gain.cancelScheduledValues(t);
    amb.gain.setValueAtTime(amb.gain.value, t);
    amb.gain.linearRampToValueAtTime(level, t + (seconds == null ? 1.2 : seconds));
  }

  function setMuted(m) {
    muted = !!m;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch (e) {}
    if (ctx) {
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(muted ? 0 : 0.85, t + 0.15);
    }
  }

  // Don't hum in a background tab.
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  RFC.audio = {
    unlock: unlock,
    whistle: whistle,
    finalWhistle: finalWhistle,
    tap: tap,
    bounce: bounce,
    swish: swish,
    rim: rim,
    cheer: cheer,
    chime: chime,
    paper: paper,
    stamp: stamp,
    whoosh: whoosh,
    buzz: buzz,
    setAmbience: setAmbience,
    ambienceLevel: function () {
      return ambTarget;
    },
    setMuted: setMuted,
    isMuted: function () {
      return muted;
    },
  };
})();

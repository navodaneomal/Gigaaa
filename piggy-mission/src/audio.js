/*
 * Sound: everything is synthesised with Web Audio, so no audio files.
 * Nothing plays until the first tap (unlock()).
 *
 *   PIGGY.audio.sfx('bonk')          one-shot effects (see SFX below)
 *   PIGGY.audio.music('training')    crossfades to a mood: sleep | playful | training |
 *                                    tense | match | victory | warm | none
 *   PIGGY.audio.ambience('crowd', 0.3)   room | crowd, level 0..1
 */
(function () {
  'use strict';
  var P = (window.PIGGY = window.PIGGY || {});
  var MUTE_KEY = 'piggy.muted';

  var ctx = null;
  var master = null;
  var sfxBus = null;
  var musicBus = null;
  var ambBus = null;
  var noiseBuf = {};
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
    master.gain.value = muted ? 0 : 0.9;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3.5;
    master.connect(comp);
    comp.connect(ctx.destination);
    sfxBus = gain(1, master);
    musicBus = gain(0.5, master);
    ambBus = gain(1, master);
    if (ctx.state === 'suspended') ctx.resume();
    startScheduler();
    return ctx;
  }
  function on() {
    return !!ctx && ctx.state !== 'closed';
  }
  function gain(v, dest) {
    var g = ctx.createGain();
    g.gain.value = v;
    if (dest) g.connect(dest);
    return g;
  }
  function chain() {
    for (var i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]);
  }
  function osc(type, freq) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    return o;
  }
  function filter(type, freq, q) {
    var f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q != null) f.Q.value = q;
    return f;
  }
  function noise(kind) {
    kind = kind || 'white';
    if (!noiseBuf[kind]) {
      var len = Math.floor(ctx.sampleRate * 2);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      var last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        if (kind === 'brown') {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.2;
        } else d[i] = w;
      }
      noiseBuf[kind] = buf;
    }
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf[kind];
    return s;
  }
  // attack / hold / release envelope on a gain param
  function env(param, t, peak, a, h, r) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    param.setValueAtTime(Math.max(0.0002, peak), t + a + h);
    param.exponentialRampToValueAtTime(0.0001, t + a + h + r);
    return t + a + h + r;
  }
  function play(nodes, t, end) {
    nodes.forEach(function (n) {
      n.start(t);
      n.stop(end + 0.05);
    });
  }
  function mtof(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }
  var NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function nf(n) {
    // 'C4', 'F#3', 'Bb5' → frequency
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
    if (!m) return 0;
    var semi = NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return mtof(12 * (parseInt(m[3], 10) + 1) + semi);
  }

  /* =================== instruments (scheduled at time t) =================== */
  function pluck(dest, freq, t, dur, vol) {
    var o = osc('triangle', freq);
    var o2 = osc('sine', freq * 2);
    var g2 = gain(0.25);
    var lp = filter('lowpass', 3200, 0.7);
    var g = gain(0);
    chain(o, lp);
    chain(o2, g2, lp);
    chain(lp, g, dest);
    var end = env(g.gain, t, vol, 0.004, 0.02, dur);
    play([o, o2], t, end);
  }
  function bell(dest, freq, t, vol, dur) {
    var o = osc('sine', freq);
    var o2 = osc('sine', freq * 2.76);
    var g = gain(0);
    var g2 = gain(0.22);
    chain(o, g, dest);
    chain(o2, g2, g);
    var end = env(g.gain, t, vol, 0.004, 0.01, dur || 1.1);
    play([o, o2], t, end);
  }
  function bass(dest, freq, t, dur, vol) {
    var o = osc('triangle', freq);
    var o2 = osc('sine', freq / 2);
    var lp = filter('lowpass', 700, 0.8);
    var g = gain(0);
    chain(o, lp, g, dest);
    chain(o2, g);
    var end = env(g.gain, t, vol, 0.008, dur * 0.5, dur * 0.5);
    play([o, o2], t, end);
  }
  function pad(dest, freqs, t, dur, vol) {
    var lp = filter('lowpass', 1100, 0.5);
    var g = gain(0);
    chain(lp, g, dest);
    var nodes = [];
    freqs.forEach(function (fq) {
      [-6, 6].forEach(function (cents) {
        var o = osc('sawtooth', fq);
        o.detune.value = cents;
        o.connect(lp);
        nodes.push(o);
      });
    });
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol / freqs.length, t + Math.min(0.6, dur * 0.4));
    g.gain.setValueAtTime(vol / freqs.length, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    play(nodes, t, t + dur);
  }
  function brass(dest, freqs, t, dur, vol) {
    var lp = filter('lowpass', 500, 1.2);
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.exponentialRampToValueAtTime(2600, t + 0.08);
    lp.frequency.exponentialRampToValueAtTime(1400, t + dur);
    var g = gain(0);
    chain(lp, g, dest);
    var nodes = freqs.map(function (fq) {
      var o = osc('sawtooth', fq);
      o.connect(lp);
      return o;
    });
    var end = env(g.gain, t, vol / Math.sqrt(freqs.length), 0.03, dur * 0.6, dur * 0.4);
    play(nodes, t, end);
  }
  function kick(dest, t, vol) {
    var o = osc('sine', 150);
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    var g = gain(0);
    chain(o, g, dest);
    var end = env(g.gain, t, vol, 0.002, 0.02, 0.16);
    play([o], t, end);
  }
  function snare(dest, t, vol) {
    var n = noise();
    var bp = filter('bandpass', 1900, 0.8);
    var g = gain(0);
    chain(n, bp, g, dest);
    var end = env(g.gain, t, vol, 0.002, 0.01, 0.12);
    var o = osc('triangle', 190);
    var go = gain(0);
    chain(o, go, dest);
    env(go.gain, t, vol * 0.5, 0.002, 0.01, 0.07);
    play([n, o], t, end);
  }
  function clap(dest, t, vol) {
    for (var i = 0; i < 3; i++) {
      var n = noise();
      var bp = filter('bandpass', 1300, 1.2);
      var g = gain(0);
      chain(n, bp, g, dest);
      var tt = t + i * 0.012;
      var end = env(g.gain, tt, vol * (i === 2 ? 1 : 0.6), 0.001, 0.005, i === 2 ? 0.12 : 0.02);
      play([n], tt, end);
    }
  }
  function hat(dest, t, vol, open) {
    var n = noise();
    var hp = filter('highpass', 7200, 0.7);
    var g = gain(0);
    chain(n, hp, g, dest);
    var end = env(g.gain, t, vol, 0.001, 0.005, open ? 0.12 : 0.03);
    play([n], t, end);
  }

  /* =================== music moods =================== */
  // Each mood: bpm and a step(i, t, sd, bus) function. 16 steps per bar.
  var C = ['C4', 'E4', 'G4'];
  var Am = ['A3', 'C4', 'E4'];
  var F = ['F3', 'A3', 'C4'];
  var G = ['G3', 'B3', 'D4'];
  var Em = ['E3', 'G3', 'B3'];
  function freqs(ch) {
    return ch.map(nf);
  }

  var MOODS = {
    sleep: {
      bpm: 66,
      level: 0.55,
      step: function (i, t, sd, d) {
        var bar = Math.floor(i / 16) % 4;
        var s = i % 16;
        var ch = [C, Am, F, G][bar];
        if (s === 0) pad(d, freqs(ch), t, sd * 16, 0.05);
        var arp = [ch[0], ch[1], ch[2], ch[1]];
        if (s % 4 === 0) bell(d, nf(arp[s / 4].replace(/\d/, function (n) {
          return +n + 1;
        })), t, 0.05, 1.6);
      },
    },
    playful: {
      bpm: 104,
      level: 0.6,
      step: function (i, t, sd, d) {
        var bar = Math.floor(i / 16) % 4;
        var s = i % 16;
        var roots = ['C3', 'G2', 'A2', 'F2'];
        var mel = [
          ['E5', null, 'G5', null, 'C6', null, 'G5', null, 'A5', null, 'G5', 'E5', null, null, 'D5', null],
          ['D5', null, 'G5', null, 'B5', null, 'G5', null, 'A5', 'G5', null, 'D5', null, null, null, null],
          ['C5', null, 'E5', null, 'A5', null, 'E5', null, 'G5', null, 'E5', 'C5', null, null, 'D5', null],
          ['C5', null, 'F5', null, 'A5', null, 'C6', null, 'B5', null, 'G5', null, 'D5', null, null, null],
        ][bar];
        if (s === 0 || s === 8) bass(d, nf(roots[bar]), t, sd * 3, 0.16);
        if (s === 6 || s === 14) bass(d, nf(roots[bar]) * 1.5, t, sd * 1.5, 0.08);
        if (mel[s]) pluck(d, nf(mel[s]), t, 0.28, 0.08);
        if (s % 4 === 2) hat(d, t, 0.02);
      },
    },
    training: {
      bpm: 124,
      level: 0.6,
      step: function (i, t, sd, d) {
        var bar = Math.floor(i / 16) % 4;
        var s = i % 16;
        var roots = ['C2', 'A1', 'F1', 'G1'];
        if (s % 4 === 0) kick(d, t, 0.42);
        if (s === 4 || s === 12) clap(d, t, 0.12);
        if (s % 4 === 2) hat(d, t, 0.035, s === 14);
        if (s % 2 === 0) bass(d, nf(roots[bar]) * (s % 4 === 2 ? 2 : 1), t, sd * 1.6, 0.14);
        var riff = ['C5', null, 'E5', 'G5', null, 'E5', null, 'C6', null, 'G5', null, 'E5', 'G5', null, 'A5', null];
        var shift = [0, -3, -7, -5][bar];
        if (riff[s]) pluck(d, nf(riff[s]) * Math.pow(2, shift / 12), t, 0.18, 0.06);
      },
    },
    tense: {
      bpm: 76,
      level: 0.7,
      step: function (i, t, sd, d) {
        var s = i % 16;
        if (s === 0) pad(d, [nf('D2'), nf('A2'), nf('D3')], t, sd * 16, 0.12);
        if (s === 0 || s === 8) kick(d, t, 0.32);
        if (s === 2 || s === 10) kick(d, t, 0.2);
        if (s === 12) bell(d, nf('A5'), t, 0.025, 0.6);
      },
    },
    match: {
      bpm: 146,
      level: 0.6,
      step: function (i, t, sd, d) {
        var bar = Math.floor(i / 16) % 4;
        var s = i % 16;
        var roots = ['A1', 'F1', 'C2', 'G1'];
        if (s % 4 === 0 || s === 14) kick(d, t, 0.45);
        if (s === 4 || s === 12) snare(d, t, 0.18);
        hat(d, t, s % 2 ? 0.015 : 0.03);
        if (s % 2 === 0) bass(d, nf(roots[bar]) * (s % 8 === 6 ? 2 : 1), t, sd * 1.7, 0.15);
        var riff = ['A4', null, 'C5', 'E5', null, 'A5', null, 'E5', 'G5', null, 'E5', null, 'C5', 'D5', 'E5', null];
        var shift = [0, -4, 3, -2][bar];
        if (riff[s]) pluck(d, nf(riff[s]) * Math.pow(2, shift / 12), t, 0.14, 0.055);
      },
    },
    victory: {
      bpm: 120,
      level: 0.7,
      step: function (i, t, sd, d) {
        var bar = Math.floor(i / 16) % 4;
        var s = i % 16;
        var chords = [
          ['C4', 'E4', 'G4'],
          ['F4', 'A4', 'C5'],
          ['G4', 'B4', 'D5'],
          ['C4', 'E4', 'G4', 'C5'],
        ];
        if (s === 0) brass(d, freqs(chords[bar]), t, sd * 6, 0.16);
        if (s === 8) brass(d, freqs(chords[bar]), t, sd * 4, 0.12);
        if (s % 4 === 0) kick(d, t, 0.35);
        if (s === 4 || s === 12) snare(d, t, 0.14);
        if (s % 2 === 1) hat(d, t, 0.02);
        var fan = ['G4', null, 'C5', null, 'E5', null, 'G5', null, null, null, 'E5', null, 'G5', null, null, null];
        if (bar === 0 && fan[s]) pluck(d, nf(fan[s]), t, 0.4, 0.1);
        if (bar === 3 && s % 2 === 0) bell(d, nf(['C6', 'E6', 'G6', 'C7'][(s / 2) % 4]), t, 0.03, 0.8);
      },
    },
    warm: {
      bpm: 68,
      level: 0.6,
      step: function (i, t, sd, d) {
        var bar = Math.floor(i / 16) % 4;
        var s = i % 16;
        var ch = [C, Em, Am, F][bar];
        if (s === 0) pad(d, freqs(ch).concat([nf(ch[0]) / 2]), t, sd * 16.5, 0.09);
        var notes = [
          ['G5', null, null, null, 'E5', null, null, null, 'C5', null, null, null, null, null, null, null],
          ['B4', null, null, null, 'G5', null, null, null, null, null, 'E5', null, null, null, null, null],
          ['C5', null, null, null, 'E5', null, null, null, 'A5', null, null, null, null, null, null, null],
          ['A5', null, null, null, 'G5', null, null, null, 'F5', null, null, null, 'E5', null, null, null],
        ][bar];
        if (notes[s]) bell(d, nf(notes[s]), t, 0.035, 1.8);
      },
    },
  };

  var current = null; // {name, bus, step, next}
  var schedulerOn = false;
  function startScheduler() {
    if (schedulerOn) return;
    schedulerOn = true;
    setInterval(function () {
      if (!ctx || !current || !current.mood) return;
      var sd = 60 / current.mood.bpm / 4;
      while (current.next < ctx.currentTime + 0.14) {
        try {
          current.mood.step(current.step, current.next, sd, current.bus);
        } catch (e) {}
        current.next += sd;
        current.step++;
      }
    }, 30);
  }

  function music(name, fade) {
    if (!ctx) {
      pendingMood = name;
      return;
    }
    if (current && current.name === name) return;
    fade = fade == null ? 0.8 : fade;
    var t = ctx.currentTime;
    if (current && current.bus) {
      var old = current.bus;
      old.gain.cancelScheduledValues(t);
      old.gain.setValueAtTime(old.gain.value, t);
      old.gain.linearRampToValueAtTime(0.0001, t + fade);
      setTimeout(function () {
        try {
          old.disconnect();
        } catch (e) {}
      }, (fade + 2) * 1000);
    }
    var mood = MOODS[name];
    if (!mood) {
      current = { name: name, mood: null };
      return;
    }
    var bus = gain(0, musicBus);
    bus.gain.setValueAtTime(0.0001, t);
    bus.gain.linearRampToValueAtTime(mood.level, t + Math.max(0.05, fade * 0.6));
    current = { name: name, mood: mood, bus: bus, step: 0, next: t + 0.05 };
  }
  var pendingMood = null;

  /* =================== sound effects =================== */
  var SFX = {
    tap: function (t) {
      var o = osc('sine', 700);
      o.frequency.setValueAtTime(700, t);
      o.frequency.exponentialRampToValueAtTime(440, t + 0.06);
      var g = gain(0);
      chain(o, g, sfxBus);
      play([o], t, env(g.gain, t, 0.08, 0.003, 0.01, 0.06));
    },
    pop: function (t) {
      var o = osc('sine', 500);
      o.frequency.setValueAtTime(500, t);
      o.frequency.exponentialRampToValueAtTime(1400, t + 0.07);
      var g = gain(0);
      chain(o, g, sfxBus);
      play([o], t, env(g.gain, t, 0.16, 0.003, 0.02, 0.08));
    },
    bonk: function (t) {
      var o = osc('sine', 620);
      o.frequency.setValueAtTime(620, t);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.18);
      var g = gain(0);
      chain(o, g, sfxBus);
      var o2 = osc('square', 900);
      var bp = filter('bandpass', 1200, 4);
      var g2 = gain(0);
      chain(o2, bp, g2, sfxBus);
      env(g2.gain, t, 0.12, 0.001, 0.005, 0.05);
      play([o, o2], t, env(g.gain, t, 0.38, 0.002, 0.03, 0.2));
    },
    boing: function (t) {
      var o = osc('sine', 180);
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(520, t + 0.35);
      var lfo = osc('sine', 18);
      var lg = gain(40);
      chain(lfo, lg, o.frequency);
      var g = gain(0);
      chain(o, g, sfxBus);
      play([o, lfo], t, env(g.gain, t, 0.2, 0.01, 0.2, 0.25));
    },
    slideUp: function (t) {
      var o = osc('sine', 320);
      o.frequency.setValueAtTime(320, t);
      o.frequency.exponentialRampToValueAtTime(1300, t + 0.42);
      var lfo = osc('sine', 7);
      var lg = gain(14);
      chain(lfo, lg, o.frequency);
      var g = gain(0);
      chain(o, g, sfxBus);
      play([o, lfo], t, env(g.gain, t, 0.12, 0.02, 0.35, 0.1));
    },
    slideDown: function (t) {
      var o = osc('sine', 1200);
      o.frequency.setValueAtTime(1200, t);
      o.frequency.exponentialRampToValueAtTime(240, t + 0.6);
      var lfo = osc('sine', 7);
      var lg = gain(14);
      chain(lfo, lg, o.frequency);
      var g = gain(0);
      chain(o, g, sfxBus);
      play([o, lfo], t, env(g.gain, t, 0.12, 0.02, 0.5, 0.12));
    },
    snore: function (t) {
      // in-breath rumble then a soft whistle out
      var n = noise('brown');
      var lp = filter('lowpass', 380, 3);
      lp.frequency.setValueAtTime(260, t);
      lp.frequency.linearRampToValueAtTime(520, t + 0.9);
      var lfo = osc('square', 38);
      var lg = gain(0.5);
      var g = gain(0);
      var trem = gain(0.5);
      chain(lfo, lg, trem.gain);
      chain(n, lp, trem, g, sfxBus);
      var end = env(g.gain, t, 0.22, 0.25, 0.45, 0.25);
      var o = osc('sine', 1100);
      o.frequency.setValueAtTime(1150, t + 1.05);
      o.frequency.linearRampToValueAtTime(800, t + 1.6);
      var go = gain(0);
      chain(o, go, sfxBus);
      env(go.gain, t + 1.05, 0.025, 0.08, 0.2, 0.25);
      play([n, lfo], t, end);
      play([o], t + 1.05, t + 1.65);
    },
    bounce: function (t, v) {
      var o = osc('sine', 160);
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.14);
      var g = gain(0);
      chain(o, g, sfxBus);
      play([o], t, env(g.gain, t, v || 0.3, 0.003, 0.02, 0.14));
    },
    footstep: function (t) {
      var o = osc('sine', 95);
      o.frequency.setValueAtTime(95, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.06);
      var g = gain(0);
      chain(o, g, sfxBus);
      play([o], t, env(g.gain, t, 0.09, 0.002, 0.01, 0.06));
    },
    thud: function (t) {
      var o = osc('sine', 110);
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.22);
      var g = gain(0);
      chain(o, g, sfxBus);
      var n = noise();
      var lp = filter('lowpass', 600);
      var gn = gain(0);
      chain(n, lp, gn, sfxBus);
      env(gn.gain, t, 0.18, 0.002, 0.01, 0.1);
      play([o, n], t, env(g.gain, t, 0.45, 0.003, 0.03, 0.22));
    },
    whoosh: function (t) {
      var n = noise();
      var bp = filter('bandpass', 500, 0.9);
      bp.frequency.setValueAtTime(500, t);
      bp.frequency.exponentialRampToValueAtTime(2800, t + 0.35);
      var g = gain(0);
      chain(n, bp, g, sfxBus);
      play([n], t, env(g.gain, t, 0.12, 0.1, 0.05, 0.25));
    },
    swish: function (t) {
      var n = noise();
      var bp = filter('bandpass', 4200, 1.1);
      bp.frequency.setValueAtTime(4200, t);
      bp.frequency.exponentialRampToValueAtTime(1100, t + 0.4);
      var g = gain(0);
      chain(n, bp, g, sfxBus);
      play([n], t, env(g.gain, t, 0.32, 0.02, 0.08, 0.3));
    },
    whistle: function (t, dur) {
      dur = dur || 0.35;
      var o = osc('sine', 2900);
      var lfo = osc('sine', 34);
      var lg = gain(150);
      chain(lfo, lg, o.frequency);
      var g = gain(0);
      chain(o, g, sfxBus);
      play([o, lfo], t, env(g.gain, t, 0.12, 0.015, dur, 0.07));
    },
    ding: function (t) {
      bell(sfxBus, 1568, t, 0.12, 1.6);
      bell(sfxBus, 2349, t + 0.08, 0.08, 1.4);
    },
    sparkle: function (t) {
      [2093, 2637, 3136, 4186].forEach(function (fq, i) {
        bell(sfxBus, fq, t + i * 0.06, 0.04, 0.6);
      });
    },
    powerUp: function (t) {
      var o = osc('triangle', 220);
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(1320, t + 0.6);
      var g = gain(0);
      chain(o, g, sfxBus);
      play([o], t, env(g.gain, t, 0.1, 0.05, 0.45, 0.15));
      SFX.sparkle(t + 0.55);
    },
    scan: function (t) {
      [0, 0.12].forEach(function (dt) {
        var o = osc('square', 1320);
        var lp = filter('lowpass', 2400);
        var g = gain(0);
        chain(o, lp, g, sfxBus);
        play([o], t + dt, env(g.gain, t + dt, 0.04, 0.002, 0.04, 0.03));
      });
    },
    blip: function (t) {
      var o = osc('square', 880);
      var lp = filter('lowpass', 2000);
      var g = gain(0);
      chain(o, lp, g, sfxBus);
      play([o], t, env(g.gain, t, 0.03, 0.002, 0.015, 0.02));
    },
    heartbeat: function (t) {
      kick(sfxBus, t, 0.35);
      kick(sfxBus, t + 0.18, 0.22);
    },
    drumroll: function (t, dur) {
      dur = dur || 1.2;
      for (var x = 0; x < dur; x += 0.045) snare(sfxBus, t + x, 0.04 + 0.1 * (x / dur));
    },
    cheer: function (t, dur) {
      dur = dur || 2;
      var n = noise();
      var bp = filter('bandpass', 1050, 0.6);
      var pk = filter('peaking', 2600);
      pk.gain.value = 5;
      var g = gain(0);
      var fl = osc('sine', 6.5);
      var fg = gain(0.03);
      chain(fl, fg, g.gain);
      chain(n, bp, pk, g, sfxBus);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.25);
      g.gain.setValueAtTime(0.2, t + dur * 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      play([n, fl], t, t + dur);
    },
    gasp: function (t) {
      var n = noise();
      var bp = filter('bandpass', 700, 1.5);
      bp.frequency.setValueAtTime(500, t);
      bp.frequency.linearRampToValueAtTime(1100, t + 0.5);
      var g = gain(0);
      chain(n, bp, g, sfxBus);
      play([n], t, env(g.gain, t, 0.08, 0.15, 0.2, 0.3));
    },
    zip: function (t) {
      var n = noise();
      var bp = filter('bandpass', 2500, 2);
      var g = gain(0);
      var lfo = osc('square', 60);
      var lg = gain(0.5);
      chain(lfo, lg, g.gain);
      chain(n, bp, g, sfxBus);
      play([n, lfo], t, env(g.gain, t, 0.08, 0.01, 0.18, 0.05));
    },
    fanfare: function (t) {
      var seq = [
        [['G4', 'B4', 'D5'], 0, 0.14],
        [['G4', 'B4', 'D5'], 0.16, 0.14],
        [['G4', 'B4', 'D5'], 0.32, 0.14],
        [['C5', 'E5', 'G5'], 0.5, 0.9],
      ];
      seq.forEach(function (s) {
        brass(sfxBus, freqs(s[0]), t + s[1], s[2], 0.2);
      });
    },
  };

  function sfx(name, delay, arg) {
    if (!on() || muted) return;
    var fn = SFX[name];
    if (!fn) return;
    try {
      fn(ctx.currentTime + (delay || 0), arg);
    } catch (e) {}
  }

  /* =================== ambience =================== */
  var amb = {};
  function ambience(kind, level, fade) {
    if (!ctx) return;
    fade = fade == null ? 1.2 : fade;
    if (!amb[kind]) {
      var g = gain(0, ambBus);
      var n = noise(kind === 'room' ? 'brown' : 'white');
      n.loop = true;
      if (kind === 'room') {
        var lp = filter('lowpass', 260);
        chain(n, lp, g);
      } else {
        var bp = filter('bandpass', 650, 0.5);
        var sw = osc('sine', 0.15);
        var sg = gain(0.25);
        var lv = gain(0.7);
        chain(sw, sg, lv.gain);
        chain(n, bp, lv, g);
        sw.start();
      }
      n.start();
      amb[kind] = g;
    }
    var gg = amb[kind].gain;
    var t = ctx.currentTime;
    var target = (kind === 'room' ? 0.05 : 0.11) * level;
    gg.cancelScheduledValues(t);
    gg.setValueAtTime(gg.value, t);
    gg.linearRampToValueAtTime(target, t + fade);
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
      master.gain.linearRampToValueAtTime(muted ? 0 : 0.9, t + 0.2);
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  P.audio = {
    unlock: function () {
      var c = unlock();
      if (c && pendingMood) {
        var m = pendingMood;
        pendingMood = null;
        music(m, 0.3);
      }
      return c;
    },
    sfx: sfx,
    music: music,
    ambience: ambience,
    setMuted: setMuted,
    isMuted: function () {
      return muted;
    },
    bounce: function (v) {
      sfx('bounce', 0, v);
    },
    moods: Object.keys(MOODS),
    effects: Object.keys(SFX),
  };
})();

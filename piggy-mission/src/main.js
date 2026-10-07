/*
 * Boot: mount the stage, show the sleeping pig behind the "tap to begin"
 * gate (audio can only start after a tap), then play every scene in order.
 *
 * Testing helpers:  ?scene=match   start at a scene (skips the gate)
 *                   ?speed=4       everything 4× faster
 *                   ?auto          prompts answer themselves
 *                   ?reduced       force reduced-motion mode
 */
(function () {
  'use strict';
  var P = window.PIGGY;
  var A = P.anim;
  var M = window.PIGGY_MESSAGES;
  var params = new URLSearchParams(location.search);

  var ctx = P.scenes.mount();
  var stage = document.getElementById('stage');
  var gate = document.getElementById('gate');
  var endEl = document.getElementById('end');

  // copy from messages.js
  document.getElementById('gate-label').textContent = M.gate.start;
  document.getElementById('gate-note').textContent = M.gate.note;
  document.querySelector('.gate__title').textContent = M.gate.title;
  if (M.gate.kicker) document.querySelector('.gate__kicker').textContent = M.gate.kicker;
  document.getElementById('replay-label').textContent = M.ending.replay;

  /* sound toggle */
  var soundBtn = document.getElementById('sound-btn');
  function paintSound() {
    var muted = P.audio.isMuted();
    soundBtn.querySelector('.sound-btn__icon').textContent = muted ? '🔇' : '🔊';
    soundBtn.querySelector('.sound-btn__label').textContent = muted ? M.ui.soundOff : M.ui.soundOn;
  }
  soundBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    P.audio.unlock();
    P.audio.setMuted(!P.audio.isMuted());
    paintSound();
    // mouse/touch: drop focus so Space/Enter go back to driving the film (keyboard users keep focus)
    if (e.detail > 0) soundBtn.blur();
  });
  soundBtn.addEventListener('pointerdown', function (e) {
    e.stopPropagation();
  });
  paintSound();

  function showEnd() {
    endEl.hidden = false;
  }
  document.getElementById('replay-btn').addEventListener('click', function () {
    endEl.hidden = true;
    P.audio.unlock();
    P.scenes.restart(0, { onEnd: showEnd });
  });

  var list = P.scenes.list();
  var startId = params.get('scene');
  var startAt = startId ? P.scenes.indexOf(startId) : -1;

  if (startAt >= 0 || params.has('nogate')) {
    // test/debug entry: no gate, jump straight in
    gate.remove();
    P.scenes.prepare(list[Math.max(0, startAt)]);
    P.scenes.run(Math.max(0, startAt), { alreadySetUp: true, onEnd: showEnd });
    return;
  }

  // Normal entry: build the first scene (sleeping pig) behind the gate.
  stage.classList.add('is-gated');
  P.scenes.prepare(list[0]);
  var started = false;
  function begin() {
    if (started) return;
    started = true;
    P.audio.unlock();
    stage.classList.remove('is-gated');
    gate.classList.add('is-out');
    setTimeout(function () {
      gate.remove();
    }, 700);
    P.scenes.run(0, { alreadySetUp: true, onEnd: showEnd });
  }
  document.getElementById('gate-btn').addEventListener('click', begin);
  gate.addEventListener('pointerdown', function (e) {
    e.stopPropagation();
  });
  window.addEventListener('keydown', function (e) {
    // a focused button (sound toggle, the gate button itself) handles its own keys
    if (e.target && e.target.closest && e.target.closest('button')) return;
    if (!started && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      begin();
    }
  });

  window.addEventListener('error', function (e) {
    if (window.console) console.error('Piggy error:', e.message);
  });
  // expose for tests
  P.debug = { ctx: ctx, A: A };
})();

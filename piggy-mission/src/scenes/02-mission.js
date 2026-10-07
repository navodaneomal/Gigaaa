/*
 * Scene 2: Mission. A game-style HUD: MISSION DETECTED, the dossier card,
 * "Operation: Make Her Believe in Herself.", a hilariously bad salute,
 * the objective, the LET'S GO button, suiting up, MISSION START.
 */
(function () {
  'use strict';
  var P = window.PIGGY;
  var A = P.anim;

  P.scenes.css(
    'mission',
    [
      '.mc{left:7%;right:7%;top:calc(11% + var(--safe-top));display:flex;flex-direction:column;align-items:center;gap:calc(var(--u)*10);transition:transform .6s cubic-bezier(.22,1,.36,1),opacity .4s ease;transform-origin:50% 0}',
      '.mc.is-compact{transform:scale(.62) translateY(calc(var(--u)*-12));opacity:.55}',
      '.mc.is-gone{transform:scale(.4) translateY(calc(var(--u)*-60));opacity:0}',
      '.mc__card{width:100%;max-width:calc(var(--u)*300);padding:calc(var(--u)*14) calc(var(--u)*16) calc(var(--u)*12);border-radius:calc(var(--u)*16);',
      'background:linear-gradient(160deg,rgba(29,42,102,.92),rgba(10,16,48,.92));border:1px solid rgba(95,211,179,.55);',
      'box-shadow:0 0 0 calc(var(--u)*3) rgba(95,211,179,.12),0 calc(var(--u)*18) calc(var(--u)*40) rgba(0,0,0,.45),inset 0 0 calc(var(--u)*30) rgba(95,211,179,.08);',
      'transform:scale(.7) skewX(-6deg);opacity:0;transition:transform .5s cubic-bezier(.2,1.5,.4,1),opacity .2s ease;position:relative;overflow:hidden}',
      '.mc__card.is-in{transform:none;opacity:1}',
      '.mc__card::before{content:"";position:absolute;left:0;right:0;height:30%;top:-30%;background:linear-gradient(to bottom,transparent,rgba(95,211,179,.18),transparent);animation:mcScan 2.4s linear infinite}',
      '.mc__badge{display:inline-block;padding:calc(var(--u)*3) calc(var(--u)*9);border-radius:999px;background:#ffcf4d;color:#1b1630;font:800 max(11px,calc(var(--u)*13))/1.2 var(--font-sport);letter-spacing:.14em;text-transform:uppercase}',
      '.mc__name{margin:calc(var(--u)*8) 0 calc(var(--u)*10);font:italic 800 calc(var(--u)*40)/.95 var(--font-sport);text-transform:uppercase;color:#fff;text-shadow:calc(var(--u)*2) calc(var(--u)*2) 0 #e66f92}',
      '.mc__rows{margin:0;display:grid;gap:calc(var(--u)*6)}',
      '.mc__row{display:flex;justify-content:space-between;gap:calc(var(--u)*10);padding-top:calc(var(--u)*6);border-top:1px dashed rgba(255,255,255,.18);opacity:0;transform:translateX(calc(var(--u)*-10));transition:opacity .25s ease,transform .35s ease}',
      '.mc__row.is-in{opacity:1;transform:none}',
      '.mc__row dt{font:600 max(11px,calc(var(--u)*14))/1.2 var(--font-sport);letter-spacing:.16em;text-transform:uppercase;color:#9fb0e8}',
      '.mc__row dd{margin:0;font:800 max(11px,calc(var(--u)*16))/1.2 var(--font-sport);letter-spacing:.06em;text-transform:uppercase;color:#fff;text-align:right}',
      '.mc__row.is-status dd{color:#5fd3b3;text-shadow:0 0 calc(var(--u)*10) rgba(95,211,179,.6)}',
      '.mc__row.is-status.is-in dd{animation:mcBlink .5s steps(2) 3}',
      '.mc-op{color:#ffcf4d!important}',
      '.mc-go{left:50%;bottom:calc(var(--u)*150 + var(--safe-bottom));transform:translateX(-50%) scale(.6);opacity:0;transition:transform .45s cubic-bezier(.2,1.6,.4,1),opacity .2s ease}',
      '.mc-go.is-in{transform:translateX(-50%) scale(1);opacity:1}',
      '.mc-go button{pointer-events:auto;min-height:56px;padding:0 calc(var(--u)*28);border:0;border-radius:999px;background:linear-gradient(180deg,#ffe08a,#ffbf2e);color:#1b1630;',
      'font:italic 800 calc(var(--u)*24)/1 var(--font-sport);letter-spacing:.06em;text-transform:uppercase;box-shadow:0 calc(var(--u)*8) 0 #c98a0c,0 calc(var(--u)*18) calc(var(--u)*30) rgba(255,191,46,.35);cursor:pointer;animation:breathe 1.6s ease-in-out infinite;white-space:nowrap}',
      '.mc-go button:active{transform:translateY(calc(var(--u)*4));box-shadow:0 calc(var(--u)*4) 0 #c98a0c}',
      '@keyframes mcScan{to{top:130%}}',
      '@keyframes mcBlink{50%{opacity:.2}}',
    ].join('')
  );

  function setup(ctx) {
    ctx.backdrop('#090f2e', '#1b2160');
    ctx.art(
      // radar rings & glow behind the pig
      '<circle cx="180" cy="470" r="260" fill="url(#msGlow)"/>' +
        '<g fill="none" stroke="#5fd3b3" opacity="0.14">' +
        '<circle cx="180" cy="470" r="70"/><circle cx="180" cy="470" r="140"/><circle cx="180" cy="470" r="210"/><circle cx="180" cy="470" r="280"/>' +
        '<path d="M180 160V780M-120 470H480"/></g>' +
        // perspective grid floor
        '<g stroke="#5fd3b3" opacity="0.22" stroke-width="1">' +
        gridLines() +
        '</g>' +
        '<rect x="-400" y="560" width="1160" height="500" fill="url(#msFloorFade)"/>',
      { depth: 0.7 }
    );
    var d = ctx.svg.querySelector('defs');
    if (!d.querySelector('#msGlow')) {
      d.insertAdjacentHTML(
        'beforeend',
        '<radialGradient id="msGlow"><stop offset="0" stop-color="#5fd3b3" stop-opacity="0.22"/><stop offset="1" stop-color="#5fd3b3" stop-opacity="0"/></radialGradient>' +
          '<linearGradient id="msFloorFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2160" stop-opacity="0"/><stop offset="1" stop-color="#090f2e" stop-opacity="0.9"/></linearGradient>'
      );
    }
    // sweeping radar arm
    var sweep = ctx.art('<path d="M180 470L180 230A240 240 0 0 1 350 300Z" fill="#5fd3b3" opacity="0.07"/>', { layer: 'bg' });
    ctx.loop(function (dt, clock) {
      sweep.setAttribute('transform', 'rotate(' + ((clock * 50) % 360).toFixed(1) + ' 180 470)');
    });

    var pig = ctx.pig;
    pig.outfit(false);
    pig.wear('shades', false);
    pig.place(180, 600, { scale: 0.95, facing: 1 });
    pig.express('surprised', 0);
    pig.pose({ tailWag: 0.5 }, 0);
    pig.setMode('idle');
  }

  function gridLines() {
    var out = '';
    for (var i = -10; i <= 10; i++) out += '<path d="M180 470L' + (180 + i * 70) + ' 1000"/>';
    for (var j = 0; j < 8; j++) {
      var y = 470 + Math.pow(j / 7, 1.8) * 520;
      out += '<path d="M-400 ' + y.toFixed(1) + 'H760"/>';
    }
    return out;
  }

  async function play(ctx) {
    var T = ctx.T.mission;
    var M = ctx.M.mission;
    var pig = ctx.pig;

    ctx.flash('#ffffff', 420);
    ctx.sfx('scan');
    ctx.music('tense', 0.4);
    pig.boing(0.8);

    // MISSION DETECTED (typed)
    var detected = ctx.caption('⚠ ' + M.detected, { style: 'hud', pos: 'top', stay: true });
    await detected;
    await ctx.wait(T.scan);
    detected.hide();

    // the dossier card
    var rows = M.rows
      .map(function (r, i) {
        return '<div class="mc__row' + (i === M.rows.length - 1 ? ' is-status' : '') + '"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + (i === M.rows.length - 1 ? ' ✓' : '') + '</dd></div>';
      })
      .join('');
    var panel = ctx.panel(
      '<div class="mc__card" role="group" aria-label="Mission card"><span class="mc__badge">' + esc(M.badge) + '</span>' +
        '<div class="mc__name">' + esc(M.player) + '</div><dl class="mc__rows">' + rows + '</dl></div>',
      'mc'
    );
    var card = panel.querySelector('.mc__card');
    await ctx.wait(60);
    card.classList.add('is-in');
    ctx.sfx('whoosh');
    ctx.camera.shake(3, 200);
    await ctx.wait(500);
    var rowEls = panel.querySelectorAll('.mc__row');
    for (var i = 0; i < rowEls.length; i++) {
      rowEls[i].classList.add('is-in');
      ctx.sfx(i === rowEls.length - 1 ? 'ding' : 'blip');
      await ctx.wait(T.rowStagger);
    }
    pig.express('happy', 160);
    pig.hop(10);
    await ctx.wait(700);

    // Operation… + the terrible salute
    panel.classList.add('is-compact');
    ctx.music('playful', 0.8);
    pig.express('determined', 200);
    var op = ctx.caption(M.operation, { style: 'line', pos: 'center', className: 'mc-op', enter: 'rise', stay: true });
    await op;
    await ctx.wait(500);
    await pig.badSalute(function () {
      ctx.sfx('bonk');
      var h = pig.head();
      ctx.fx.impact(h.x + 2, h.y + 14, { size: 2.2 });
      ctx.fx.sparkle(h.x + 2, h.y + 10, { count: 4, color: '#fff6e9' });
    });
    await ctx.wait(T.salute * 0.15);
    op.hide();

    // Objective
    var label = ctx.caption(M.objectiveLabel, { style: 'label', pos: 'center', stay: true, enter: 'pop' });
    await ctx.wait(350);
    var obj = ctx.caption(M.objective, { style: 'line', pos: 'center', stay: true, enter: 'rise', y: 49 });
    ctx.sfx('sparkle');
    pig.express('proud', 200);
    await ctx.wait(T.objectiveHold);

    // LET'S GO
    var go = ctx.panel('<button type="button" class="mc-go__btn">' + esc(M.button) + '</button>', 'mc-go');
    var btn = go.querySelector('button');
    await ctx.wait(40);
    go.classList.add('is-in');
    ctx.sfx('pop');
    await ctx.tap({ target: btn, label: '' });
    btn.disabled = true;
    go.classList.remove('is-in');
    label.hide();
    obj.hide();
    panel.classList.add('is-gone');

    // suit up
    ctx.sfx('powerUp');
    var suit = ctx.caption(M.suitUp, { style: 'hud', pos: 'top', stay: true });
    ctx.camera.to({ x: 180, y: 470, zoom: 1.35 }, 600, 'inOutCubic');
    await spinChange(ctx);
    suit.hide();
    pig.express('proud', 160);
    ctx.fx.sparkle(180, 500, { count: 12, power: 1.4 });
    await Promise.all([pig.jump({ height: 34, armsUp: true }), ctx.camera.to({ x: 180, y: 400, zoom: 1.1 }, 500, 'outCubic')]);
    pig.thumbsUp('R');

    // MISSION START.
    ctx.sfx('whistle', 0, 0.5);
    ctx.flash('#ffffff', 300);
    ctx.camera.shake(5, 260);
    await ctx.caption(M.start, { style: 'title', pos: 'upper', enter: 'slam', hold: T.startHold });
  }

  // a quick spinning costume change: each spin pops a piece of kit on
  async function spinChange(ctx) {
    var pig = ctx.pig;
    var pieces = [['headband', 'pop'], ['jersey', 'zip'], ['shoes', 'pop'], ['wristbands', 'pop']];
    for (var i = 0; i < pieces.length; i++) {
      await A.tween(pig.p, { facing: -1 }, 90, 'inQuad');
      if (i === 0) pig.express('happy', 60);
      pig.wear(pieces[i][0]);
      ctx.sfx(pieces[i][1]);
      ctx.fx.puff(180, 598, { count: 5, color: '#c9d6ff' });
      await A.tween(pig.p, { facing: 1 }, 90, 'outQuad');
      await ctx.wait(70);
    }
    pig.outfit(true);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  P.scenes.register({ id: 'mission', order: 20, title: 'Mission', transition: 'cut', setup: setup, play: play });
})();

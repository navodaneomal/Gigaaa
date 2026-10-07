/*
 * Renders the letter, poem, final decision and ending from data/letter.js.
 */
(function () {
  'use strict';
  var RFC = (window.RFC = window.RFC || {});
  var fx = RFC.fx;
  var audio = RFC.audio;

  var rendered = false;
  var observer = null;
  var opts = {};

  function inline(s) {
    return fx
      .escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  // A deliberately tiny Markdown subset; see the comment at the top of data/letter.js.
  function renderBody(src) {
    var out = [];
    var lines = src.replace(/\r/g, '').trim().split('\n');
    var para = [];
    var i = 0;
    function flush() {
      if (para.length) {
        out.push('<p class="js-reveal">' + inline(para.join(' ')) + '</p>');
        para = [];
      }
    }
    while (i < lines.length) {
      var line = lines[i].trim();
      if (!line) {
        flush();
      } else if (line.indexOf(':::') === 0) {
        flush();
        var cards = [];
        i++;
        while (i < lines.length && lines[i].trim().indexOf(':::') !== 0) {
          var raw = lines[i].trim();
          if (raw) {
            var bar = raw.indexOf('|');
            cards.push({ title: raw.slice(0, bar).trim(), text: raw.slice(bar + 1).trim() });
          }
          i++;
        }
        out.push(
          '<div class="quarters">' +
            cards
              .map(function (c, n) {
                return (
                  '<section class="quarter js-reveal" style="transition-delay:' + n * 0.12 + 's">' +
                  '<h4 class="quarter__head"><span>' + inline(c.title) + '</span><span>Q' + (n + 1) + '</span></h4>' +
                  '<p>' + inline(c.text) + '</p></section>'
                );
              })
              .join('') +
            '</div>'
        );
      } else if (line.indexOf('### ') === 0) {
        flush();
        out.push('<h3 class="js-reveal">' + inline(line.slice(4)) + '</h3>');
      } else if (line.indexOf('> ') === 0) {
        flush();
        out.push('<p class="callout js-reveal">' + inline(line.slice(2)) + '</p>');
      } else if (line.indexOf('^ ') === 0) {
        flush();
        out.push('<p class="standalone js-reveal">' + inline(line.slice(2)) + '</p>');
      } else if (line === '---') {
        flush();
        out.push('<hr />');
      } else {
        para.push(line);
      }
      i++;
    }
    flush();
    return out.join('\n');
  }

  function renderPoem(poem) {
    var stanzas = poem.stanzas
      .replace(/\r/g, '')
      .trim()
      .split(/\n\s*\n/)
      .map(function (st) {
        return '<p class="poem__stanza js-reveal">' + st.trim().split('\n').map(inline).join('<br />') + '</p>';
      })
      .join('');
    return (
      '<section class="poem" aria-labelledby="poem-title">' +
      '<p class="poem__eyebrow js-reveal">A poem, filed without permission</p>' +
      '<h3 class="poem__title js-reveal" id="poem-title">' + inline(poem.title) + '</h3>' +
      stanzas +
      fx.svgIcon('i-ball', 'poem__orn') +
      '</section>'
    );
  }

  function renderDecision(d) {
    var html = '<section class="decision" aria-labelledby="decision-title">';
    html += '<h3 class="decision__title js-reveal" id="decision-title">' + inline(d.title) + '</h3>';
    d.lines.forEach(function (l, n) {
      html += '<p class="decision__line js-reveal" style="transition-delay:' + (0.15 + n * 0.35) + 's">' + inline(l) + '</p>';
    });
    html += '<p class="decision__line decision__line--pause js-reveal">' + inline(d.pauseLine) + '</p>';
    html += '<p class="decision__line js-reveal" style="transition-delay:1.6s">' + inline(d.afterPause) + '</p>';
    html += '<p class="decision__final js-reveal" style="transition-delay:2.4s">' + inline(d.final) + '</p>';
    return html + '</section>';
  }

  function renderApproval(a) {
    return (
      '<section class="approval" aria-label="Referee approval">' +
      '<div class="stamp" data-stamp>' + inline(a.stamp) + '</div>' +
      '<p class="ps js-reveal">' + inline(a.ps) + '</p>' +
      '<p class="ps ps--small js-reveal" style="transition-delay:.5s">' + inline(a.small) + '</p>' +
      '<p class="signoff js-reveal" style="transition-delay:1s">' + inline(a.signoff) + '</p>' +
      '</section>'
    );
  }

  function renderEnding(e) {
    return (
      '<section class="ending" aria-labelledby="ending-title">' +
      '<svg class="court-sketch" viewBox="0 0 200 360" aria-hidden="true" focusable="false">' +
      '<rect x="10" y="10" width="180" height="340" rx="1" pathLength="1"/>' +
      '<line x1="10" y1="123.3" x2="190" y2="123.3" pathLength="1"/>' +
      '<line x1="10" y1="236.7" x2="190" y2="236.7" pathLength="1"/>' +
      '<circle cx="100" cy="180" r="6" pathLength="1"/>' +
      '<path d="M42 10A58 58 0 0 0 158 10" pathLength="1"/>' +
      '<path d="M42 350A58 58 0 0 1 158 350" pathLength="1"/></svg>' +
      '<div class="ending__inner">' +
      '<button class="ending__whistle" type="button" data-ending-whistle aria-label="The referee’s whistle">' + fx.svgIcon('i-whistle', '') + '</button>' +
      '<p class="ending__eyebrow">' + inline(e.eyebrow) + '</p>' +
      '<h2 class="ending__title" id="ending-title">' + inline(e.title) + '</h2>' +
      '<p class="ending__sub">' + inline(e.sub) + '</p>' +
      '<div class="ending__actions">' +
      '<button class="btn btn--gold" type="button" data-replay>Replay from the start</button>' +
      '<button class="btn-link" type="button" data-top>Read the letter again</button>' +
      '</div></div></section>'
    );
  }

  function render(root) {
    if (rendered) return;
    var L = window.RFC_LETTER;
    if (!L) {
      root.innerHTML = '<p style="padding:24px">The letter seems to have gone missing. Please check data/letter.js.</p>';
      return;
    }
    root.innerHTML =
      '<article class="letter-paper" aria-labelledby="letter-title">' +
      '<header class="letter-head">' +
      '<h2 id="letter-title" tabindex="-1">The unofficial part</h2>' +
      '<dl>' +
      '<div class="letter-head__row"><dt>From</dt><dd>' + inline(L.from) + '</dd></div>' +
      '<div class="letter-head__row"><dt>To</dt><dd>' + inline(L.to) + '</dd></div>' +
      '<div class="letter-head__row"><dt>Re</dt><dd>' + inline(L.subject) + '</dd></div>' +
      '</dl></header>' +
      '<div class="letter-body">' +
      '<p class="salutation">' + inline(L.salutation) + '</p>' +
      renderBody(L.body) +
      '</div>' +
      renderPoem(L.poem) +
      renderDecision(L.decision) +
      renderApproval(L.approval) +
      '</article>' +
      renderEnding(L.ending);
    rendered = true;

    var scene = root.closest('.scene');
    var stamp = root.querySelector('[data-stamp]');
    var ending = root.querySelector('.ending');
    var stamped = false;
    var ended = false;

    // Scroll-in reveals (skipped entirely for reduced motion or old browsers,
    // so the text is never hidden behind an animation).
    var revealables = root.querySelectorAll('.js-reveal');
    if (fx.reduced() || !('IntersectionObserver' in window)) {
      revealables.forEach(function (n) {
        n.classList.remove('js-reveal');
      });
    }
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            var t = en.target;
            if (t === stamp && !stamped) {
              stamped = true;
              stamp.style.opacity = '';
              stamp.classList.add('is-shown');
              setTimeout(function () {
                audio.stamp();
              }, 120);
            } else if (t === ending && !ended) {
              ended = true;
              ending.classList.add('is-in');
              setTimeout(function () {
                audio.whistle(0.7, 0, { volume: 0.1 });
              }, 400);
            } else {
              t.classList.add('is-in');
            }
            observer.unobserve(t);
          });
        },
        { root: scene, rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
      );
      root.querySelectorAll('.js-reveal').forEach(function (n) {
        observer.observe(n);
      });
      if (!fx.reduced()) stamp.style.opacity = '0';
      observer.observe(stamp);
      observer.observe(ending);
    } else {
      stamp.classList.add('is-shown');
      ending.classList.add('is-in');
    }

    // reading progress bar
    var bar = document.getElementById('read-progress');
    var ticking = false;
    scene.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          var max = scene.scrollHeight - scene.clientHeight;
          bar.style.setProperty('--p', max > 0 ? Math.min(1, scene.scrollTop / max).toFixed(4) : 0);
        });
      },
      { passive: true }
    );

    root.querySelector('[data-ending-whistle]').addEventListener('click', function (e) {
      audio.unlock();
      audio.whistle(0.3);
      fx.toast('Stop disturbing official equipment.');
      var b = e.currentTarget.querySelector('svg');
      if (b && b.animate && !fx.reduced()) {
        b.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-16deg) scale(1.1)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], { duration: 500 });
      }
    });
    root.querySelector('[data-replay]').addEventListener('click', function () {
      audio.tap();
      if (opts.onReplay) opts.onReplay();
    });
    root.querySelector('[data-top]').addEventListener('click', function () {
      audio.tap();
      scene.scrollTo({ top: 0, behavior: fx.reduced() ? 'auto' : 'smooth' });
      var h = document.getElementById('letter-title');
      if (h) h.focus({ preventScroll: true });
    });
  }

  function enter(root) {
    render(root);
    var paper = root.querySelector('.letter-paper');
    if (paper) {
      paper.classList.remove('is-arriving');
      void paper.offsetWidth;
      paper.classList.add('is-arriving');
    }
    var h = document.getElementById('letter-title');
    if (h) h.focus({ preventScroll: true });
  }

  RFC.letter = {
    init: function (o) {
      opts = o || {};
    },
    render: render,
    enter: enter,
    _renderBody: renderBody,
  };
})();

/* Hausaufgaben module: homework sets typed from the course book, solutions hidden until asked for.
   Loaded after assets/vocab.js and data/hausaufgaben.js. No dependencies; works from file:// and offline.
   Set data: _build/content_hausaufgaben/*.json, built into data/hausaufgaben.json + .js by
   _build/build_hausaufgaben.py (schema in _build/README.md).
   Routing: hausaufgaben.html lists all sets; hausaufgaben.html#<set-id> opens one set.
   In item text, ___ is a gap (an input box). Text fields allow **bold** and *italic*.
   Typed answers are kept in this browser only (localStorage), per set.
*/
(function () {
  'use strict';

  var SETS = (window.VOCAB_HAUSAUFGABEN || []).slice().sort(function (a, b) { return b.no - a.no; });
  var app = document.getElementById('app');
  var Speech = window.VocabApp ? window.VocabApp.speech : null;
  var GAP = /___/g;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function md(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  }
  function plain(s) { return String(s || '').replace(/\*+/g, ''); }
  function date(iso) {
    var d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function sayBtn(text) {
    if (!Speech || !Speech.ok) return '';
    return '<button type="button" class="say" data-say="' + esc(plain(text)) + '" aria-label="Read aloud" title="Read aloud">🔊</button>';
  }
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(new RegExp(String.fromCharCode(223), 'g'), 'ss')
      .replace(/[.,!?;:"'«»„“”…]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function itemCount(set) {
    var n = 0;
    set.pages.forEach(function (p) { p.exercises.forEach(function (e) { n += e.items.length; }); });
    return n;
  }

  /* ---------- saved answers (this browser only) ---------- */
  function load(set) {
    try { return JSON.parse(localStorage.getItem('deutsch-ha-' + set.id)) || {}; } catch (e) { return {}; }
  }
  function save(set, data) {
    try { localStorage.setItem('deutsch-ha-' + set.id, JSON.stringify(data)); } catch (e) { /* private mode: answers just aren't kept */ }
  }

  /* ---------- building blocks ---------- */
  function gapText(text, key, it, saved) {
    var n = 0;
    return md(text).replace(GAP, function () {
      var i = n++;
      var longest = Math.max.apply(null, it.gaps[i].map(function (a) { return a.length; }));
      var w = Math.min(Math.max(longest + 2, 6), 44);
      return '<input type="text" class="ha-gap" data-gap="' + i + '" style="width:' + w + 'ch" autocomplete="off" autocapitalize="off" spellcheck="false"' +
        ' aria-label="Gap ' + (i + 1) + ' in item ' + esc(it.label) + '" value="' + esc((saved[key] || [])[i] || '') + '">';
    });
  }
  function exampleBlock(ex) {
    if (!ex || !ex.length) return '';
    return '<div class="ha-example"><span class="ha-tag">Example (from the book)</span>' + ex.map(function (l) {
      return '<div class="ha-line">' + (l.label ? '<span class="ha-label">' + esc(l.label) + '</span>' : '') + '<div>' +
        (l.lead ? '<div class="ha-lead">' + md(l.lead) + '</div>' : '') + '<div>' + md(l.text) + '</div></div></div>';
    }).join('') + '</div>';
  }
  function boxBlock(e) {
    if (!e.box) return '';
    var used = e.box_used || [];
    return '<div class="ha-box" aria-label="Word box">' + e.box.map(function (w, i) {
      return used.indexOf(i) >= 0 ? '<s class="ha-chip used" title="Used in the example">' + esc(w) + '</s>' : '<span class="ha-chip">' + esc(w) + '</span>';
    }).join('') + '</div>';
  }
  function phrasesBlock(e) {
    if (!e.phrases) return '';
    return '<div class="ha-phrases">' + e.phrases.map(function (p) { return '<div>' + md(p) + '</div>'; }).join('') + '</div>';
  }
  function itemBlock(set, it, key, saved) {
    var body;
    if (it.gaps) body = '<div class="ha-text">' + gapText(it.text, key, it, saved) + '</div>';
    else body = (it.text ? '<div class="ha-text">' + md(it.text) + '</div>' : '') +
      '<textarea class="ha-write" rows="' + (it.open ? 4 : 2) + '" data-gap="0" autocapitalize="sentences" spellcheck="false" aria-label="Your answer to item ' + esc(it.label) + '" placeholder="' +
      (it.open ? 'Write your excuse …' : 'Write the sentence …') + '">' + esc((saved[key] || [])[0] || '') + '</textarea>';
    return '<li class="ha-item" data-key="' + key + '">' +
      '<span class="ha-label">' + esc(it.label) + '</span><div class="ha-body">' +
      (it.lead ? '<div class="ha-lead">' + md(it.lead) + '</div>' : '') + body +
      '<button type="button" class="btn ha-reveal no-print" aria-expanded="false">Show solution</button>' +
      '<div class="ha-solution" hidden></div></div></li>';
  }
  function solutionHtml(set, it, values) {
    var verdict = '';
    if (it.open) {
      verdict = '<div class="ha-verdict">Model answer: yours can be completely different.</div>';
    } else {
      var typed = values.some(function (v) { return v.trim(); });
      var ok;
      if (it.gaps) {
        ok = it.gaps.every(function (acc, i) {
          return acc.some(function (a) { return norm(a) === norm(values[i]); });
        });
      } else {
        ok = (it.accept || []).concat([plain(it.solution)]).some(function (a) { return norm(a) === norm(values[0]); });
      }
      if (ok) verdict = '<div class="ha-verdict ok">✓ Correct.</div>';
      else if (typed) verdict = '<div class="ha-verdict compare">Compare with the solution. Other correct German counts too.</div>';
    }
    var src = (set.sources || []).filter(function (s) { return s.id === it.source; })[0];
    return verdict +
      '<div class="ha-sol-de">' + md(it.solution) + sayBtn(it.solution) + '</div>' +
      '<div class="ha-sol-en">' + md(it.en) + '</div>' +
      '<div class="ha-why">' + md(it.why) + '</div>' +
      (it.check ? '<div class="ha-check">⚠ ' + md(it.check) + '</div>' : '') +
      (src ? '<div class="ha-cite">Rule: <a href="' + esc(src.url) + '" rel="noopener" target="_blank">' + esc(src.title) + '</a></div>' : '');
  }

  /* ---------- views ---------- */
  function listView() {
    document.title = 'Hausaufgaben · German homework';
    if (!SETS.length) { app.innerHTML = '<p>No homework sets yet.</p>'; return; }
    app.innerHTML = '<div class="hub ha-list">' + SETS.map(function (s) {
      return '<a class="hub-card" href="#' + esc(s.id) + '">' +
        '<span class="status ready">Set ' + s.no + ' · ' + itemCount(s) + ' items</span>' +
        '<h2>' + md(s.title) + '</h2><p class="ha-en">' + md(s.title_en) + '</p>' +
        '<p>' + esc(s.book) + ' · ' + s.pages.map(function (p) { return esc(p.page); }).join(', ') + '</p>' +
        '<p class="ha-date">Added ' + esc(date(s.added)) + '</p></a>';
    }).join('') + '</div>';
  }

  function setView(set) {
    document.title = set.title + ' · Hausaufgaben';
    var saved = load(set);
    var total = itemCount(set);
    var h = '<p class="crumbs ha-back"><a href="#">← All sets</a></p>' +
      '<div class="ha-head"><span class="status ready">Set ' + set.no + ' · added ' + esc(date(set.added)) + '</span>' +
      '<h2 class="ha-title">' + md(set.title) + '</h2><p class="ha-en">' + md(set.title_en) + '</p>' +
      '<p class="ha-en">' + esc(set.book) + '</p>' +
      '<div class="ha-tools no-print"><button type="button" class="btn ha-all" aria-pressed="false">Show all solutions</button>' +
      '<button type="button" class="btn ha-clear">Clear my answers</button><span class="ha-progress" aria-live="polite"></span></div></div>';
    set.pages.forEach(function (p, pi) {
      h += '<section class="ha-page"><h2><span class="ha-pageno">' + esc(p.page) + '</span> ' + md(p.heading) + '</h2>' +
        (p.heading_en ? '<p class="ha-en">' + md(p.heading_en) + '</p>' : '');
      p.exercises.forEach(function (e, ei) {
        h += '<article class="ha-ex">';
        if (e.instruction) {
          h += '<h3>' + (e.marker ? '<span class="ha-marker">' + esc(e.marker) + '</span>' : '') +
            (e.tag ? '<span class="ha-ref" title="Section or exercise reference printed in the book">' + esc(e.tag) + '</span>' : '') +
            '<span class="ha-no">' + esc(e.no) + '</span> <span>' + md(e.instruction) + '</span></h3>' +
            '<p class="ha-en">' + md(e.instruction_en) + '</p>';
        }
        if (e.part) {
          h += '<p class="ha-part"><b>' + (e.instruction ? '' : esc(e.no) + ' ') + esc(e.part) + '</b> ' + md(e.part_instruction) + '</p>' +
            '<p class="ha-en">' + md(e.part_instruction_en) + '</p>';
        }
        h += boxBlock(e) + phrasesBlock(e) + exampleBlock(e.example) +
          '<ol class="ha-items">' + e.items.map(function (it, ii) { return itemBlock(set, it, pi + '-' + ei + '-' + ii, saved); }).join('') + '</ol></article>';
      });
      h += '</section>';
    });
    h += '<section class="ha-page"><h2>Sources</h2><ul>' + set.sources.map(function (s) {
      return '<li><a href="' + esc(s.url) + '" rel="noopener" target="_blank">' + esc(s.title) + '</a></li>';
    }).join('') + '</ul></section>';
    app.innerHTML = h;

    function find(key) {
      var k = key.split('-');
      return set.pages[+k[0]].exercises[+k[1]].items[+k[2]];
    }
    function values(li) {
      return Array.prototype.map.call(li.querySelectorAll('[data-gap]'), function (el) { return el.value; });
    }
    function progress() {
      var shown = app.querySelectorAll('.ha-reveal[aria-expanded="true"]').length;
      app.querySelector('.ha-progress').textContent = shown ? 'Solutions shown: ' + shown + ' of ' + total : '';
      var all = app.querySelector('.ha-all');
      var on = shown === total;
      all.textContent = on ? 'Hide all solutions' : 'Show all solutions';
      all.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    function reveal(li, show) {
      var it = find(li.getAttribute('data-key'));
      var btn = li.querySelector('.ha-reveal');
      var sol = li.querySelector('.ha-solution');
      var vals = values(li);
      li.querySelectorAll('.ha-gap').forEach(function (inp, i) {
        inp.classList.remove('ok', 'no');
        if (show && inp.value.trim()) {
          inp.classList.add(it.gaps[i].some(function (a) { return norm(a) === norm(inp.value); }) ? 'ok' : 'no');
        }
      });
      if (show) sol.innerHTML = solutionHtml(set, it, vals);
      sol.hidden = !show;
      btn.textContent = show ? 'Hide solution' : 'Show solution';
      btn.setAttribute('aria-expanded', show ? 'true' : 'false');
    }

    app.querySelectorAll('.ha-item').forEach(function (li) {
      li.querySelector('.ha-reveal').addEventListener('click', function () {
        reveal(li, this.getAttribute('aria-expanded') !== 'true');
        progress();
      });
      li.addEventListener('input', function () {
        saved[li.getAttribute('data-key')] = values(li);
        save(set, saved);
      });
      li.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' && ev.target.classList.contains('ha-gap')) { reveal(li, true); progress(); }
      });
    });
    app.querySelector('.ha-all').addEventListener('click', function () {
      var show = this.getAttribute('aria-pressed') !== 'true';
      app.querySelectorAll('.ha-item').forEach(function (li) { reveal(li, show); });
      progress();
    });
    app.querySelector('.ha-clear').addEventListener('click', function () {
      if (!window.confirm('Clear all your answers in this set?')) return;
      saved = {};
      save(set, saved);
      app.querySelectorAll('[data-gap]').forEach(function (el) { el.value = ''; });
      app.querySelectorAll('.ha-item').forEach(function (li) { reveal(li, false); });
      progress();
    });
    progress();
  }

  function route() {
    var id = decodeURIComponent(location.hash.replace(/^#/, ''));
    var set = SETS.filter(function (x) { return x.id === id; })[0];
    if (set) setView(set); else listView();
    window.scrollTo(0, 0);
  }

  app.addEventListener('click', function (ev) {
    var say = ev.target.closest('.say');
    if (say && Speech) Speech.say(say.getAttribute('data-say'));
  });
  window.addEventListener('hashchange', route);
  var tb = document.getElementById('theme-toggle-slot');
  if (tb && window.VocabApp && window.VocabApp.themeButton) tb.appendChild(window.VocabApp.themeButton());
  route();
})();

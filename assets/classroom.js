/* Classroom module: grammar topics from class, numbered in teaching order. Loaded after assets/vocab.js and data/classroom.js.
   No dependencies; works from file:// and offline. Topic data: _build/content_classroom/*.json,
   built into data/classroom.json + .js by _build/build_classroom.py (schema in _build/README.md).
   Routing: classroom.html lists all topics; classroom.html#<topic-id> opens one topic.
   Text fields allow two marks: **bold** (the form being taught) and *italic* (German words in English text).
*/
(function () {
  'use strict';

  var TOPICS = (window.VOCAB_CLASSROOM || []).slice().sort(function (a, b) { return b.number - a.number; });
  var app = document.getElementById('app');
  var Speech = window.VocabApp ? window.VocabApp.speech : null;
  var I = window.I18n || { t: function (k, v, f) { return f != null ? f : k; } };
  function T(k, v, f) { return I.t(k, v, f); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function md(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  }
  function plain(s) { return String(s || '').replace(/\*+/g, ''); }
  function paras(text) {
    return (Array.isArray(text) ? text : [text]).filter(Boolean).map(function (p) { return '<p>' + md(p) + '</p>'; }).join('');
  }
  function date(iso) {
    if (I.date) return I.date(iso);
    var d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function sayBtn(text) {
    if (!Speech || !Speech.ok) return '';
    return '<button type="button" class="say" data-say="' + esc(plain(text)) + '" aria-label="' + esc(T('say')) + '" title="' + esc(T('say')) + '">🔊</button>';
  }

  /* ---------- building blocks ---------- */
  function examples(list) {
    if (!list || !list.length) return '';
    return '<ul class="cr-ex">' + list.map(function (e) {
      return '<li><div class="de">' + md(e.de) + sayBtn(e.de) + '</div><div class="ex-en">' + md(e.en) + '</div>' +
        (e.note ? '<div class="cr-ex-note">' + md(e.note) + '</div>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  function table(t) {
    if (!t) return '';
    return '<div class="cr-table-wrap"><table class="cr-table">' + (t.caption ? '<caption>' + md(t.caption) + '</caption>' : '') +
      '<thead><tr>' + t.head.map(function (h) { return '<th scope="col">' + md(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      t.rows.map(function (r) {
        return '<tr>' + r.map(function (c, i) { return i === 0 ? '<th scope="row">' + md(c) + '</th>' : '<td>' + md(c) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function cite(topic, id) {
    var s = (topic.sources || []).filter(function (x) { return x.id === id; })[0];
    if (!s) return '';
    return '<p class="cr-cite">' + esc(T('cr.source')) + ' <a href="' + esc(s.url) + '" rel="noopener" target="_blank">' + esc(s.title) + '</a></p>';
  }
  function block(topic, r, n) {
    return '<article class="cr-block">' +
      '<h3>' + (n ? '<span class="cr-n">' + n + '</span>' : '') + md(r.title) + '</h3>' +
      paras(r.text) + table(r.table) + examples(r.examples) + cite(topic, r.source) + '</article>';
  }
  function section(id, title, inner) {
    return '<section class="cr-sec" id="' + id + '"><h2>' + esc(title) + '</h2>' + inner + '</section>';
  }

  /* ---------- self-check ---------- */
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(new RegExp(String.fromCharCode(223), 'g'), 'ss')
      .replace(/[.,!?;:"'«»„“”()]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function selfcheck(topic) {
    var sc = topic.selfcheck;
    var types = Object.keys(sc.types).map(function (k) {
      var t = sc.types[k];
      return '<div class="cr-how"><b>' + md(t.label) + '</b>' + paras(t.instruction) +
        '<div class="cr-worked"><span class="cr-tag">' + esc(T('cr.worked')) + '</span>' +
        '<div>' + md(t.example.q) + '</div><div>→ <b>' + md(t.example.a) + '</b></div>' +
        (t.example.why ? '<div class="cr-why">' + md(t.example.why) + '</div>' : '') + '</div></div>';
    }).join('');
    var items = sc.items.map(function (it, i) {
      return '<li class="cr-item" data-i="' + i + '">' +
        '<div class="cr-q"><span class="cr-type">' + md(sc.types[it.type].label) + '</span>' + md(it.q) + '</div>' +
        '<div class="cr-answer-row"><input type="text" class="search cr-input" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="' + esc(T('cr.answer.aria', { n: i + 1 })) + '">' +
        '<button type="button" class="btn cr-check">' + esc(T('cr.check')) + '</button></div>' +
        '<div class="cr-result" hidden></div></li>';
    }).join('');
    return '<p>' + T('cr.sc.intro') + '</p>' +
      types + '<ol class="cr-items">' + items + '</ol>' +
      '<p class="cr-score" aria-live="polite"></p>';
  }
  function wireSelfcheck(topic) {
    var sc = topic.selfcheck;
    var done = {};
    function score() {
      var keys = Object.keys(done);
      var right = keys.filter(function (k) { return done[k]; }).length;
      var el = app.querySelector('.cr-score');
      if (el) el.textContent = keys.length ? T('cr.score', { n: keys.length, total: sc.items.length, right: right }) : '';
    }
    function check(li) {
      var i = +li.getAttribute('data-i');
      var it = sc.items[i];
      var val = li.querySelector('.cr-input').value;
      var res = li.querySelector('.cr-result');
      var ok = it.a.some(function (a) { return norm(a) === norm(val); });
      res.hidden = false;
      res.className = 'cr-result ' + (ok ? 'ok' : 'compare');
      res.innerHTML = (ok ? '<b>' + esc(T('cr.correct')) + '</b> ' : (val.trim() ? '<b>' + esc(T('cr.compare')) + '</b> ' + esc(T('cr.yours')) + ' <i>' + esc(val) + '</i><br>' : '')) +
        (ok && it.a.length === 1 ? '' : esc(T('cr.key')) + ' <b>' + it.a.map(md).join('</b> ' + esc(T('cr.or')) + ' <b>') + '</b>') +
        '<div class="cr-why">' + md(it.why) + '</div>';
      done[i] = ok;
      score();
    }
    app.querySelectorAll('.cr-item').forEach(function (li) {
      li.querySelector('.cr-check').addEventListener('click', function () { check(li); });
      li.querySelector('.cr-input').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') check(li); });
    });
  }

  /* ---------- views ---------- */
  function listView() {
    document.title = T('cr.doc');
    if (!TOPICS.length) { app.innerHTML = '<p>' + esc(T('cr.none')) + '</p>'; return; }
    app.innerHTML = '<div class="hub cr-list">' + TOPICS.map(function (t) {
      return '<a class="hub-card" href="#' + esc(t.id) + '">' +
        '<span class="status ready">' + esc(T('cr.topic', { n: t.number })) + ' · ' + esc(t.level) + '</span>' +
        '<h2>' + md(t.title) + '</h2><p class="cr-en">' + md(t.title_en) + '</p>' +
        '<p>' + md(t.summary) + '</p><p class="cr-date">' + esc(T('cr.added', { d: date(t.added) })) + '</p></a>';
    }).join('') + '</div>';
  }

  function topicView(t) {
    document.title = t.title + ' · ' + T('list.classroom.title');
    var keys = ['purpose', 'logic', 'rules', 'exceptions'];
    if (t.phrases && t.phrases.length) keys.push('phrases');
    if (t.texts && t.texts.length) keys.push('texts');
    keys = keys.concat(['mistakes', 'examples', 'selfcheck']);
    if (t.links && t.links.length) keys.push('links');
    keys.push('sources');
    var toc = keys.map(function (k) { return [k, T('cr.' + k)]; });
    var h = '<p class="crumbs cr-back"><a href="#">' + esc(T('cr.back')) + '</a></p>' +
      '<div class="cr-head"><span class="status ready">' + esc(T('cr.topic', { n: t.number })) + ' · ' + esc(t.level) + '</span>' +
      '<h2 class="cr-title">' + md(t.title) + '</h2><p class="cr-en">' + md(t.title_en) + ' · ' + esc(T('cr.addedLower', { d: date(t.added) })) + '</p>' +
      '<nav class="cr-toc no-print" aria-label="' + esc(T('cr.sec.aria')) + '">' + toc.map(function (s) {
        return '<a class="btn" href="#' + esc(t.id) + '/' + s[0] + '">' + s[1] + '</a>';
      }).join('') + '</nav></div>';
    h += section('purpose', T('cr.purpose'), paras(t.purpose));
    h += section('logic', T('cr.logic'), '<ul class="cr-logic">' + t.logic.map(function (p) { return '<li>' + md(p) + '</li>'; }).join('') + '</ul>');
    h += section('rules', T('cr.rules'), t.rules.map(function (r, i) { return block(t, r, i + 1); }).join(''));
    h += section('exceptions', T('cr.exceptions'), t.exceptions.map(function (r) { return block(t, r); }).join(''));
    if (t.phrases && t.phrases.length) {
      h += section('phrases', T('cr.phrases'), t.phrases.map(function (g) {
        return '<article class="cr-block"><h3>' + md(g.title) + '</h3>' + examples(g.items) + '</article>';
      }).join(''));
    }
    if (t.texts && t.texts.length) {
      h += section('texts', T('cr.texts'), t.texts.map(function (x) {
        return '<article class="cr-block"><h3>' + md(x.title) + '</h3><p class="cr-text-note">' + md(x.note) + '</p>' + examples(x.lines) + '</article>';
      }).join(''));
    }
    h += section('mistakes', T('cr.mistakes'), '<ul class="cr-mistakes">' + t.mistakes.map(function (m) {
      return '<li><div class="wrong">✗ ' + md(m.wrong) + '</div><div class="right">✓ ' + md(m.right) + sayBtn(m.right) + '</div>' +
        '<div class="cr-why">' + md(m.why) + '</div></li>';
    }).join('') + '</ul>');
    h += section('examples', T('cr.examples'), examples(t.examples));
    if (t.later) h += '<aside class="cr-later"><b>' + esc(T('cr.later')) + '</b> ' + md(t.later) + '</aside>';
    h += section('selfcheck', T('cr.selfcheck'), selfcheck(t));
    if (t.links && t.links.length) {
      h += section('links', T('cr.links'), '<ul class="cr-links">' + t.links.map(function (l) {
        return '<li><a href="' + esc(l.href) + '">' + md(l.text) + '</a></li>';
      }).join('') + '</ul>');
    }
    h += section('sources', T('cr.sources'), '<ul>' + t.sources.map(function (s) {
      return '<li><a href="' + esc(s.url) + '" rel="noopener" target="_blank">' + esc(s.title) + '</a>' + (s.note ? ' · ' + md(s.note) : '') + '</li>';
    }).join('') + '</ul>');
    app.innerHTML = h;
    wireSelfcheck(t);
  }

  function route() {
    var hash = decodeURIComponent(location.hash.replace(/^#/, ''));
    var parts = hash.split('/');
    var t = TOPICS.filter(function (x) { return x.id === parts[0]; })[0];
    if (t) {
      var same = current === t.id;
      if (!same) topicView(t); // jumping between sections keeps typed self-check answers
      current = t.id;
      var target = parts[1] && document.getElementById(parts[1]);
      if (target) target.scrollIntoView(); else if (!same) window.scrollTo(0, 0);
    } else {
      current = null;
      listView();
      window.scrollTo(0, 0);
    }
  }
  var current = null;

  app.addEventListener('click', function (ev) {
    var say = ev.target.closest('.say');
    if (say && Speech) Speech.say(say.getAttribute('data-say'));
  });
  window.addEventListener('hashchange', route);
  var tb = document.getElementById('theme-toggle-slot');
  if (tb && window.VocabApp && window.VocabApp.themeButton) tb.appendChild(window.VocabApp.themeButton());
  route();
})();

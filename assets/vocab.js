/* Shared vocab list app for lists A, B and C. No dependencies; works from file://.
   Usage (see _build/README.md):
     VocabApp.init({ list: 'a', data: window.VOCAB_A, themes: window.VOCAB_THEMES,
                     mount: document.getElementById('app'), exportName: 'deutsch-a-core',
                     filters: [ { key: 'domain', label: 'Domain', get: e => e.domain } ] });
*/
(function () {
  'use strict';

  var ESZETT = new RegExp(String.fromCharCode(223), 'g'); // the Eszett letter
  var BATCH = 60;
  var LEVELS = ['A1', 'A2', 'B1', 'above B1', 'not listed'];
  var POS_ORDER = ['noun', 'verb', 'adj', 'adv', 'pron', 'art', 'det', 'num', 'prep', 'contr', 'conj', 'part', 'interj'];
  var POS_LABEL = {
    noun: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb', pron: 'pronoun', art: 'article',
    det: 'determiner', num: 'number', prep: 'preposition', contr: 'prep. + article', conj: 'conjunction',
    part: 'particle', interj: 'interjection'
  };
  var TENSES = [['praesens', 'Präsens'], ['praeteritum', 'Präteritum'], ['perfekt', 'Perfekt'],
    ['plusquamperfekt', 'Plusquamperfekt'], ['futur1', 'Futur I'], ['konjunktiv2', 'Konjunktiv II']];
  var PERSONS = [['ich', 'ich'], ['du', 'du'], ['er', 'er/sie/es'], ['wir', 'wir'], ['ihr', 'ihr'], ['sie', 'sie/Sie']];
  var CASE_LABEL = { nom: 'Nom', akk: 'Akk', dat: 'Dat', gen: 'Gen', none: '' };

  /* ---------- storage (never required) ---------- */
  function load(key, fallback) {
    try { var v = window.localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  /* ---------- colour theme ---------- */
  var THEME_KEY = 'vocab:colour-theme';
  function applyTheme(mode) {
    var root = document.documentElement;
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
    else root.removeAttribute('data-theme');
  }
  applyTheme(load(THEME_KEY, 'auto'));

  function themeButton() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn icon no-print';
    var icons = { auto: '🌓', light: '☀️', dark: '🌙' };
    function paint() {
      var m = load(THEME_KEY, 'auto');
      b.textContent = icons[m] || icons.auto;
      b.title = 'Colour theme: ' + m + ' (click to change)';
      b.setAttribute('aria-label', b.title);
    }
    b.addEventListener('click', function () {
      var order = ['auto', 'light', 'dark'];
      var m = order[(order.indexOf(load(THEME_KEY, 'auto')) + 1) % 3];
      save(THEME_KEY, m); applyTheme(m); paint();
    });
    paint();
    return b;
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fold(s) {
    return String(s || '').toLowerCase().replace(ESZETT, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function levelClass(l) { return l === 'above B1' ? 'up' : (l === 'not listed' ? 'nl' : l); }
  function genderClass(g) { return g ? 'g-' + g : ''; }
  function chipClass(g) { return { m: 'der', f: 'die', n: 'das', mf: 'mf', pl: 'pl' }[g] || ''; }
  function headword(e) { return (e.article ? e.article + ' ' : '') + e.lemma; }
  function spoken(e) {
    if (e.article === 'der/die') return 'der ' + e.lemma + ', die ' + e.lemma;
    return headword(e).replace(/ \/ /g, ', ');
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    for (var k in (attrs || {})) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ---------- speech ---------- */
  var Speech = {
    ok: typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined',
    voice: null,
    pick: function () {
      if (!this.ok) return;
      var vs = window.speechSynthesis.getVoices() || [];
      function find(re) { for (var i = 0; i < vs.length; i++) if (re.test(vs[i].lang)) return vs[i]; return null; }
      this.voice = find(/^de[-_]CH/i) || find(/^de[-_]DE/i) || find(/^de\b/i) || null;
      if (this.onchange) this.onchange();
    },
    say: function (text) {
      if (!this.ok || !text) return;
      var u = new window.SpeechSynthesisUtterance(text);
      u.lang = this.voice ? this.voice.lang : 'de-DE';
      if (this.voice) u.voice = this.voice;
      u.rate = 0.92;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    },
    label: function () {
      if (!this.ok) return 'speech not available in this browser';
      return this.voice ? 'voice: ' + this.voice.name + ' (' + this.voice.lang + ')' : 'voice: browser default (no German voice found)';
    }
  };
  if (Speech.ok) {
    Speech.pick();
    if ('onvoiceschanged' in window.speechSynthesis) window.speechSynthesis.onvoiceschanged = function () { Speech.pick(); };
  }

  /* ---------- card rendering ---------- */
  function sayBtn(text, label) {
    return '<button type="button" class="say" data-say="' + esc(text) + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">🔊</button>';
  }

  function verbBlock(e) {
    var pp = e.principal_parts;
    if (!pp) return '';
    var auxForm = { haben: 'hat', sein: 'ist', 'haben/sein': 'hat/ist' }[e.auxiliary] || '';
    var h = '<div class="verb-line"><span class="pp">' + esc(pp.praesens_er) + ' · ' + esc(pp.praeteritum_er) +
      ' · ' + esc(auxForm) + ' ' + esc(pp.partizip2) + '</span></div>';
    var tags = [];
    if (e.auxiliary) tags.push('Perfekt with ' + e.auxiliary);
    if (e.separable) tags.push('separable' + (e.prefix ? ': ' + e.prefix + '|' + e.lemma.slice(e.prefix.length) : ''));
    if (e.reflexive) tags.push('reflexive');
    (e.governs || []).forEach(function (g) {
      var c = CASE_LABEL[g.case] || '';
      tags.push(g.prep ? g.prep + ' + ' + c : (c ? '+ ' + c : ''));
    });
    tags = tags.filter(Boolean);
    if (tags.length) h += '<div class="tags">' + tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>';
    if (e.conjugation) {
      h += '<details class="conj"><summary>Conjugation tables</summary><div class="conj-grid">';
      TENSES.forEach(function (t) {
        var f = e.conjugation[t[0]];
        if (!f) return;
        h += '<table><caption>' + t[1] + '</caption><tbody>';
        PERSONS.forEach(function (p) { h += '<tr><td>' + p[1] + '</td><td>' + esc(f[p[0]]) + '</td></tr>'; });
        h += '</tbody></table>';
      });
      h += '</div></details>';
    }
    return h;
  }

  function card(e, ctx) {
    var t = ctx.themes[e.theme] || { icon: '•', en: e.theme };
    var rank = '#' + e.position + (e.rank ? ' · DeReWo ' + e.rank : '') + (e.rank_leipzig ? ' · Leipzig ' + e.rank_leipzig : '');
    var h = '<div class="meta"><span class="theme-ico" title="' + esc(t.en) + '" aria-label="theme: ' + esc(t.en) + '">' + t.icon + '</span>' +
      '<span class="level ' + levelClass(e.level) + '" title="CEFR level (Goethe word lists)">' + esc(e.level) + '</span>' +
      '<span class="pos">' + esc(POS_LABEL[e.pos] || e.pos) + '</span>' +
      (e.domain ? '<span class="tag">' + esc(e.domain) + '</span>' : '') +
      '<span class="rank" title="Position in this list · corpus frequency rank">' + esc(rank) + '</span></div>';
    h += '<div class="headword">' + (e.article ? '<span class="chip ' + chipClass(e.gender) + '">' + esc(e.gender === 'pl' ? 'die (Pl.)' : e.article) + '</span>' : '') +
      '<span class="lemma" lang="de">' + esc(e.lemma) + '</span>' + sayBtn(spoken(e), 'Say ' + headword(e)) + '</div>';
    if (e.pos === 'noun' && e.gender !== 'pl') {
      h += '<div class="plural">' + (e.plural ? 'Plural: <span class="chip pl">die</span> <b lang="de">' + esc(e.plural) + '</b>' : 'no plural') + '</div>';
    }
    h += verbBlock(e);
    h += '<div class="en hideable"><ol>' + e.en.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>';
    if (e.note) h += '<div class="note hideable"><span>' + esc(e.note) + '</span></div>';
    if (e.example && e.example.de) {
      h += '<div class="example"><span class="de" lang="de">' + esc(e.example.de) + '</span>' + sayBtn(e.example.de, 'Say the example') +
        '<span class="ex-en hideable"><span>' + esc(e.example.en) + '</span></span></div>';
    }
    var c = el('article', { 'class': 'card ' + genderClass(e.gender), id: e.id }, h);
    return c;
  }

  /* ---------- Anki export ---------- */
  function ankiText(list, listName) {
    var lines = ['#separator:tab', '#html:true', '#tags column:3'];
    list.forEach(function (e) {
      function clean(s) { return esc(String(s || '').replace(/[\t\r\n]+/g, ' ')); }
      var front = clean(headword(e));
      if (e.pos === 'noun' && e.plural && e.gender !== 'pl') front += '<br><small>Pl. die ' + clean(e.plural) + '</small>';
      if (e.principal_parts) {
        var pp = e.principal_parts;
        front += '<br><small>' + clean(pp.praesens_er + ' · ' + pp.praeteritum_er + ' · ' + pp.partizip2) + '</small>';
      }
      var back = clean(e.en.join('; '));
      if (e.example && e.example.de) back += '<br><br><i>' + clean(e.example.de) + '</i><br>' + clean(e.example.en);
      if (e.note) back += '<br><small>' + clean(e.note) + '</small>';
      var tags = ['vocab-' + listName, 'level-' + e.level.replace(/ /g, '-'), 'theme-' + e.theme].join(' ');
      lines.push(front + '\t' + back + '\t' + tags);
    });
    return lines.join('\n') + '\n';
  }
  function download(name, text) {
    var blob = new Blob([text], { type: 'text/tab-separated-values;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  /* ---------- app ---------- */
  function init(cfg) {
    var data = (cfg.data || []).slice();
    var mount = cfg.mount;
    var listId = cfg.list || 'x';
    var STATE_KEY = 'vocab:' + listId + ':state';
    var themes = {};
    var themeOrder = [];
    (cfg.themes || []).forEach(function (t) { themes[t.id] = t; themeOrder.push(t.id); });
    var extra = cfg.filters || [];

    data.forEach(function (e) {
      var parts = [e.lemma, e.article, e.plural, (e.en || []).join(' '), e.note,
        e.example && e.example.de, e.example && e.example.en];
      if (e.principal_parts) for (var k in e.principal_parts) parts.push(e.principal_parts[k]);
      e._s = fold(parts.filter(Boolean).join(' | '));
    });

    var st = Object.assign({ q: '', theme: '', level: '', pos: '', group: '', sort: 'freq', view: 'cards', extra: {} },
      load(STATE_KEY, {}));
    st.testing = false; st.shuffled = null;
    // A link like a-core-1000.html#q=Satz opens the list with that search and no other filters.
    var hashQ = /^#q=(.+)$/.exec(location.hash);
    if (hashQ) {
      st.q = decodeURIComponent(hashQ[1]); st.theme = ''; st.level = ''; st.pos = ''; st.extra = {};
    }

    /* controls */
    var controls = el('div', { 'class': 'controls no-print', role: 'search' });
    var row1 = el('div', { 'class': 'row' });
    var row2 = el('div', { 'class': 'row' });
    controls.appendChild(row1); controls.appendChild(row2);

    var q = el('input', { type: 'search', 'class': 'search', placeholder: 'Search German or English…', 'aria-label': 'Search German or English' });
    q.value = st.q;
    row1.appendChild(q);

    function select(label, options, value) {
      var s = el('select', { 'aria-label': label });
      options.forEach(function (o) {
        var opt = el('option', { value: o[0] }, esc(o[1]));
        s.appendChild(opt);
      });
      s.value = value || '';
      row1.appendChild(s);
      return s;
    }
    function present(get) { var seen = {}; data.forEach(function (e) { var v = get(e); if (v != null && v !== '') seen[v] = (seen[v] || 0) + 1; }); return seen; }

    var tCount = present(function (e) { return e.theme; });
    var sTheme = select('Theme', [['', 'All themes']].concat(themeOrder.filter(function (id) { return tCount[id]; }).map(function (id) {
      return [id, themes[id].icon + ' ' + themes[id].en + ' (' + tCount[id] + ')'];
    })), st.theme);
    var lCount = present(function (e) { return e.level; });
    var sLevel = select('Level', [['', 'All levels']].concat(LEVELS.filter(function (l) { return lCount[l]; }).map(function (l) {
      return [l, l + ' (' + lCount[l] + ')'];
    })), st.level);
    var pCount = present(function (e) { return e.pos; });
    var sPos = select('Part of speech', [['', 'All word types']].concat(POS_ORDER.filter(function (p) { return pCount[p]; }).map(function (p) {
      return [p, POS_LABEL[p] + ' (' + pCount[p] + ')'];
    })), st.pos);
    var sExtra = extra.map(function (f) {
      var c = present(f.get);
      var vals = Object.keys(c).sort();
      return select(f.label, [['', 'All: ' + f.label.toLowerCase()]].concat(vals.map(function (v) { return [v, v + ' (' + c[v] + ')']; })), st.extra[f.key]);
    });

    function select2(label, options, value) {
      var s = el('select', { 'aria-label': label });
      options.forEach(function (o) { s.appendChild(el('option', { value: o[0] }, esc(o[1]))); });
      s.value = value;
      s.style.flex = '0 1 auto';
      row2.appendChild(s);
      return s;
    }
    var sGroup = select2('Group by', [['', 'No grouping'], ['theme', 'Group: theme'], ['level', 'Group: level'], ['pos', 'Group: word type']], st.group);
    var sSort = select2('Sort', [['freq', cfg.orderLabel || 'Sort: frequency'], ['az', 'Sort: A–Z'], ['level', 'Sort: level']], st.sort);

    function button(icon, label, title) {
      var b = el('button', { type: 'button', 'class': 'btn', title: title || label }, '<span aria-hidden="true">' + icon + '</span><span class="lbl">' + esc(label) + '</span>');
      b.setAttribute('aria-label', title || label);
      row2.appendChild(b);
      return b;
    }
    var bView = button('▤', 'Rows', 'Switch between cards and compact rows');
    var bTest = button('🎯', 'Test me', 'Test mode: hide the English, tap a card to reveal');
    bTest.setAttribute('aria-pressed', 'false');
    var bShuffle = button('🔀', 'Shuffle', 'Shuffle the current list (click again to restore order)');
    bShuffle.setAttribute('aria-pressed', 'false');
    var bReveal = button('👁', 'Reveal all', 'Reveal every card');
    bReveal.style.display = 'none';
    var bAnki = button('⬇', 'Export for Anki', 'Download the filtered list as a tab-separated file for Anki');
    row2.appendChild(themeButton());
    var count = el('span', { 'class': 'count', 'aria-live': 'polite' });
    row2.appendChild(count);

    var legendVoice = document.getElementById('voice-status');
    function paintVoice() { if (legendVoice) legendVoice.textContent = '🔊 ' + Speech.label(); }
    Speech.onchange = paintVoice; paintVoice();
    if (!Speech.ok) document.documentElement.classList.add('no-speech');

    var listWrap = el('div', { 'class': 'list' });
    var grid = el('div', { 'class': 'grid' });
    var sentinel = el('div', { 'class': 'sentinel', 'aria-hidden': 'true' });
    var more = el('button', { type: 'button', 'class': 'btn load-more' }, 'Show more');
    listWrap.appendChild(grid); listWrap.appendChild(sentinel); listWrap.appendChild(more);
    mount.appendChild(controls);
    mount.appendChild(listWrap);

    /* filtering */
    var view = [], stream = [], rendered = 0;
    function compute() {
      var words = fold(st.q).split(/\s+/).filter(Boolean);
      view = data.filter(function (e) {
        if (st.theme && e.theme !== st.theme) return false;
        if (st.level && e.level !== st.level) return false;
        if (st.pos && e.pos !== st.pos) return false;
        for (var i = 0; i < extra.length; i++) {
          var want = st.extra[extra[i].key];
          if (want && String(extra[i].get(e)) !== want) return false;
        }
        for (var w = 0; w < words.length; w++) if (e._s.indexOf(words[w]) < 0) return false;
        return true;
      });
      if (st.shuffled) {
        var order = st.shuffled;
        view.sort(function (a, b) { return order[a.id] - order[b.id]; });
      } else if (st.sort === 'az') {
        view.sort(function (a, b) { return a.lemma.localeCompare(b.lemma, 'de', { sensitivity: 'base' }) || a.position - b.position; });
      } else if (st.sort === 'level') {
        view.sort(function (a, b) { return LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.position - b.position; });
      } else {
        view.sort(function (a, b) { return a.position - b.position; });
      }
      stream = [];
      if (st.group) {
        var keyOf = { theme: function (e) { return e.theme; }, level: function (e) { return e.level; }, pos: function (e) { return e.pos; } }[st.group];
        var orderList = { theme: themeOrder, level: LEVELS, pos: POS_ORDER }[st.group];
        var buckets = {};
        view.forEach(function (e) { var k = keyOf(e); (buckets[k] = buckets[k] || []).push(e); });
        orderList.concat(Object.keys(buckets).filter(function (k) { return orderList.indexOf(k) < 0; })).forEach(function (k) {
          if (!buckets[k]) return;
          var label = st.group === 'theme' ? (themes[k] ? themes[k].icon + ' ' + themes[k].en : k) : (st.group === 'pos' ? POS_LABEL[k] || k : k);
          stream.push({ head: label, n: buckets[k].length });
          buckets[k].forEach(function (e) { stream.push({ e: e }); });
        });
      } else {
        stream = view.map(function (e) { return { e: e }; });
      }
    }
    var ctx = { themes: themes };
    function renderMore(all) {
      var frag = document.createDocumentFragment();
      var stop = all ? stream.length : Math.min(stream.length, rendered + BATCH);
      for (; rendered < stop; rendered++) {
        var it = stream[rendered];
        if (it.head) frag.appendChild(el('h2', { 'class': 'group-head' }, esc(it.head) + ' <span class="n">' + it.n + '</span>'));
        else frag.appendChild(card(it.e, ctx));
      }
      grid.appendChild(frag);
      more.style.display = rendered < stream.length ? '' : 'none';
    }
    function refresh() {
      compute();
      grid.innerHTML = '';
      rendered = 0;
      if (!view.length) grid.appendChild(el('p', { 'class': 'empty' }, 'No words match. Clear the search or filters.'));
      renderMore(false);
      count.textContent = view.length + ' of ' + data.length + ' words';
      mount.classList.toggle('view-rows', st.view === 'rows');
      bView.querySelector('.lbl').textContent = st.view === 'rows' ? 'Cards' : 'Rows';
      setTimeout(maybeMore, 16);
      save(STATE_KEY, { q: st.q, theme: st.theme, level: st.level, pos: st.pos, group: st.group, sort: st.sort, view: st.view, extra: st.extra });
    }

    var timer;
    q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { st.q = q.value; refresh(); }, 120); });
    sTheme.addEventListener('change', function () { st.theme = sTheme.value; refresh(); });
    sLevel.addEventListener('change', function () { st.level = sLevel.value; refresh(); });
    sPos.addEventListener('change', function () { st.pos = sPos.value; refresh(); });
    sExtra.forEach(function (s, i) { s.addEventListener('change', function () { st.extra[extra[i].key] = s.value; refresh(); }); });
    sGroup.addEventListener('change', function () { st.group = sGroup.value; refresh(); });
    sSort.addEventListener('change', function () { st.sort = sSort.value; st.shuffled = null; bShuffle.setAttribute('aria-pressed', 'false'); refresh(); });
    bView.addEventListener('click', function () { st.view = st.view === 'rows' ? 'cards' : 'rows'; refresh(); });
    bTest.addEventListener('click', function () {
      st.testing = !st.testing;
      mount.classList.toggle('testing', st.testing);
      bTest.setAttribute('aria-pressed', String(st.testing));
      bReveal.style.display = st.testing ? '' : 'none';
      Array.prototype.forEach.call(grid.querySelectorAll('.card.revealed'), function (c) { c.classList.remove('revealed'); });
    });
    bReveal.addEventListener('click', function () {
      renderMore(true);
      Array.prototype.forEach.call(grid.querySelectorAll('.card'), function (c) { c.classList.add('revealed'); });
    });
    bShuffle.addEventListener('click', function () {
      if (st.shuffled) { st.shuffled = null; bShuffle.setAttribute('aria-pressed', 'false'); }
      else {
        var ids = shuffle(data.map(function (e) { return e.id; }));
        st.shuffled = {}; ids.forEach(function (id, i) { st.shuffled[id] = i; });
        bShuffle.setAttribute('aria-pressed', 'true');
        if (st.group) { st.group = ''; sGroup.value = ''; }
      }
      refresh();
    });
    bAnki.addEventListener('click', function () {
      var parts = [cfg.exportName || ('vocab-' + listId)];
      if (st.theme) parts.push(st.theme);
      if (st.level) parts.push(st.level.replace(/ /g, '-'));
      if (st.pos) parts.push(st.pos);
      if (st.q) parts.push('search');
      download(parts.join('_') + '.tsv', ankiText(view, listId));
    });
    more.addEventListener('click', function () { renderMore(false); });
    grid.addEventListener('click', function (ev) {
      var say = ev.target.closest('.say');
      if (say) { Speech.say(say.getAttribute('data-say')); return; }
      if (st.testing) {
        var c = ev.target.closest('.card');
        if (c && ev.target.closest('.hideable, .headword, .meta, .lemma')) c.classList.toggle('revealed');
        else if (c && !ev.target.closest('details')) c.classList.add('revealed');
      }
    });
    // Lazy rendering: add a batch whenever the end of the list comes within ~1.5 screens.
    var ticking = false;
    function maybeMore() {
      ticking = false;
      if (rendered < stream.length && sentinel.getBoundingClientRect().top < window.innerHeight * 2.5) {
        renderMore(false);
        setTimeout(maybeMore, 16);
      }
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; setTimeout(maybeMore, 50); }
    }, { passive: true });
    window.addEventListener('resize', function () { setTimeout(maybeMore, 16); });
    window.addEventListener('beforeprint', function () { renderMore(true); });

    refresh();
    return { refresh: refresh, data: data };
  }

  /* ---------- hub ---------- */
  function hub(cfg) {
    var mount = cfg.mount;
    (cfg.lists || []).forEach(function (l) {
      var ready = l.status === 'ready';
      var tag = ready ? 'a' : 'div';
      var c = el(tag, ready ? { 'class': 'hub-card', href: l.href } : { 'class': 'hub-card coming', 'aria-disabled': 'true' });
      c.innerHTML = '<span class="big" aria-hidden="true">' + esc(l.icon || '📘') + '</span>' +
        '<span class="status ' + (ready ? 'ready' : '') + '">' + (ready ? esc((l.count || '') + ' ' + (l.count_label || 'words').replace(l.count === 1 ? /s$/ : /$^/, '')) : 'coming') + '</span>' +
        '<h2>' + esc(l.letter ? l.letter + ' · ' + l.title : l.title) + '</h2><p>' + esc(l.description || '') + '</p>';
      mount.appendChild(c);
    });
    var tb = document.getElementById('theme-toggle-slot');
    if (tb) tb.appendChild(themeButton());
  }

  window.VocabApp = { init: init, hub: hub, applyTheme: applyTheme, themeButton: themeButton, speech: Speech, ankiText: ankiText };
})();

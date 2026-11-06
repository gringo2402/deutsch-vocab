/* Base language (English, Italiano, Français, Español). Loaded first on every page, after data/ui.js.
   No dependencies; works from file:// and offline.
   - I18n.t(key, vars) looks up an interface string (data/ui.js, built by _build/i18n.py from
     _build/i18n/ui.<lang>.json); missing strings fall back to English.
   - I18n.load(module) writes the <script> for data/<module>.<lang>.js when that language exists, else the English
     file, and remembers the fallback (lists A-C until they are translated).
   - Elements with data-i18n="key" get the translated HTML; data-i18n-attr="attr:key;attr:key" translates attributes.
   - The menu is added to the top of every page header; the choice is stored per device (localStorage).
*/
(function () {
  'use strict';

  var UI = window.VOCAB_UI || { langs: [{ code: 'en', label: 'English', flag: '🇬🇧', locale: 'en-GB' }], strings: { en: {} }, available: {} };
  var KEY = 'vocab:lang';
  var codes = UI.langs.map(function (l) { return l.code; });

  function stored() { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } }
  var lang = stored();
  if (codes.indexOf(lang) < 0) {
    var nav = String(navigator.language || 'en').slice(0, 2).toLowerCase();
    lang = codes.indexOf(nav) >= 0 ? nav : 'en';
  }
  var info = UI.langs[codes.indexOf(lang)];
  document.documentElement.setAttribute('lang', lang);

  function t(key, vars, fallback) {
    var s = (UI.strings[lang] || {})[key];
    if (s == null) s = (UI.strings.en || {})[key];
    if (s == null) s = fallback != null ? fallback : key;
    if (vars) s = String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }
  function n(base, count, vars) {
    var v = { n: count };
    for (var k in (vars || {})) v[k] = vars[k];
    return t(base + (count === 1 ? '.one' : ''), v);
  }
  function date(iso, opts) {
    var d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString(info.locale, opts || { day: 'numeric', month: 'long', year: 'numeric' });
  }

  var fallback = {};
  function load(module) {
    var av = UI.available[module] || ['en'];
    var own = lang !== 'en' && av.indexOf(lang) >= 0;
    if (lang !== 'en' && !own) fallback[module] = true;
    document.write('<script src="data/' + module + (own ? '.' + lang : '') + '.js"><\/script>');
  }

  function apply(root) {
    if (lang === 'en') return;
    var strings = UI.strings[lang] || {};
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-i18n]'), function (el) {
      var s = strings[el.getAttribute('data-i18n')];
      if (s != null) el.innerHTML = s;
    });
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-i18n-attr]'), function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':');
        var s = strings[p[1]];
        if (p.length === 2 && s != null) el.setAttribute(p[0], s);
      });
    });
  }

  function picker() {
    var wrap = document.createElement('label');
    wrap.className = 'lang-pick no-print';
    wrap.title = t('lang.label');
    var s = document.createElement('select');
    s.setAttribute('aria-label', t('lang.label'));
    UI.langs.forEach(function (l) {
      var o = document.createElement('option');
      o.value = l.code;
      o.textContent = l.flag + ' ' + l.label;
      s.appendChild(o);
    });
    s.value = lang;
    s.addEventListener('change', function () {
      try { window.localStorage.setItem(KEY, s.value); } catch (e) { /* private mode: the choice lasts until reload */ }
      var u = new URL(window.location.href);
      if (!stored()) u.searchParams.set('lang', s.value);
      window.location.replace(u.toString());
    });
    wrap.appendChild(document.createTextNode('🌐 '));
    wrap.appendChild(s);
    return wrap;
  }
  // Without storage (private mode) the choice travels in ?lang= for that page view.
  var q = /[?&]lang=(\w\w)/.exec(window.location.search);
  if (q && codes.indexOf(q[1]) >= 0 && q[1] !== lang && !stored()) {
    lang = q[1]; info = UI.langs[codes.indexOf(lang)];
    document.documentElement.setAttribute('lang', lang);
  }

  document.addEventListener('DOMContentLoaded', function () {
    apply(document);
    var head = document.querySelector('.site-head .wrap');
    if (head) {
      var bar = document.createElement('div');
      bar.className = 'lang-bar no-print';
      bar.appendChild(picker());
      head.insertBefore(bar, head.firstChild);
    }
  });

  window.I18n = {
    lang: lang, info: info, langs: UI.langs, t: t, n: n, date: date, load: load, apply: apply, picker: picker,
    isFallback: function (module) { return !!fallback[module]; }
  };
})();

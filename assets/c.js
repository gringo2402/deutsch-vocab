/* List C extras (business & tech). Loaded after assets/vocab.js; no dependencies, works from file://.
   - TOPICS: business sub-themes (each maps onto a shared theme from data/themes.json). The build script
     _build/c_build_list.py reads the JSON between the TOPICS / END markers, so keep it valid JSON.
   - Decorates the cards that vocab.js renders: topic chip, work-typical meter (keyness), compound parts,
     verb partners ("collocations"), and badges for set phrases and words that are also in list A.
   - Extends the search index with parts, verb partners and topic names.
*/
(function () {
  'use strict';

  var TOPICS = /*TOPICS*/{
    "meetings":   {"icon": "🗓️", "en": "Meetings & communication", "theme": "talk"},
    "projects":   {"icon": "📋", "en": "Projects & planning", "theme": "work"},
    "finance":    {"icon": "💰", "en": "Finance & accounting", "theme": "work"},
    "sales":      {"icon": "🛒", "en": "Sales, marketing & purchasing", "theme": "work"},
    "hr":         {"icon": "👥", "en": "HR & careers", "theme": "work"},
    "legal":      {"icon": "📜", "en": "Legal & contracts", "theme": "law"},
    "company":    {"icon": "🏢", "en": "Company & strategy", "theme": "work"},
    "infra":      {"icon": "🖥️", "en": "IT infrastructure", "theme": "tech"},
    "software":   {"icon": "🧑‍💻", "en": "Software development", "theme": "tech"},
    "data":       {"icon": "🔐", "en": "Data & security", "theme": "tech"},
    "style":      {"icon": "✨", "en": "Describing work", "theme": "quality"},
    "connectors": {"icon": "🔗", "en": "Connectors & set phrases", "theme": "function"}
  }/*END*/;

  var ESZETT = new RegExp(String.fromCharCode(223), 'g');
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fold(s) {
    return String(s || '').toLowerCase().replace(ESZETT, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function label(id) { return TOPICS[id] ? TOPICS[id].en : id; }

  function start(data, mount) {
    var byId = {};
    data.forEach(function (e) { byId[e.id] = e; });

    // keyness quintiles -> 1..5 dots
    var ks = data.map(function (e) { return e.keyness; }).sort(function (a, b) { return a - b; });
    var cuts = [0.2, 0.4, 0.6, 0.8].map(function (q) { return ks[Math.floor(q * (ks.length - 1))]; });
    function dots(k) { var n = 1; cuts.forEach(function (c) { if (k > c) n++; }); return n; }

    // search: add compound parts, verb partners and topic name
    data.forEach(function (e) {
      var extra = [e.parts, label(e.topic)];
      (e.collocations || []).forEach(function (c) { extra.push(c.de, c.en); });
      e._s = (e._s || '') + ' | ' + fold(extra.filter(Boolean).join(' | '));
    });

    function decorate(card) {
      if (card.getAttribute('data-c')) return;
      var e = byId[card.id];
      if (!e) return;
      card.setAttribute('data-c', '1');
      var t = TOPICS[e.topic] || { icon: '•', en: e.topic };
      var meta = card.querySelector('.meta');
      if (meta) {
        var rank = meta.querySelector('.rank');
        var n = dots(e.keyness);
        var tip = 'How typical of work texts: ' + n + ' of 5 (keyness ' + e.keyness + '; ' + e.domain_pm +
          ' per million words in business/IT Wikipedia vs ' + e.general_pm + ' in general German)';
        var html = '<span class="tag c-topic" title="Topic">' + t.icon + ' ' + esc(t.en) + '</span>' +
          (e.phrase ? '<span class="tag c-phrase">set phrase</span>' : '') +
          (e.also_in_a ? '<span class="tag c-in-a" title="Also in list A (core 1,000)">also in A</span>' : '') +
          '<span class="c-key" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">' +
          '<span class="on">' + new Array(n + 1).join('●') + '</span>' + new Array(6 - n).join('○') + '</span>';
        var frag = document.createElement('span');
        frag.innerHTML = html;
        while (frag.firstChild) meta.insertBefore(frag.firstChild, rank);
      }
      var head = card.querySelector('.headword');
      if (e.parts && head) {
        var p = document.createElement('div');
        p.className = 'c-parts';
        p.setAttribute('lang', 'de');
        p.title = 'Built from these parts';
        p.innerHTML = '🧩 ' + e.parts.split('·').map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('<i>·</i>');
        head.parentNode.insertBefore(p, head.nextSibling);
      }
      if (e.collocations && e.collocations.length) {
        var c = document.createElement('div');
        c.className = 'c-coll';
        c.innerHTML = '<div class="c-coll-h">Use it with</div><ul>' + e.collocations.map(function (x) {
          return '<li><span class="de" lang="de">' + esc(x.de) + '</span>' +
            '<span class="hideable"><span>' + esc(x.en) + '</span></span></li>';
        }).join('') + '</ul>';
        var ex = card.querySelector('.example');
        card.insertBefore(c, ex || null);
      }
    }

    function scan(root) {
      Array.prototype.forEach.call((root || mount).querySelectorAll('article.card:not([data-c])'), decorate);
    }
    scan();
    if (window.MutationObserver) {
      new MutationObserver(function () { scan(); }).observe(mount, { childList: true, subtree: true });
    }
  }

  window.VocabC = { topics: TOPICS, label: label, start: start };
})();

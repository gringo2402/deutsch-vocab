/* List B (verbs) extras, loaded after assets/vocab.js. No dependencies; works from file://.
   - Rich principal-parts strip on every card: er-form · Präteritum · auxiliary chip (haben teal / sein amber) + Partizip II,
     separable prefix highlighted, inseparable prefix underlined; tap the strip to open the conjugation tables.
   - Section switch (Core 200 / Business & tech 300 / All) driving the shared "Section" filter.
   - "Drill parts" mode: hides principal parts, tags and tables until the card is tapped.
   - Anki export for list B with the principal parts on the back (replaces the shared export button's action).
   Usage: BVerbs.init({ data: window.VOCAB_B, mount: el, app: <VocabApp.init result>, filters: [...same as VocabApp] })
*/
(function () {
  'use strict';
  var ESZETT = new RegExp(String.fromCharCode(223), 'g');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fold(s) {
    return String(s || '').toLowerCase().replace(ESZETT, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function auxClass(a) { return a === 'sein' ? 'aux-sein' : (a === 'haben' ? 'aux-haben' : 'aux-both'); }
  function auxChip(e) {
    var form = { haben: 'hat', sein: 'ist', 'haben/sein': 'hat/ist' }[e.auxiliary] || '';
    return '<span class="chip ' + auxClass(e.auxiliary) + '" title="Perfekt with ' + esc(e.auxiliary) + '">' + esc(form) + '</span>';
  }

  /* Highlight the separable prefix inside a form. Works for "umsetzen", "umgesetzt", "setzt um". */
  function markSep(form, prefix) {
    var f = esc(form);
    if (!prefix) return f;
    var p = esc(prefix);
    if (form.indexOf(prefix + ' ') === -1 && form.slice(-(prefix.length + 1)) === ' ' + prefix) {
      return f.slice(0, f.length - p.length) + '<span class="pfx">' + p + '</span>';
    }
    var compact = prefix.replace(/ /g, '');
    if (form.indexOf(compact) === 0) return '<span class="pfx">' + esc(compact) + '</span>' + esc(form.slice(compact.length));
    return f;
  }
  function markInsep(form, prefix) {
    var f = esc(form);
    if (!prefix || form.indexOf(prefix) !== 0) return f;
    return '<span class="ipfx">' + esc(prefix) + '</span>' + f.slice(esc(prefix).length);
  }
  /* "freut" -> "freut sich", "stellt vor" -> "stellt sich vor" (reflexive verbs; principal parts are stored without it) */
  function withSich(e, form) {
    if (!e.reflexive) return form;
    var w = form.split(' ');
    return [w[0], 'sich'].concat(w.slice(1)).join(' ');
  }
  function mark(e, form) {
    if (e.separable) return markSep(form, e.prefix);
    if (e.inseparable_prefix) return markInsep(form, e.inseparable_prefix);
    return esc(form);
  }

  function strip(e) {
    var pp = e.principal_parts;
    function part(label, html) { return '<span class="pp-part"><small>' + label + '</small><b lang="de">' + html + '</b></span>'; }
    return '<div class="pp-strip" role="button" tabindex="0" aria-label="Principal parts; open the conjugation tables">' +
      part('er/sie/es', mark(e, withSich(e, pp.praesens_er))) + '<span class="sep">·</span>' +
      part('Präteritum', mark(e, withSich(e, pp.praeteritum_er))) + '<span class="sep">·</span>' +
      part('Perfekt', auxChip(e) + ' ' + (e.reflexive ? 'sich ' : '') + mark(e, pp.partizip2)) +
      '<span class="open-hint" aria-hidden="true">tables ▾</span></div>';
  }

  function enhance(card, e) {
    if (card.getAttribute('data-b')) return;
    card.setAttribute('data-b', '1');
    card.classList.add(auxClass(e.auxiliary));
    var lemma = card.querySelector('.lemma');
    if (lemma) {
      lemma.innerHTML = (e.reflexive ? '<span class="refl">sich</span>' : '') + mark(e, e.lemma);
    }
    var vl = card.querySelector('.verb-line');
    if (vl) {
      var wrap = document.createElement('div');
      wrap.innerHTML = strip(e);
      vl.parentNode.replaceChild(wrap.firstChild, vl);
    }
    var tags = card.querySelector('.tags');
    if (tags && e.separable) {
      var compact = e.prefix.replace(/ /g, '');
      Array.prototype.forEach.call(tags.querySelectorAll('.tag'), function (t) {
        if (t.textContent.indexOf('separable') === 0) t.textContent = 'separable: ' + compact + '|' + e.lemma.slice(compact.length);
      });
    }
    if (tags && e.inseparable_prefix) {
      var it = document.createElement('span');
      it.className = 'tag';
      it.textContent = 'inseparable: ' + e.inseparable_prefix + '-';
      tags.appendChild(it);
    }
    if (tags && e.pattern) {
      var pt = document.createElement('div');
      pt.className = 'pattern';
      pt.innerHTML = 'Pattern: <b lang="de">' + esc(e.pattern) + '</b>';
      tags.parentNode.insertBefore(pt, tags.nextSibling);
    }
    var det = card.querySelector('details.conj');
    if (det) {
      var sum = det.querySelector('summary');
      if (sum) sum.textContent = 'Conjugation tables (6 tenses)';
      var src = document.createElement('div');
      src.className = 'srcnote';
      src.textContent = e.forms_source === 'generated' ? (e.forms_note || 'Some forms generated by rule.') :
        'Forms: Wiktionary (via kaikki.org).' + (e.konjunktiv2_note ? ' ' + e.konjunktiv2_note : '');
      det.appendChild(src);
    }
  }

  function ankiText(list) {
    function clean(s) { return esc(String(s || '').replace(/[\t\r\n]+/g, ' ')); }
    var lines = ['#separator:tab', '#html:true', '#tags column:3'];
    list.forEach(function (e) {
      var pp = e.principal_parts;
      var front = clean(pp.infinitiv);
      var aux = { haben: 'hat', sein: 'ist', 'haben/sein': 'hat/ist' }[e.auxiliary];
      var back = clean(e.en.join('; '));
      back += '<br><br><b>' + clean(withSich(e, pp.praesens_er) + ' · ' + withSich(e, pp.praeteritum_er) + ' · ' + aux + ' ' +
        (e.reflexive ? 'sich ' : '') + pp.partizip2) + '</b>';
      var bits = [];
      if (e.separable) bits.push('separable: ' + e.prefix.replace(/ /g, '') + '|' + e.lemma.slice(e.prefix.replace(/ /g, '').length));
      else if (e.inseparable_prefix) bits.push('inseparable: ' + e.inseparable_prefix + '-');
      if (e.pattern) bits.push(e.pattern);
      if (bits.length) back += '<br><small>' + clean(bits.join(' · ')) + '</small>';
      if (e.example && e.example.de) back += '<br><br><i>' + clean(e.example.de) + '</i><br>' + clean(e.example.en);
      if (e.note) back += '<br><small>' + clean(e.note) + '</small>';
      var tags = ['vocab-b', 'b-' + e.set, 'level-' + e.level.replace(/ /g, '-'), 'theme-' + e.theme, 'aux-' + e.auxiliary.replace('/', '-')].join(' ');
      lines.push(front + '\t' + back + '\t' + tags);
    });
    return lines.join('\n') + '\n';
  }
  function download(name, text) {
    var blob = new Blob([text], { type: 'text/tab-separated-values;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  function init(cfg) {
    var data = cfg.data || [];
    var mount = cfg.mount;
    var byId = {};
    data.forEach(function (e) { byId[e.id] = e; });
    var controls = mount.querySelector('.controls');
    var grid = mount.querySelector('.grid');
    if (!controls || !grid) return;

    function enhanceAll(root) {
      Array.prototype.forEach.call((root || grid).querySelectorAll('article.card:not([data-b])'), function (c) {
        if (byId[c.id]) enhance(c, byId[c.id]);
      });
    }
    enhanceAll();
    new MutationObserver(function () { enhanceAll(); }).observe(grid, { childList: true });

    /* tap the strip: open/close tables (or reveal in drill mode) */
    grid.addEventListener('click', function (ev) {
      var s = ev.target.closest('.pp-strip');
      var c = ev.target.closest('.card');
      if (!c) return;
      if (mount.classList.contains('drill-pp') && !c.classList.contains('pp-shown')) {
        if (!ev.target.closest('.say')) { c.classList.add('pp-shown'); ev.stopPropagation(); }
        return;
      }
      if (s) {
        var d = c.querySelector('details.conj');
        if (d) d.open = !d.open;
      }
    }, true);
    grid.addEventListener('keydown', function (ev) {
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList && ev.target.classList.contains('pp-strip')) {
        ev.preventDefault(); ev.target.click();
      }
    });

    /* find shared controls */
    var selects = Array.prototype.slice.call(controls.querySelectorAll('select'));
    function byLabel(l) { for (var i = 0; i < selects.length; i++) if (selects[i].getAttribute('aria-label') === l) return selects[i]; return null; }
    var search = controls.querySelector('input.search');
    var row2 = controls.querySelectorAll('.row')[1];
    var sSection = byLabel('Section');

    /* section switch */
    var head = document.getElementById('section-switch');
    if (head && sSection) {
      var opts = [['', 'All 500'], ['Core 200', '⭐ Core 200'], ['Business & tech 300', '💼 Business & tech 300']];
      var btns = opts.map(function (o) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'btn'; b.textContent = o[1];
        b.addEventListener('click', function () {
          sSection.value = o[0];
          sSection.dispatchEvent(new Event('change'));
          paint();
        });
        head.appendChild(b);
        return b;
      });
      var paint = function () { btns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(sSection.value === opts[i][0])); }); };
      sSection.addEventListener('change', paint);
      paint();
    }

    /* drill parts button */
    if (row2) {
      var bDrill = document.createElement('button');
      bDrill.type = 'button'; bDrill.className = 'btn';
      bDrill.title = 'Drill principal parts: hide er-form, Präteritum, Perfekt and tables until you tap the card';
      bDrill.setAttribute('aria-label', bDrill.title);
      bDrill.setAttribute('aria-pressed', 'false');
      bDrill.innerHTML = '<span aria-hidden="true">🧩</span><span class="lbl">Drill parts</span>';
      var anchor = row2.querySelector('.count');
      row2.insertBefore(bDrill, anchor && anchor.previousSibling ? anchor.previousSibling : anchor);
      bDrill.addEventListener('click', function () {
        var on = !mount.classList.contains('drill-pp');
        mount.classList.toggle('drill-pp', on);
        bDrill.setAttribute('aria-pressed', String(on));
        Array.prototype.forEach.call(grid.querySelectorAll('.card.pp-shown'), function (c) { c.classList.remove('pp-shown'); });
      });
    }

    /* Anki export with principal parts on the back: same filters as the page */
    var bAnki = null;
    Array.prototype.forEach.call(controls.querySelectorAll('button'), function (b) {
      if (/Anki/.test(b.getAttribute('aria-label') || '')) bAnki = b;
    });
    if (bAnki) {
      bAnki.addEventListener('click', function (ev) {
        ev.stopImmediatePropagation(); ev.preventDefault();
        var words = fold(search ? search.value : '').split(/\s+/).filter(Boolean);
        var want = { theme: (byLabel('Theme') || {}).value, level: (byLabel('Level') || {}).value, pos: (byLabel('Part of speech') || {}).value };
        var extra = (cfg.filters || []).map(function (f) { var s = byLabel(f.label); return [f, s ? s.value : '']; });
        var list = data.filter(function (e) {
          if (want.theme && e.theme !== want.theme) return false;
          if (want.level && e.level !== want.level) return false;
          if (want.pos && e.pos !== want.pos) return false;
          for (var i = 0; i < extra.length; i++) if (extra[i][1] && String(extra[i][0].get(e)) !== extra[i][1]) return false;
          var s = e._s || fold(e.lemma + ' ' + e.en.join(' '));
          for (var w = 0; w < words.length; w++) if (s.indexOf(words[w]) < 0) return false;
          return true;
        });
        var parts = [cfg.exportName || 'deutsch-b-verbs'];
        extra.forEach(function (x) { if (x[1]) parts.push(fold(x[1]).replace(/[^a-z0-9]+/g, '-')); });
        if (want.theme) parts.push(want.theme);
        if (want.level) parts.push(want.level.replace(/ /g, '-'));
        if (words.length) parts.push('search');
        download(parts.join('_') + '.tsv', ankiText(list));
      }, true);
    }
  }

  window.BVerbs = { init: init, ankiText: ankiText, markSep: markSep };
})();

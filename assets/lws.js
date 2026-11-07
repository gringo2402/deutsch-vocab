/* Lernwortschatz extras. Loaded after assets/vocab.js; no dependencies, works from file://.
   Data: data/lws[.<lang>].js (word entries in the shared list schema) and data/lws_meta[.<lang>].js (batches and
   tips), built by _build/build_lws.py and _build/i18n.py from _build/content_lws/*.json (schema in _build/README.md).
   - Decorates the cards that vocab.js renders: the headword as the book prints it, section and exercise
     reference, "also in A/B/C" links, word-field tag, a badge when the example is not from the book.
   - Renders the batches' tips (small tasks from the book) above the list, answers hidden until asked.
   - Filter values are language-neutral (lesson number, batch number); show() turns them into labels.
   Notes and tips allow *italic* for German words.
*/
(function () {
  'use strict';

  var META = [];
  var LIST_PAGE = { a: 'a-core-1000.html', b: 'b-verbs.html', c: 'c-business-tech.html' };
  var I = window.I18n || { t: function (k, v, f) { return f != null ? f : k; } };
  function T(k, v, f) { return I.t(k, v, f); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function md(s) { return esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>'); }
  function meta() { return window.VOCAB_LWS_META || META; }
  function short(iso) { return I.date ? I.date(iso, { day: 'numeric', month: 'short', year: 'numeric' }) : iso; }

  function lessonValue(e) { return String(e.lesson); }
  function lessonShow(v) {
    var b = meta().filter(function (x) { return String(x.lesson) === v; })[0] || {};
    return T('lws.lesson', { n: v }) + (b.lesson_title ? ' · ' + b.lesson_title : '');
  }
  function batchValue(e) { return String(e.batch); }
  function batchShow(v) {
    var b = meta().filter(function (x) { return String(x.batch) === v; })[0] || {};
    return T('lws.batch', { n: v, d: b.added ? short(b.added) : '' });
  }

  function tips(list, box) {
    if (!box) return;
    list = list.slice().sort(function (a, b) { return a.lesson - b.lesson || a.batch - b.batch; }).filter(function (b) { return b.tips && b.tips.length; });
    box.innerHTML = list.map(function (b) {
      return b.tips.map(function (t) {
        return '<details class="lws-tip"><summary>💡 ' + esc(T('lws.tip')) + ' · ' + esc(T('lws.lesson', { n: b.lesson })) + ': <span lang="de">' + md(t.text) + '</span></summary>' +
          '<p class="lws-tip-en">' + md(t.text_en) + '</p>' +
          '<p lang="de"><span class="lws-tag">' + esc(T('lws.example')) + '</span> ' + md(t.example) + '</p>' +
          '<button type="button" class="btn lws-show" aria-expanded="false">' + esc(T('lws.showAnswer')) + '</button>' +
          '<div class="lws-answer" hidden><p lang="de">' + t.answer.map(esc).join(', ') + ' …</p>' +
          (t.note ? '<p class="lws-tip-note">' + md(t.note) + '</p>' : '') + '</div></details>';
      }).join('');
    }).join('');
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('.lws-show');
      if (!b) return;
      var a = b.nextElementSibling;
      a.hidden = !a.hidden;
      b.textContent = a.hidden ? T('lws.showAnswer') : T('lws.hideAnswer');
      b.setAttribute('aria-expanded', String(!a.hidden));
    });
  }

  function start(data, metaList, mount, tipBox) {
    META = metaList || [];
    var byId = {};
    data.forEach(function (e) { byId[e.id] = e; });
    tips(META, tipBox);

    function decorate(card) {
      if (card.getAttribute('data-lws')) return;
      var e = byId[card.id];
      if (!e) return;
      card.setAttribute('data-lws', '1');
      var m = card.querySelector('.meta');
      if (m) {
        var html = '<span class="tag lws-sec" title="' + esc(T('lws.sec.t')) + '">' + esc(e.ref ? e.ref + ' · ' : '') + esc(e.section) + '</span>' +
          (e.group ? '<span class="tag lws-group" title="' + esc(T('lws.group.t')) + '">' + esc(e.group) + '</span>' : '') +
          (e.also_in || []).map(function (x) {
            var L = x.list.toUpperCase();
            return '<a class="tag lws-also" href="' + LIST_PAGE[x.list] + '#q=' + encodeURIComponent(e.lemma) + '" title="' + esc(T('lws.also.t', { L: L })) + '">' + esc(T('lws.also', { L: L })) + '</a>';
          }).join('');
        var frag = document.createElement('span');
        frag.innerHTML = html;
        var rank = m.querySelector('.rank');
        while (frag.firstChild) m.insertBefore(frag.firstChild, rank);
      }
      var head = card.querySelector('.headword');
      if (head && e.book) {
        var p = document.createElement('div');
        p.className = 'lws-book';
        p.setAttribute('lang', 'de');
        p.title = T('lws.book.t');
        p.innerHTML = '📖 ' + esc(e.book);
        head.parentNode.insertBefore(p, head.nextSibling);
      }
      var note = card.querySelector('.note > span');
      if (note && e.note) note.innerHTML = md(e.note);
      var ex = card.querySelector('.example');
      if (ex && e.own_example) {
        var badge = document.createElement('span');
        badge.className = 'lws-own';
        badge.textContent = T('lws.own');
        ex.appendChild(badge);
      }
    }
    function scan() {
      Array.prototype.forEach.call(mount.querySelectorAll('article.card:not([data-lws])'), decorate);
    }
    scan();
    if (window.MutationObserver) new MutationObserver(scan).observe(mount, { childList: true, subtree: true });
  }

  window.VocabLWS = { start: start, lessonValue: lessonValue, lessonShow: lessonShow, batchValue: batchValue, batchShow: batchShow };
})();

/* Lernwortschatz extras. Loaded after assets/vocab.js; no dependencies, works from file://.
   Data: data/lws.js (word entries in the shared list schema) and data/lws_meta.js (batches and tips),
   built by _build/build_lws.py from _build/content_lws/*.json (schema in _build/README.md).
   - Decorates the cards that vocab.js renders: the headword as the book prints it, section and exercise
     reference, "also in A/B/C" links, word-field tag, and a badge when the example is not from the book.
   - Renders the batches' tips (small tasks from the book) above the list, answers hidden until asked.
   Notes and tips allow *italic* for German words.
*/
(function () {
  'use strict';

  var META = [];
  var LIST_PAGE = { a: 'a-core-1000.html', b: 'b-verbs.html', c: 'c-business-tech.html' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function md(s) { return esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>'); }
  function short(iso) {
    var d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function batchOf(e) { return (window.VOCAB_LWS_META || META).filter(function (b) { return b.batch === e.batch; })[0] || {}; }
  function lessonLabel(e) { var b = batchOf(e); return 'Lektion ' + e.lesson + (b.lesson_title ? ' · ' + b.lesson_title : ''); }
  function batchLabel(e) { return 'Batch ' + e.batch + ' · ' + short(e.added); }

  function tips(meta, box) {
    if (!box) return;
    var list = meta.slice().sort(function (a, b) { return b.batch - a.batch; }).filter(function (b) { return b.tips && b.tips.length; });
    box.innerHTML = list.map(function (b) {
      return b.tips.map(function (t, i) {
        return '<details class="lws-tip"><summary>💡 Tipp · Lektion ' + esc(b.lesson) + ': <span lang="de">' + md(t.text) + '</span></summary>' +
          '<p class="lws-tip-en">' + md(t.text_en) + '</p>' +
          '<p lang="de"><span class="lws-tag">Example</span> ' + md(t.example) + '</p>' +
          '<button type="button" class="btn lws-show" data-b="' + b.batch + '" data-i="' + i + '" aria-expanded="false">Show answer</button>' +
          '<div class="lws-answer" hidden><p lang="de">' + t.answer.map(esc).join(', ') + ' …</p>' +
          (t.note ? '<p class="lws-tip-note">' + md(t.note) + '</p>' : '') + '</div></details>';
      }).join('');
    }).join('');
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('.lws-show');
      if (!b) return;
      var a = b.nextElementSibling;
      a.hidden = !a.hidden;
      b.textContent = a.hidden ? 'Show answer' : 'Hide answer';
      b.setAttribute('aria-expanded', String(!a.hidden));
    });
  }

  function start(data, meta, mount, tipBox) {
    META = meta || [];
    var byId = {};
    data.forEach(function (e) { byId[e.id] = e; });
    tips(META, tipBox);

    function decorate(card) {
      if (card.getAttribute('data-lws')) return;
      var e = byId[card.id];
      if (!e) return;
      card.setAttribute('data-lws', '1');
      var meta = card.querySelector('.meta');
      if (meta) {
        var html = '<span class="tag lws-sec" title="Section in the book">' + esc(e.ref ? e.ref + ' · ' : '') + esc(e.section) + '</span>' +
          (e.group ? '<span class="tag lws-group" title="Word field in the book">' + esc(e.group) + '</span>' : '') +
          (e.also_in || []).map(function (x) {
            return '<a class="tag lws-also" href="' + LIST_PAGE[x.list] + '#q=' + encodeURIComponent(e.lemma) + '" title="Also in list ' + x.list.toUpperCase() + '">also in ' + x.list.toUpperCase() + '</a>';
          }).join('');
        var frag = document.createElement('span');
        frag.innerHTML = html;
        var rank = meta.querySelector('.rank');
        while (frag.firstChild) meta.insertBefore(frag.firstChild, rank);
      }
      var head = card.querySelector('.headword');
      if (head && e.book) {
        var p = document.createElement('div');
        p.className = 'lws-book';
        p.setAttribute('lang', 'de');
        p.title = 'As printed in the book';
        p.innerHTML = '📖 ' + esc(e.book);
        head.parentNode.insertBefore(p, head.nextSibling);
      }
      var note = card.querySelector('.note > span');
      if (note && e.note) note.innerHTML = md(e.note);
      var ex = card.querySelector('.example');
      if (ex && e.own_example) {
        var badge = document.createElement('span');
        badge.className = 'lws-own';
        badge.textContent = 'our example, not from the book';
        ex.appendChild(badge);
      }
    }
    function scan() {
      Array.prototype.forEach.call(mount.querySelectorAll('article.card:not([data-lws])'), decorate);
    }
    scan();
    if (window.MutationObserver) new MutationObserver(scan).observe(mount, { childList: true, subtree: true });
  }

  window.VocabLWS = { start: start, lessonLabel: lessonLabel, batchLabel: batchLabel };
})();

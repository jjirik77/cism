/* CISM 5-Day Workshop: shared evidence workbench for hands-on labs (B4, B6, B8).
   Dependency-free. Load before the lab's LAB script runs its workbench, then call:
     EV.create(root, {
       id: 'chg',                         // unique per instance (state key)
       api: api,                          // lab.js workbench API (optional, persists view state)
       panes: [{ id, title, source, cols: [{ k, h, num? }], rows: [ {...} ] }],
       a: 'paneIdA', b: 'paneIdB',        // panes shown first in slots A and B
       intro: 'HTML shown above the panes (optional)'
     })
   Features: two slots (stacked or side by side), each with a pane picker, a text filter
   (space-separated terms, "quoted phrases", -exclusions), sortable columns, and a row count.
   Tools on pane A: match a key column against pane B (flag rows with or without a match),
   look up a pane B column into pane A, and compare two columns of pane A
   (equal, different, later than, more than N days after). Flags show as text, not color alone. */
(function () {
  'use strict';
  var CSS = '' +
    '.ev{font-family:Arial,sans-serif;color:var(--text-secondary)}' +
    '.ev-intro{font-size:.86rem;line-height:1.6;margin:0 0 .8rem}' +
    '.ev-bar{display:flex;flex-wrap:wrap;gap:.5rem .8rem;align-items:center;margin:0 0 .7rem}' +
    '.ev-bar .ev-lab,.ev-tools .ev-lab{font:700 .7rem Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted)}' +
    '.ev-seg{display:inline-flex;border:1px solid var(--navy);border-radius:3px;overflow:hidden}' +
    '.ev-seg button{border:0;background:#fff;color:var(--navy);font:700 .74rem Arial,sans-serif;padding:.4rem .7rem;cursor:pointer}' +
    '.ev-seg button[aria-pressed=true]{background:var(--navy);color:#fff}' +
    '.ev-sbtn{border:1px solid var(--navy);background:#fff;color:var(--navy);font:700 .74rem Arial,sans-serif;padding:.4rem .7rem;border-radius:3px;cursor:pointer}' +
    '.ev-sbtn:hover,.ev-seg button:hover{background:var(--blue-pale)}.ev-seg button[aria-pressed=true]:hover{background:var(--navy-light)}' +
    '.ev-sbtn.pri{background:var(--navy);color:#fff}.ev-sbtn.pri:hover{background:var(--navy-light)}' +
    '.ev button:focus-visible,.ev select:focus-visible,.ev input:focus-visible,.ev-scroll:focus-visible{outline:3px solid var(--gold);outline-offset:1px}' +
    '.ev-slots{display:grid;grid-template-columns:minmax(0,1fr);gap:1rem}' +
    '.ev-slots.side{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}' +
    '@media (max-width:1100px){.ev-slots.side{grid-template-columns:minmax(0,1fr)}}' +
    '.ev-slot{border:1px solid var(--border);border-radius:4px;background:#fff;min-width:0}' +
    '.ev-slot-head{display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:center;padding:.6rem .8rem;background:var(--blue-pale);border-bottom:1px solid var(--border);border-radius:4px 4px 0 0}' +
    '.ev-tag{font:900 .7rem Arial,sans-serif;letter-spacing:.08em;background:var(--navy);color:#fff;border-radius:3px;padding:.15rem .45rem}' +
    '.ev select,.ev input[type=search],.ev input[type=number]{font:.84rem Arial,sans-serif;padding:.38rem .5rem;border:1px solid var(--border);border-radius:4px;background:#fff;color:var(--text-primary);max-width:100%}' +
    '.ev-src{font-size:.76rem;color:var(--text-muted);flex-basis:100%;line-height:1.45}' +
    '.ev-ctl{display:flex;flex-wrap:wrap;gap:.4rem .9rem;align-items:center;padding:.55rem .8rem}' +
    '.ev-ctl input[type=search]{flex:1 1 220px;min-width:0}' +
    '.ev-count{font-size:.78rem;color:var(--text-muted);white-space:nowrap}' +
    '.ev-chk{font-size:.8rem;color:var(--text-primary);display:inline-flex;align-items:center;gap:.3rem;cursor:pointer}' +
    '.ev-scroll{max-height:390px;overflow:auto;border-top:1px solid var(--border)}' +
    '.ev table{border-collapse:collapse;width:100%;font:.78rem/1.4 Arial,sans-serif;background:#fff}' +
    '.ev th{position:sticky;top:0;z-index:1;background:var(--navy);color:#fff;text-align:left;padding:0;white-space:nowrap}' +
    '.ev th button{all:unset;box-sizing:border-box;display:block;width:100%;padding:.45rem .6rem;font:700 .68rem Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}' +
    '.ev th button:focus-visible{outline:3px solid var(--gold);outline-offset:-3px}' +
    '.ev th .ev-thx{display:block;padding:.45rem .6rem;font:700 .68rem Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase}' +
    '.ev th .ev-ar{display:inline-block;width:.9em;margin-left:.2rem;opacity:.85}' +
    '.ev th.ev-add{background:var(--navy-light)}' +
    '.ev td{padding:.32rem .6rem;border-top:1px solid #d5deea;color:var(--text-primary);white-space:nowrap;font-family:"Courier New",monospace;font-size:.78rem}' +
    '.ev tbody tr:nth-child(even) td{background:#f4f7fb}' +
    '.ev td.ev-wrap{white-space:normal;min-width:16rem;font-family:Arial,sans-serif}' +
    '.ev td.ev-nm{color:var(--text-muted);font-style:italic}' +
    '.ev td.ev-addc{background:#eef4fb}' +
    '.ev td.ev-fl{font:700 .72rem Arial,sans-serif;color:var(--wrong);white-space:nowrap}' +
    '.ev tbody tr.ev-hit td{background:#fdeaed}' +
    '.ev tbody tr.ev-hit td:first-child{box-shadow:inset 4px 0 0 var(--gold)}' +
    '.ev-empty{padding:1rem;font-size:.84rem;color:var(--text-muted)}' +
    '.ev-tools{margin-top:1rem;border:1px solid var(--border);border-left:4px solid var(--navy);border-radius:0 4px 4px 0;background:#f7f9fc;padding:.8rem 1rem}' +
    '.ev-tools h4{font:700 .95rem Georgia,serif;color:var(--text-primary);margin:0 0 .3rem}' +
    '.ev-tools p.ev-help{font-size:.8rem;line-height:1.5;margin:0 0 .6rem;color:var(--text-secondary)}' +
    '.ev-row{display:flex;flex-wrap:wrap;gap:.45rem .6rem;align-items:center;padding:.5rem 0;border-top:1px dashed var(--border)}' +
    '.ev-row label{font-size:.8rem;color:var(--text-primary)}' +
    '.ev-row .ev-n{width:5rem}' +
    '.ev-status{font-size:.8rem;color:var(--text-primary);margin:.5rem 0 0;min-height:1.2em}' +
    '.ev-status b{color:var(--navy)}' +
    '.ev-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}';

  function injectCSS() {
    if (document.getElementById('ev-css')) return;
    var s = document.createElement('style'); s.id = 'ev-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var NM = '(no match)';
  function blankish(v) { return v == null || v === '' || v === NM; }
  function toTime(v) {
    if (blankish(v)) return NaN;
    var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return NaN;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }
  function parseTerms(q) {
    var out = [], re = /(-?)"([^"]*)"|(-?)(\S+)/g, m;
    while ((m = re.exec(String(q || '')))) {
      var neg = !!(m[1] || m[3]), t = (m[2] != null ? m[2] : m[4]).toLowerCase();
      if (m[4] === '-' ) continue;
      if (t) out.push({ neg: neg, t: t });
    }
    return out;
  }

  var EV = { instances: {} };

  EV.create = function (root, cfg) {
    injectCSS();
    var api = cfg.api || null, uid = 'ev-' + cfg.id;
    var panes = cfg.panes, byId = {};
    panes.forEach(function (p) { byId[p.id] = p; });
    // View state (persisted when the lab API is available)
    var V = (api && api.note(uid)) || {};
    var st = {
      side: !!V.side,
      slot: [byId[V.a] ? V.a : (cfg.a || panes[0].id), byId[V.b] ? V.b : (cfg.b || panes[1 % panes.length].id)],
      filter: V.filter || {}, sort: V.sort || {}, only: V.only || {},
      ops: V.ops || []   // replayable lookups and flag tests
    };
    var added = {}, flags = {}, lastMsg = '';
    function persist() { if (api) api.note(uid, { side: st.side, a: st.slot[0], b: st.slot[1], filter: st.filter, sort: st.sort, only: st.only, ops: st.ops }); }

    function colsOf(p) { return p.cols.concat(added[p.id] || []); }
    function cell(p, r, i, k) {
      var ad = (added[p.id] || []).filter(function (c) { return c.k === k; })[0];
      return ad ? ad.vals[i] : r[k];
    }
    function colLabel(p, k) { var c = colsOf(p).filter(function (c) { return c.k === k; })[0]; return c ? c.h : k; }

    /* ---------- Operations (replayable) ---------- */
    function indexOf(p, k) {
      var m = {};
      p.rows.forEach(function (r, i) { var v = cell(p, r, i, k); if (blankish(v)) return; v = String(v).trim().toUpperCase(); (m[v] = m[v] || []).push(i); });
      return m;
    }
    function apply(op, quiet) {
      var A = byId[op.a], B = byId[op.b], msg = '';
      if (!A) return '';
      if (op.t === 'lookup' || op.t === 'match') {
        if (!B) return '';
        var ix = indexOf(B, op.kb);
        if (op.t === 'lookup') {
          var key = 'L' + (added[A.id] || []).length + '_' + op.cb, found = 0;
          var vals = A.rows.map(function (r, i) {
            var v = cell(A, r, i, op.ka); var hit = blankish(v) ? null : ix[String(v).trim().toUpperCase()];
            if (!hit) return NM; found++;
            var x = cell(B, B.rows[hit[0]], hit[0], op.cb); return (x == null ? '' : x) + (hit.length > 1 ? ' (+' + (hit.length - 1) + ' more)' : '');
          });
          (added[A.id] = added[A.id] || []).push({ k: key, h: colLabel(B, op.cb) + ' (from ' + B.title + ')', vals: vals, add: true });
          msg = 'Added the column <b>' + esc(colLabel(B, op.cb)) + '</b> to ' + esc(A.title) + '. ' + found + ' of ' + A.rows.length + ' rows found a match; the rest show ' + NM + '.';
        } else {
          var f = {}, n = 0;
          A.rows.forEach(function (r, i) {
            var v = cell(A, r, i, op.ka), has = !blankish(v) && !!ix[String(v).trim().toUpperCase()];
            if (has === (op.mode === 'with')) { f[i] = op.mode === 'with' ? 'Match' : 'No match'; n++; }
          });
          flags[A.id] = { rows: f, label: (op.mode === 'with' ? 'Has a match in ' : 'No match in ') + B.title };
          msg = '<b>' + n + '</b> of ' + A.rows.length + ' rows in ' + esc(A.title) + ' have ' + (op.mode === 'with' ? 'a match' : 'no match') + ' for ' + esc(colLabel(A, op.ka)) + ' in ' + esc(B.title) + ' (' + esc(colLabel(B, op.kb)) + '). Flagged rows are marked in the Flag column.';
        }
      }
      if (op.t === 'cmp') {
        var g = {}, hits = 0, skipped = 0, N = +op.n || 0;
        A.rows.forEach(function (r, i) {
          var x = cell(A, r, i, op.x), y = cell(A, r, i, op.y), ok = false;
          if (blankish(x) || blankish(y)) { skipped++; return; }
          var sx = String(x).replace(/ \(\+\d+ more\)$/, '').trim(), sy = String(y).replace(/ \(\+\d+ more\)$/, '').trim();
          if (op.op === 'eq') ok = sx.toUpperCase() === sy.toUpperCase();
          else if (op.op === 'ne') ok = sx.toUpperCase() !== sy.toUpperCase();
          else {
            var tx = toTime(sx), ty = toTime(sy);
            if (isNaN(tx) || isNaN(ty)) { skipped++; return; }
            if (op.op === 'later') ok = tx > ty;
            if (op.op === 'days') ok = (tx - ty) / 86400000 > N;
          }
          if (ok) { g[i] = op.op === 'eq' ? 'Equal' : op.op === 'ne' ? 'Different' : op.op === 'later' ? 'Later' : '> ' + N + ' days'; hits++; }
        });
        var desc = esc(colLabel(A, op.x)) + ' ' + ({ eq: 'equals', ne: 'differs from', later: 'is later than', days: 'is more than ' + N + ' days after' })[op.op] + ' ' + esc(colLabel(A, op.y));
        flags[A.id] = { rows: g, label: 'Compare' };
        msg = '<b>' + hits + '</b> of ' + A.rows.length + ' rows in ' + esc(A.title) + ' where ' + desc + '.' + (skipped ? ' ' + skipped + ' rows were skipped because a value is blank or has no match.' : '');
      }
      if (!quiet) lastMsg = msg;
      return msg;
    }
    st.ops.forEach(function (op) { apply(op, true); });

    /* ---------- Rendering ---------- */
    function view(p, s) {
      var cols = colsOf(p), terms = parseTerms(st.filter[s + p.id] || ''), fl = flags[p.id], only = st.only[s + p.id] && fl;
      var idx = [];
      p.rows.forEach(function (r, i) {
        if (only && !fl.rows[i]) return;
        if (terms.length) {
          var hay = cols.map(function (c) { var v = cell(p, r, i, c.k); return v == null ? '' : String(v); }).join(' \u0001 ').toLowerCase();
          if (fl && fl.rows[i]) hay += ' \u0001 flagged ' + fl.rows[i].toLowerCase();
          for (var t = 0; t < terms.length; t++) { var inn = hay.indexOf(terms[t].t) >= 0; if (inn === terms[t].neg) return; }
        }
        idx.push(i);
      });
      var so = st.sort[s + p.id];
      if (so && cols.some(function (c) { return c.k === so.k; })) {
        var col = cols.filter(function (c) { return c.k === so.k; })[0];
        var numeric = col.num || idx.every(function (i) { var v = cell(p, p.rows[i], i, so.k); return blankish(v) || !isNaN(+v); });
        idx.sort(function (i, j) {
          var a = cell(p, p.rows[i], i, so.k), b = cell(p, p.rows[j], j, so.k), c;
          if (blankish(a) && blankish(b)) c = 0; else if (blankish(a)) c = -1; else if (blankish(b)) c = 1;
          else if (numeric) c = (+a) - (+b); else c = String(a).localeCompare(String(b), 'en', { numeric: true });
          return (so.d === 'desc' ? -c : c) || i - j;
        });
      }
      return { cols: cols, idx: idx, fl: fl };
    }
    function tableHTML(p, s) {
      var v = view(p, s), so = st.sort[s + p.id] || {};
      var head = (v.fl ? '<th scope="col"><span class="ev-thx">Flag</span></th>' : '') + v.cols.map(function (c) {
        var on = so.k === c.k, dir = on ? (so.d === 'desc' ? 'descending' : 'ascending') : 'none';
        return '<th scope="col" aria-sort="' + dir + '"' + (c.add ? ' class="ev-add"' : '') + '><button type="button" data-sort="' + esc(c.k) + '">' + esc(c.h) + '<span class="ev-ar" aria-hidden="true">' + (on ? (so.d === 'desc' ? '&#9660;' : '&#9650;') : '') + '</span><span class="ev-sr">, sort</span></button></th>';
      }).join('');
      var body = v.idx.map(function (i) {
        var r = p.rows[i], f = v.fl && v.fl.rows[i];
        return '<tr' + (f ? ' class="ev-hit"' : '') + '>' + (v.fl ? '<td class="ev-fl">' + (f ? '&#9873; ' + esc(f) : '') + '</td>' : '') + v.cols.map(function (c) {
          var val = cell(p, r, i, c.k), cls = [];
          if (c.wrap) cls.push('ev-wrap'); if (c.add) cls.push('ev-addc'); if (val === NM || val === '' || val == null) cls.push('ev-nm');
          return '<td' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>' + (val === '' || val == null ? (c.blank || '(blank)') : esc(val)) + '</td>';
        }).join('') + '</tr>';
      }).join('');
      return { html: v.idx.length ? '<table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>' : '<p class="ev-empty">No rows match the filter.</p>', shown: v.idx.length, flagged: v.fl ? Object.keys(v.fl.rows).length : 0 };
    }
    function optList(arr, sel) { return arr.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === sel ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); }
    function paneOpts(sel) { return optList(panes.map(function (p) { return [p.id, p.title + ' (' + p.rows.length + ')']; }), sel); }
    function colOpts(p, sel) { return optList(colsOf(p).map(function (c) { return [c.k, c.h]; }), sel); }

    function render(focusSel) {
      var A = byId[st.slot[0]], B = byId[st.slot[1]];
      var h = '<div class="ev" id="' + uid + '">' + (cfg.intro ? '<p class="ev-intro">' + cfg.intro + '</p>' : '') +
        '<div class="ev-bar"><span class="ev-lab">Layout</span><span class="ev-seg" role="group" aria-label="Pane layout"><button type="button" data-lay="0" aria-pressed="' + !st.side + '">Stacked</button><button type="button" data-lay="1" aria-pressed="' + st.side + '">Side by side</button></span>' +
        '<button type="button" class="ev-sbtn" data-swap="1">Swap panes A and B</button></div>' +
        '<div class="ev-slots' + (st.side ? ' side' : '') + '">' + [0, 1].map(function (s) {
          var p = byId[st.slot[s]], t = tableHTML(p, s), L = s ? 'B' : 'A', fl = flags[p.id];
          return '<section class="ev-slot" aria-label="Pane ' + L + ': ' + esc(p.title) + '">' +
            '<div class="ev-slot-head"><span class="ev-tag" aria-hidden="true">' + L + '</span><label class="ev-sr" for="' + uid + '-p' + s + '">Evidence shown in pane ' + L + '</label><select id="' + uid + '-p' + s + '" data-pane="' + s + '">' + paneOpts(p.id) + '</select>' +
              (p.source ? '<span class="ev-src">' + p.source + '</span>' : '') + '</div>' +
            '<div class="ev-ctl"><label class="ev-sr" for="' + uid + '-f' + s + '">Filter pane ' + L + '</label><input type="search" id="' + uid + '-f' + s + '" data-filter="' + s + '" value="' + esc(st.filter[s + p.id] || '') + '" placeholder="Filter rows: words, &quot;exact phrase&quot;, -exclude" autocomplete="off" spellcheck="false">' +
              (fl ? '<label class="ev-chk"><input type="checkbox" data-only="' + s + '"' + (st.only[s + p.id] ? ' checked' : '') + '> Flagged only</label>' : '') +
              '<span class="ev-count" role="status" id="' + uid + '-c' + s + '">' + t.shown + ' of ' + p.rows.length + ' rows' + (fl ? ', ' + t.flagged + ' flagged' : '') + '</span></div>' +
            '<div class="ev-scroll" tabindex="0" role="region" aria-label="' + esc(p.title) + ' table, pane ' + L + '" id="' + uid + '-t' + s + '">' + t.html + '</div></section>';
        }).join('') + '</div>' +
        '<div class="ev-tools" role="group" aria-labelledby="' + uid + '-th"><h4 id="' + uid + '-th">Match and compare tools</h4>' +
        '<p class="ev-help">These tools work on <b>pane A (' + esc(A.title) + ')</b>, using <b>pane B (' + esc(B.title) + ')</b> as the lookup source. Choose the evidence for each pane above. A new flag test replaces the previous flags on that pane.</p>' +
        '<div class="ev-row"><span class="ev-lab">Match</span><label for="' + uid + '-ka">Key in A</label><select id="' + uid + '-ka">' + colOpts(A, V.ka) + '</select>' +
          '<label for="' + uid + '-kb">matches key in B</label><select id="' + uid + '-kb">' + colOpts(B, V.kb) + '</select>' +
          '<button type="button" class="ev-sbtn pri" data-match="without">Flag A rows with no match</button><button type="button" class="ev-sbtn" data-match="with">Flag A rows with a match</button></div>' +
        '<div class="ev-row"><span class="ev-lab">Lookup</span><label for="' + uid + '-cb">Using the same keys, bring column</label><select id="' + uid + '-cb">' + colOpts(B, V.cb) + '</select><span>from B into A</span>' +
          '<button type="button" class="ev-sbtn pri" data-lookup="1">Add column to A</button></div>' +
        '<div class="ev-row"><span class="ev-lab">Compare</span><label for="' + uid + '-x">Flag A rows where</label><select id="' + uid + '-x">' + colOpts(A, V.x) + '</select>' +
          '<label class="ev-sr" for="' + uid + '-op">comparison</label><select id="' + uid + '-op">' + optList([['eq', 'equals'], ['ne', 'differs from'], ['later', 'is later than'], ['days', 'is more than N days after']], V.op) + '</select>' +
          '<label class="ev-sr" for="' + uid + '-y">second column</label><select id="' + uid + '-y">' + colOpts(A, V.y) + '</select>' +
          '<label for="' + uid + '-n">N</label><input type="number" class="ev-n" id="' + uid + '-n" min="0" step="1" value="' + esc(V.n == null ? 30 : V.n) + '">' +
          '<button type="button" class="ev-sbtn pri" data-cmp="1">Flag rows</button></div>' +
        '<div class="ev-row"><button type="button" class="ev-sbtn" data-clear="flags">Clear flags on A</button><button type="button" class="ev-sbtn" data-clear="cols">Remove added columns from A</button><button type="button" class="ev-sbtn" data-clear="all">Reset all tools</button></div>' +
        '<p class="ev-status" role="status" aria-live="polite" id="' + uid + '-st">' + (lastMsg || 'Tip: added columns can be used as keys and in comparisons. Blank values never match.') + '</p></div></div>';
      root.innerHTML = h;
      wire();
      if (focusSel) { var f = root.querySelector(focusSel); if (f) { f.focus(); if (f.setSelectionRange && f.type === 'search') { var n = f.value.length; f.setSelectionRange(n, n); } } }
    }
    function remember() {
      ['ka', 'kb', 'cb', 'x', 'op', 'y', 'n'].forEach(function (k) { var el = root.querySelector('#' + uid + '-' + k); if (el) V[k] = el.value; });
    }
    function refreshSlot(s) {
      var p = byId[st.slot[s]], t = tableHTML(p, s), fl = flags[p.id];
      root.querySelector('#' + uid + '-t' + s).innerHTML = t.html;
      root.querySelector('#' + uid + '-c' + s).textContent = t.shown + ' of ' + p.rows.length + ' rows' + (fl ? ', ' + t.flagged + ' flagged' : '');
      wireSort();
    }
    function wireSort() {
      root.querySelectorAll('[data-sort]').forEach(function (b) {
        if (b.dataset.w) return; b.dataset.w = 1;
        b.addEventListener('click', function () {
          var s = +b.closest('.ev-slot').querySelector('[data-pane]').dataset.pane, key = s + st.slot[s], cur = st.sort[key];
          st.sort[key] = cur && cur.k === b.dataset.sort ? (cur.d === 'asc' ? { k: cur.k, d: 'desc' } : null) : { k: b.dataset.sort, d: 'asc' };
          if (!st.sort[key]) delete st.sort[key];
          persist(); remember(); render('#' + uid + '-t' + s + ' [data-sort="' + b.dataset.sort + '"]');
        });
      });
    }
    function run(op) {
      remember();
      if (op.t === 'cmp' && op.x === op.y) { lastMsg = 'Choose two different columns to compare.'; render('[data-cmp]'); return; }
      if (op.t !== 'lookup') st.ops = st.ops.filter(function (o) { return o.t === 'lookup' || o.a !== op.a; });
      st.ops.push(op); apply(op); persist();
      render(op.t === 'lookup' ? '[data-lookup]' : op.t === 'cmp' ? '[data-cmp]' : '[data-match="' + op.mode + '"]');
    }
    function rebuild() { added = {}; flags = {}; st.ops.forEach(function (op) { apply(op, true); }); }
    function wire() {
      root.querySelectorAll('[data-lay]').forEach(function (b) { b.addEventListener('click', function () { st.side = b.dataset.lay === '1'; persist(); remember(); render('[data-lay="' + b.dataset.lay + '"]'); }); });
      root.querySelector('[data-swap]').addEventListener('click', function () { st.slot.reverse(); persist(); remember(); render('[data-swap]'); });
      root.querySelectorAll('[data-pane]').forEach(function (sel) { sel.addEventListener('change', function () { var s = +sel.dataset.pane; st.slot[s] = sel.value; persist(); render('#' + uid + '-p' + s); }); });
      root.querySelectorAll('[data-filter]').forEach(function (inp) { inp.addEventListener('input', function () { var s = +inp.dataset.filter; st.filter[s + st.slot[s]] = inp.value; persist(); refreshSlot(s); }); });
      root.querySelectorAll('[data-only]').forEach(function (c) { c.addEventListener('change', function () { var s = +c.dataset.only; st.only[s + st.slot[s]] = c.checked; persist(); refreshSlot(s); }); });
      root.querySelectorAll('[data-match]').forEach(function (b) { b.addEventListener('click', function () { run({ t: 'match', mode: b.dataset.match, a: st.slot[0], b: st.slot[1], ka: val('ka'), kb: val('kb') }); }); });
      root.querySelector('[data-lookup]').addEventListener('click', function () { run({ t: 'lookup', a: st.slot[0], b: st.slot[1], ka: val('ka'), kb: val('kb'), cb: val('cb') }); });
      root.querySelector('[data-cmp]').addEventListener('click', function () { run({ t: 'cmp', a: st.slot[0], x: val('x'), y: val('y'), op: val('op'), n: val('n') }); });
      root.querySelectorAll('[data-clear]').forEach(function (b) { b.addEventListener('click', function () {
        var a = st.slot[0], what = b.dataset.clear;
        if (what === 'all') st.ops = [];
        else if (what === 'flags') st.ops = st.ops.filter(function (o) { return o.t === 'lookup' || o.a !== a; });
        else st.ops = st.ops.filter(function (o) { return !(o.a === a && (o.t === 'lookup' || o.t === 'cmp')); });
        rebuild(); persist(); remember();
        lastMsg = what === 'all' ? 'All lookups and flags were removed.' : what === 'flags' ? 'Flags on ' + byId[a].title + ' were cleared.' : 'Added columns (and compare flags that used them) were removed from ' + byId[a].title + '.';
        render('[data-clear="' + what + '"]');
      }); });
      wireSort();
    }
    function val(k) { var el = root.querySelector('#' + uid + '-' + k); return el ? el.value : ''; }
    render();
    var inst = {
      render: render,
      reset: function () { st.ops = []; st.filter = {}; st.sort = {}; st.only = {}; rebuild(); lastMsg = ''; persist(); render(); },
      show: function (a, b) { if (byId[a]) st.slot[0] = a; if (byId[b]) st.slot[1] = b; persist(); render(); }
    };
    EV.instances[cfg.id] = inst;
    return inst;
  };
  window.EV = EV;
})();

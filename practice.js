/* CISM 5-Day Boot Camp: shared engine for learning activities.
   Each activity page sets window.ACTIVITY = { ... } and loads this file.
   Station types: "sort" (assign each item to a bucket), "scenario" (one or more
   multiple-choice parts per case), "reflect" (confidence ratings + written prompts).
   Self-checking practice: answers are checked on demand, stations can be retried,
   and progress is kept in this browser. The summary report prints or saves as PDF. */
(function () {
  'use strict';

  /* ---------- Catalog of all practice items (sidebar) ---------- */
  var CATALOG = {
    activities: [
      ['A1', 'activity01.html', 'The Management Mindset'],
      ['A2', 'activity02.html', 'Governance Roles, Strategy & Frameworks'],
      ['A3', 'activity03.html', 'Asset Ownership, Classification & Valuation'],
      ['A4', 'activity04.html', 'Risk Analysis & Treatment Decisions'],
      ['A5', 'activity05.html', 'Control Selection & Program Architecture'],
      ['A6', 'activity06.html', 'Awareness, Culture & Third-Party Risk'],
      ['A7', 'activity07.html', 'Metrics That Matter: KGIs, KPIs & KRIs'],
      ['A8', 'activity08.html', 'Incident Classification & Response Leadership'],
      ['A9', 'activity09.html', 'Business Continuity: BIA, Objectives & Testing']
    ],
    labs: [
      ['B1', 'lab01.html', 'Security Strategy & Board Briefing'],
      ['B2', 'lab02.html', 'Enterprise Risk Register Workshop'],
      ['B3', 'lab03.html', 'Security Budget & Control Portfolio'],
      ['B4', 'lab04.html', 'Third-Party & AI Vendor Onboarding'],
      ['B5', 'lab05.html', 'Phishing & Security Culture Analytics'],
      ['B6', 'lab06.html', 'Ransomware Incident Command Tabletop'],
      ['B7', 'lab07.html', 'Breach Notification Decision Clock'],
      ['B8', 'lab08.html', 'Continuity & Recovery Strategy Planner']
    ]
  };
  var BUILT = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'];

  var cfg = window.ACTIVITY;
  if (!cfg) return;
  var KEY = 'cism-practice-' + cfg.id;
  var LETTERS = 'ABCDEFGH';

  /* ---------- State ---------- */
  function blank() { return { v: 1, cur: 0, ans: {}, checked: {}, attempts: {}, conf: {}, text: {}, name: '', team: '', elapsed: 0, first: Date.now() }; }
  var S = blank();
  try { var raw = localStorage.getItem(KEY); if (raw) { var p = JSON.parse(raw); if (p && p.v === 1) S = Object.assign(blank(), p); } } catch (e) { /* storage unavailable: run without saving */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }

  // Active time on page (counts only while the tab is visible)
  var last = Date.now();
  setInterval(function () { var now = Date.now(); if (document.visibilityState === 'visible') S.elapsed += Math.min(now - last, 10000); last = now; save(); }, 5000);

  /* ---------- Helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function ans(s) { return S.ans[s] || (S.ans[s] = {}); }
  var stations = cfg.stations;
  var REPORT = stations.length; // index of the report step
  function conceptName(k) { for (var i = 0; i < cfg.concepts.length; i++) if (cfg.concepts[i].key === k) return cfg.concepts[i].name; return k; }

  // Flatten a station into gradable units: {key, concept, ok, answered, prompt, given, correct, why}
  function units(si) {
    var st = stations[si], a = S.ans[si] || {}, out = [];
    if (st.type === 'sort') st.items.forEach(function (it, i) {
      var g = a[i]; out.push({ concept: it.concept || st.concept, answered: g != null, ok: g === it.answer, prompt: it.text, given: g != null ? st.buckets[g] : '(no answer)', correct: st.buckets[it.answer], why: it.why });
    });
    if (st.type === 'scenario') st.items.forEach(function (it, i) {
      it.parts.forEach(function (pt, j) {
        var g = a[i + '.' + j]; out.push({ concept: pt.concept || st.concept, answered: g != null, ok: g === pt.answer, prompt: (it.title ? it.title + ': ' : '') + pt.q, given: g != null ? pt.options[g] : '(no answer)', correct: pt.options[pt.answer], why: pt.why });
      });
    });
    if (st.type === 'order') groupsOf(st).forEach(function (g, gi) {
      var ord = orderOf(si, gi);
      ord.forEach(function (itemIdx, pos) {
        var it = g.items[itemIdx], okPos = it.accept || [it.rank];
        out.push({ concept: it.concept || g.concept || st.concept, answered: true, ok: okPos.indexOf(pos) >= 0, prompt: (g.title ? g.title + ': ' : '') + it.text, given: 'position ' + (pos + 1), correct: okPos.length > 1 ? 'positions ' + okPos.map(function (x) { return x + 1; }).join(' or ') : 'position ' + (it.rank + 1), why: it.why });
      });
    });
    if (st.type === 'calc') st.items.forEach(function (it, i) {
      var g = a[i], v = parseFloat(g), ok = g != null && g !== '' && !isNaN(v) && Math.abs(v - it.answer) <= (it.tol || 0);
      out.push({ concept: it.concept || st.concept, answered: g != null && g !== '', ok: ok, prompt: (it.title ? it.title + ': ' : '') + it.label, given: (g != null && g !== '' ? g : '(no answer)') + (it.unit ? ' ' + it.unit : ''), correct: it.answer + (it.unit ? ' ' + it.unit : '') + (it.tol ? ' (within ' + it.tol + ')' : ''), why: it.why });
    });
    return out;
  }
  function groupsOf(st) { return st.groups || [{ title: '', items: st.items, concept: st.concept }]; }
  function orderOf(si, gi) {
    var a = ans(si), g = groupsOf(stations[si])[gi];
    if (!a['g' + gi] || a['g' + gi].length !== g.items.length) a['g' + gi] = g.items.map(function (_, i) { return i; });
    return a['g' + gi];
  }
  function tableHTML(tb) {
    if (!tb) return '';
    return '<div class="table-wrap px-ctx"><table class="data">' + (tb.caption ? '<caption>' + esc(tb.caption) + '</caption>' : '') +
      '<thead><tr>' + tb.head.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      tb.rows.map(function (r) { return '<tr>' + r.map(function (c, k) { return k === 0 ? '<th scope="row">' + esc(c) + '</th>' : '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function stationScore(si) { var u = units(si); var c = u.filter(function (x) { return x.ok; }).length; return { c: c, n: u.length }; }
  function isDone(si) { return !!S.checked[si]; }
  function mastery() {
    var m = {}; cfg.concepts.forEach(function (c) { m[c.key] = { c: 0, n: 0 }; });
    stations.forEach(function (st, si) { if (!isDone(si)) return; units(si).forEach(function (u) { if (m[u.concept]) { m[u.concept].n++; if (u.ok) m[u.concept].c++; } }); });
    return m;
  }

  /* ---------- Shell (matches the lesson pages) ---------- */
  function catalogList(list) {
    return '<ul class="px-catalog">' + list.map(function (r) {
      if (r[0] === cfg.id) return '<li><span class="cur" aria-current="page"><b>' + r[0] + '</b>' + esc(r[2]) + '</span></li>';
      if (BUILT.indexOf(r[0]) >= 0) return '<li><a href="' + r[1] + '"><b>' + r[0] + '</b>' + esc(r[2]) + '</a></li>';
      return '<li><span class="soon" aria-disabled="true"><b>' + r[0] + '</b>' + esc(r[2]) + '<em>Soon</em></span></li>';
    }).join('') + '</ul>';
  }
  function heroTitle() {
    // Keep hyphenated words (e.g., Go-Live) on one line; color the accent phrase red
    function nb(s) { return esc(s).replace(/(\S+-\S+)/g, '<span class="px-nw">$1</span>'); }
    var t = cfg.title, a = cfg.accent || '', i = a ? t.indexOf(a) : -1;
    return i < 0 ? nb(t) : nb(t.slice(0, i)) + '<span>' + nb(a) + '</span>' + nb(t.slice(i + a.length));
  }
  function shell() {
    var app = document.getElementById('app');
    var nStations = stations.filter(function (s) { return s.type !== 'reflect'; }).length;
    app.innerHTML =
      '<nav class="topnav"><a href="index.html" class="nav-brand"><div class="nav-seal">CISM<br>PREP</div><span class="nav-title">5-Day Boot Camp</span></a>' +
        '<div class="nav-right"><ul class="nav-links"><li><a href="index.html">Home</a></li><li><a href="index.html#lessons">Lessons</a></li><li><a href="index.html#schedule">Schedule</a></li><li><a href="practices.html">Practices</a></li><li><a href="labs.html">Leadership Lab</a></li><li><a href="index.html#exam-prep">Exam Prep</a></li></ul></div></nav>' +
      '<header class="lesson-hero"><div class="lesson-hero-inner">' +
        '<p class="breadcrumb"><a href="index.html">Boot Camp</a> &nbsp;&rsaquo;&nbsp; <a href="practices.html">CISM Practices</a> &nbsp;&rsaquo;&nbsp; <span>Activity ' + esc(cfg.id) + '</span></p>' +
        '<span class="lesson-badge-lg">CISM Practices &middot; Activity ' + esc(cfg.id) + ' &middot; ' + esc(cfg.domain) + '</span>' +
        '<h1>' + heroTitle() + '</h1>' +
        '<p class="lesson-lede">' + esc(cfg.lede) + '</p>' +
        '<div class="meta-chips"><span class="meta-chip">Time: <strong>' + esc(cfg.time) + '</strong></span><span class="meta-chip">Level: <strong>' + esc(cfg.level) + '</strong></span>' +
        '<span class="meta-chip">Stations: <strong>' + nStations + ' + reflection</strong></span><span class="meta-chip">Format: <strong>Self-check</strong></span>' +
        '<a class="meta-chip" style="text-decoration:none" href="' + esc(cfg.lessonHref) + '">Review: <strong>' + esc(cfg.lessonLabel) + '</strong></a></div>' +
      '</div></header>' +
      '<div class="px-layout">' +
        '<aside class="px-rail" aria-label="Activity navigation">' +
          '<p class="eyebrow">Stations</p><ol class="px-steps" id="px-steps"></ol>' +
          '<section class="px-mastery" id="px-mastery" aria-live="polite"></section>' +
          '<div class="px-more"><details><summary>All activities</summary>' + catalogList(CATALOG.activities) + '</details>' +
          '<details><summary>All labs</summary>' + catalogList(CATALOG.labs) + '</details>' +
          '<a class="px-hub" href="practices.html">CISM Practices home &rarr;</a><a class="px-hub" href="labs.html">CISM Leadership Lab home &rarr;</a></div>' +
        '</aside>' +
        '<main class="px-content" id="main"><div id="px-stage"></div></main>' +
      '</div>' +
      '<footer><div class="footer-logo">CISM 5-DAY BOOT CAMP</div><p class="footer-disclaimer">This boot camp is an independent educational resource and is not affiliated with, endorsed by, or sponsored by ISACA. CISM&#174; is a registered trademark of ISACA. Practice items are self-checking; progress is saved in this browser only.</p></footer>';
  }

  function renderSteps() {
    var ol = document.getElementById('px-steps'); ol.innerHTML = '';
    stations.concat([{ title: 'Summary report' }]).forEach(function (st, i) {
      var li = document.createElement('li'), b = document.createElement('button');
      var done = i < REPORT && isDone(i);
      b.className = 'px-step' + (done ? ' done' : '');
      if (i === S.cur) b.setAttribute('aria-current', 'step');
      b.innerHTML = '<span class="dot" aria-hidden="true">' + (done ? '&#10003;' : (i < REPORT ? i + 1 : '&#9998;')) + '</span><span>' + esc(st.short || st.title) + (done ? '<span class="sr-only"> (complete)</span>' : '') + '</span>';
      b.addEventListener('click', function () { go(i); });
      li.appendChild(b); ol.appendChild(li);
    });
  }

  function renderMastery() {
    var m = mastery(), box = document.getElementById('px-mastery');
    box.innerHTML = '<p class="eyebrow">Concept mastery</p>' + cfg.concepts.map(function (c) {
      var v = m[c.key], pct = v.n ? Math.round(100 * v.c / v.n) : 0;
      var cls = !v.n ? '' : (pct >= 80 ? 'hi' : (pct < 60 ? 'lo' : ''));
      return '<div class="px-m-item"><div class="px-m-row"><span>' + esc(c.name) + '</span><b>' + (v.n ? pct + '%' : '&ndash;') + '</b></div>' +
        '<div class="px-bar ' + cls + '" role="img" aria-label="' + esc(c.name) + ': ' + (v.n ? pct + ' percent' : 'not yet attempted') + '"><i style="width:' + pct + '%"></i></div></div>';
    }).join('');
  }

  /* ---------- Pop-out windows (shared by labs and activities) ---------- */
  var POPS = [];
  function popCourse() { var parts = document.title.split(' | '); return parts.length > 1 ? parts[parts.length - 1] : ''; }
  function popDocHTML(kicker, sub, bodyHTML, note) {
    var css = [].map.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) { return '<link rel="stylesheet" href="' + esc(l.href) + '">'; }).join('') +
      [].map.call(document.querySelectorAll('style'), function (s) { return '<style>' + s.textContent + '</style>'; }).join('');
    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light">' +
      '<base href="' + esc(location.href) + '"><title>' + esc(sub) + ' | ' + esc(kicker) + '</title>' + css + '</head><body class="px-popwin">' +
      '<header class="px-pop-head"><div><p class="px-pop-kicker">' + esc(kicker) + '</p><h1>' + esc(sub) + '</h1>' + (note ? '<p class="px-pop-note">' + esc(note) + '</p>' : '') + '</div>' +
      '<div class="px-pop-actions"><button type="button" class="btn secondary" onclick="window.print()">Print</button><button type="button" class="btn ghost" onclick="window.close()">Close</button></div></header>' +
      '<main class="px-pop-main" id="px-pop-main">' + bodyHTML + '</main></body></html>';
  }
  function openPop(key, kicker, sub, snapshot, note, live) {
    var w = window.open('', 'px-pop-' + key.replace(/[^a-z0-9]/gi, '-'), 'width=780,height=900,resizable=yes,scrollbars=yes');
    if (!w) { alert('Your browser blocked the new window. Allow pop-ups for this page, then try again.'); return; }
    var html = snapshot();
    w.document.open(); w.document.write(popDocHTML(kicker, sub, html, note)); w.document.close();
    try { w.focus(); } catch (e) { }
    POPS = POPS.filter(function (p) { return p.key !== key; });
    if (live) POPS.push({ key: key, w: w, snap: snapshot, last: html });
  }
  setInterval(function () {
    POPS = POPS.filter(function (p) { try { return p.w && !p.w.closed; } catch (e) { return false; } });
    POPS.forEach(function (p) {
      try { var h = p.snap(); if (h && h !== p.last) { var m = p.w.document.getElementById('px-pop-main'); if (m) { m.innerHTML = h; p.last = h; } } } catch (e) { }
    });
  }, 1200);
  // Read-only snapshot of a live element: copies form values, turns canvases into images, disables controls
  function liveSnapshot(node, stopAt) {
    var clone = node.cloneNode(true);
    var sc = node.querySelectorAll('canvas'), dc = clone.querySelectorAll('canvas');
    [].forEach.call(dc, function (c, i) { try { var img = document.createElement('img'); img.src = sc[i].toDataURL(); img.alt = c.getAttribute('aria-label') || 'Chart'; img.style.maxWidth = '100%'; c.parentNode.replaceChild(img, c); } catch (e) { } });
    var si = node.querySelectorAll('input,select,textarea'), di = clone.querySelectorAll('input,select,textarea');
    [].forEach.call(di, function (el, i) {
      var o = si[i];
      if (o) {
        if (el.type === 'checkbox' || el.type === 'radio') { if (o.checked) el.setAttribute('checked', ''); else el.removeAttribute('checked'); }
        else if (el.tagName === 'SELECT') { [].forEach.call(el.options, function (op, k) { if (k === o.selectedIndex) op.setAttribute('selected', ''); else op.removeAttribute('selected'); }); }
        else if (el.tagName === 'TEXTAREA') el.textContent = o.value;
        else el.setAttribute('value', o.value);
      }
      el.setAttribute('disabled', '');
    });
    [].forEach.call(clone.querySelectorAll('button'), function (b) { b.setAttribute('disabled', ''); });
    clone.removeAttribute('hidden');
    var html = clone.outerHTML, el = node.parentElement;
    while (el && el !== stopAt && el !== document.body) {
      html = '<div' + (el.id ? ' id="' + esc(el.id) + '"' : '') + (el.className && typeof el.className === 'string' ? ' class="' + esc(el.className) + '"' : '') + '>' + html + '</div>';
      el = el.parentElement;
    }
    return html;
  }

  function hasFacts(st) {
    return !!(st.table || (st.groups || []).some(function (g) { return g.text || g.table; }) ||
      ((st.type === 'scenario' || st.type === 'calc') && (st.items || []).some(function (it) { return it.text || it.table; })));
  }
  function factsHTML(st) {
    function block(title, text, table) { return '<div class="px-case-block">' + (title ? '<p class="eyebrow">' + esc(title) + '</p>' : '') + (text ? '<div class="px-case">' + esc(text) + '</div>' : '') + tableHTML(table) + '</div>'; }
    var h = '<div class="px-content"><p class="lead-p">' + st.instr + '</p>' + tableHTML(st.table);
    (st.groups || []).forEach(function (g) { if (g.text || g.table) h += block(g.title, g.text, g.table); });
    if (st.type === 'scenario' || st.type === 'calc') (st.items || []).forEach(function (it) { if (it.text || it.table) h += block(it.title, it.text, it.table); });
    return h + '</div>';
  }
  function openFacts(si) {
    var st = stations[si];
    openPop(cfg.id + '-s' + si, popCourse() + ' · Activity ' + cfg.id + ': ' + cfg.title, 'Station ' + (si + 1) + ': ' + st.title,
      function () { return factsHTML(st); }, 'Case facts only. Answer the questions in the main window.', false);
  }

  /* ---------- Stations ---------- */
  function header(st, si) {
    return '<p class="eyebrow">Station ' + (si + 1) + ' of ' + stations.length + '</p><h2 class="h2" id="px-h2" tabindex="-1">' + esc(st.title) + '</h2><div class="rule"></div>' + (hasFacts(st) ? '<div class="px-viewbar"><button type="button" class="btn ghost" data-act="pop">Open case facts in new window &#8599;</button><span>Keep the scenario and tables in view while you answer.</span></div>' : '') + '<p class="lead-p">' + st.instr + '</p>' + tableHTML(st.table);
  }
  function actionsRow(si, canCheck, label) {
    var done = isDone(si), st = stations[si], sc = stationScore(si), res = '';
    if (done && st.type !== 'reflect') res = '<span class="score ' + (sc.c === sc.n ? 'ok' : 'bad') + '">' + sc.c + ' of ' + sc.n + ' correct' + (S.attempts[si] > 1 ? ' &middot; attempt ' + S.attempts[si] : '') + '</span>';
    if (done && st.type === 'reflect') res = '<span class="score ok">Saved</span>';
    return '<div class="px-actions">' +
      (done ? '<button type="button" class="btn ghost" data-act="retry">' + (st.type === 'reflect' ? 'Edit responses' : '&#8635; Retry station') + '</button>'
            : '<button type="button" class="btn" data-act="check"' + (canCheck ? '' : ' disabled aria-disabled="true"') + '>' + (label || 'Check answers') + '</button>') +
      (st.hint && !done ? '<button type="button" class="btn secondary" data-act="hint" aria-expanded="false">Hint</button>' : '') + res + '</div>' +
      '<div id="px-hintbox" aria-live="polite"></div>';
  }
  function verdict(ok, label, why) {
    return '<div class="rationale show ' + (ok ? 'ok' : 'bad') + '"><b>' + (ok ? 'Correct.' : label) + '</b> ' + esc(why) + '</div>';
  }

  function renderSort(st, si, card) {
    var a = ans(si), done = isDone(si);
    var html = header(st, si) + '<div class="quiz-card">';
    st.items.forEach(function (it, i) {
      var right = a[i] === it.answer;
      html += '<div class="q"><p class="q-stem" id="si-' + si + '-' + i + '"><span class="qn">' + (i + 1) + '.</span>' + esc(it.text) + '</p>' +
        '<div class="px-seg" role="group" aria-labelledby="si-' + si + '-' + i + '">' + st.buckets.map(function (b, k) {
          var cls = done ? (k === it.answer && !right ? 'is-answer' : (a[i] === k ? (right ? 'is-right' : 'is-wrong') : '')) : '';
          return '<button type="button" class="' + cls + '" data-i="' + i + '" data-k="' + k + '" aria-pressed="' + (a[i] === k) + '"' + (done ? ' disabled' : '') + '>' + esc(b) + '</button>';
        }).join('') + '</div>' +
        (done ? verdict(right, 'Answer: ' + esc(st.buckets[it.answer]) + '.', it.why) : '') + '</div>';
    });
    html += actionsRow(si, st.items.every(function (_, i) { return a[i] != null; })) + '</div>';
    card.innerHTML = html;
    card.querySelectorAll('.px-seg button').forEach(function (b) {
      b.addEventListener('click', function () { a[+b.dataset.i] = +b.dataset.k; save(); rerender(b); });
    });
  }

  function renderScenario(st, si, card) {
    var a = ans(si), done = isDone(si), qn = 0;
    var html = header(st, si) + '<div class="quiz-card">';
    st.items.forEach(function (it, i) {
      html += '<div class="px-case-block">' + (it.title ? '<p class="eyebrow">' + esc(it.title) + '</p>' : '') + '<div class="px-case">' + esc(it.text) + '</div>' + tableHTML(it.table);
      it.parts.forEach(function (pt, j) {
        var key = i + '.' + j, name = 'q' + si + '_' + i + '_' + j, sid = 'qs-' + si + '-' + i + '-' + j; qn++;
        html += '<div class="q"><p class="q-stem" id="' + sid + '"><span class="qn">Q' + qn + '.</span>' + esc(pt.q) + '</p><fieldset class="options" aria-labelledby="' + sid + '">';
        pt.options.forEach(function (o, k) {
          var cls = done ? (k === pt.answer ? ' correct' : (a[key] === k ? ' wrong' : '')) + ' locked' : '';
          html += '<label class="opt' + cls + '"><input type="radio" name="' + name + '" data-key="' + key + '" value="' + k + '"' + (a[key] === k ? ' checked' : '') + (done ? ' disabled' : '') + '><span><span class="opt-letter">' + LETTERS[k] + '.</span> ' + esc(o) + '</span></label>';
        });
        html += '</fieldset>' + (done ? verdict(a[key] === pt.answer, 'Best answer: ' + LETTERS[pt.answer] + '.', pt.why) : '') + '</div>';
      });
      html += '</div>';
    });
    var allAnswered = function () { return st.items.every(function (it, i) { return it.parts.every(function (_, j) { return a[i + '.' + j] != null; }); }); };
    html += actionsRow(si, allAnswered()) + '</div>';
    card.innerHTML = html;
    card.querySelectorAll('input[type=radio]').forEach(function (r) {
      r.addEventListener('change', function () { a[r.dataset.key] = +r.value; save(); var c = card.querySelector('[data-act=check]'); if (c) { var ok = allAnswered(); c.disabled = !ok; c.setAttribute('aria-disabled', !ok); } });
    });
  }

  function renderOrder(st, si, card) {
    var done = isDone(si), groups = groupsOf(st);
    var html = header(st, si) + '<div class="quiz-card">';
    groups.forEach(function (g, gi) {
      var ord = orderOf(si, gi);
      html += '<div class="px-case-block">' + (g.title ? '<p class="eyebrow">' + esc(g.title) + '</p>' : '') + (g.text ? '<div class="px-case">' + esc(g.text) + '</div>' : '') + tableHTML(g.table) +
        '<p class="px-ord-end">' + esc(g.topLabel || st.topLabel || 'First') + '</p><ol class="px-order" aria-label="' + esc(g.title || st.title) + '">';
      ord.forEach(function (itemIdx, pos) {
        var it = g.items[itemIdx], okPos = it.accept || [it.rank], ok = okPos.indexOf(pos) >= 0;
        html += '<li class="px-ord-item' + (done ? (ok ? ' ok' : ' bad') : '') + '"><span class="px-ord-n">' + (pos + 1) + '</span><span class="px-ord-t">' + esc(it.text) + '</span>' +
          (done ? '' : '<span class="px-ord-btns"><button type="button" data-g="' + gi + '" data-p="' + pos + '" data-d="-1" aria-label="Move up: ' + esc(it.text) + '"' + (pos === 0 ? ' disabled' : '') + '>&#9650;</button><button type="button" data-g="' + gi + '" data-p="' + pos + '" data-d="1" aria-label="Move down: ' + esc(it.text) + '"' + (pos === ord.length - 1 ? ' disabled' : '') + '>&#9660;</button></span>') +
          (done ? verdict(ok, 'Belongs at ' + (okPos.length > 1 ? 'position ' + okPos.map(function (x) { return x + 1; }).join(' or ') : 'position ' + (it.rank + 1)) + '.', it.why) : '') + '</li>';
      });
      html += '</ol><p class="px-ord-end">' + esc(g.bottomLabel || st.bottomLabel || 'Last') + '</p></div>';
    });
    html += actionsRow(si, true) + '</div>';
    card.innerHTML = html;
    card.querySelectorAll('.px-ord-btns button').forEach(function (b) {
      b.addEventListener('click', function () {
        var gi = +b.dataset.g, p = +b.dataset.p, d = +b.dataset.d, ord = orderOf(si, gi), q = p + d;
        if (q < 0 || q >= ord.length) return;
        var tmp = ord[p]; ord[p] = ord[q]; ord[q] = tmp; save();
        var y = window.scrollY; render(); window.scrollTo(0, y);
        var nb = document.querySelector('[data-g="' + gi + '"][data-p="' + q + '"][data-d="' + d + '"]') || document.querySelector('[data-g="' + gi + '"][data-p="' + q + '"]');
        if (nb) nb.focus();
      });
    });
  }

  function renderCalc(st, si, card) {
    var a = ans(si), done = isDone(si);
    var html = header(st, si) + '<div class="quiz-card">';
    st.items.forEach(function (it, i) {
      var u = units(si)[i];
      html += '<div class="px-case-block">' + (it.title ? '<p class="eyebrow">' + esc(it.title) + '</p>' : '') + (it.text ? '<div class="px-case">' + esc(it.text) + '</div>' : '') + tableHTML(it.table) +
        '<div class="q"><label class="q-stem" for="cx-' + si + '-' + i + '"><span class="qn">Q' + (i + 1) + '.</span>' + esc(it.label) + '</label>' +
        '<div class="px-calc"><input type="number" inputmode="decimal" step="any" id="cx-' + si + '-' + i + '" data-i="' + i + '" value="' + esc(a[i] == null ? '' : a[i]) + '"' + (done ? ' readonly' : '') + ' class="' + (done ? (u.ok ? 'ok' : 'bad') : '') + '">' + (it.unit ? '<span>' + esc(it.unit) + '</span>' : '') + '</div>' +
        (done ? verdict(u.ok, 'Answer: ' + it.answer + (it.unit ? ' ' + esc(it.unit) : '') + '.', it.why) : '') + '</div></div>';
    });
    var all = function () { return st.items.every(function (_, i) { return a[i] != null && a[i] !== ''; }); };
    html += actionsRow(si, all()) + '</div>';
    card.innerHTML = html;
    card.querySelectorAll('.px-calc input').forEach(function (inp) {
      inp.addEventListener('input', function () { a[+inp.dataset.i] = inp.value; save(); var c = card.querySelector('[data-act=check]'); if (c) { c.disabled = !all(); c.setAttribute('aria-disabled', !all()); } });
    });
  }

  function renderReflect(st, si, card) {
    var done = isDone(si);
    var html = header(st, si) + '<div class="quiz-card"><p class="q-stem">How confident are you on each concept?</p>';
    cfg.concepts.forEach(function (c) {
      html += '<div class="px-conf-row" role="group" aria-label="Confidence: ' + esc(c.name) + '"><span>' + esc(c.name) + '</span><div class="px-seg">' +
        [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-c="' + c.key + '" data-n="' + n + '" aria-pressed="' + (S.conf[c.key] === n) + '"' + (done ? ' disabled' : '') + '>' + n + '</button>'; }).join('') + '</div></div>';
    });
    html += '<p class="lead-p" style="margin:.4rem 0 0;font-size:.82rem">1 = not confident &middot; 5 = ready for exam questions on this concept</p>';
    st.prompts.forEach(function (pr) {
      html += '<div class="px-field"><label for="tx-' + pr.key + '">' + esc(pr.label) + '</label><textarea id="tx-' + pr.key + '" data-k="' + pr.key + '"' + (done ? ' readonly' : '') + '>' + esc(S.text[pr.key] || '') + '</textarea></div>';
    });
    html += actionsRow(si, true, 'Save reflection') + '</div>';
    card.innerHTML = html;
    card.querySelectorAll('[data-c]').forEach(function (b) { b.addEventListener('click', function () { S.conf[b.dataset.c] = +b.dataset.n; save(); rerender(b); }); });
    card.querySelectorAll('textarea').forEach(function (t) { t.addEventListener('input', function () { S.text[t.dataset.k] = t.value; save(); }); });
  }

  /* ---------- Report ---------- */
  function fmtTime(ms) { var m = Math.round(ms / 60000); return m < 1 ? 'under 1 minute' : (m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'); }
  function renderReport(card) {
    var tot = { c: 0, n: 0 }, rows = '', review = [];
    stations.forEach(function (st, si) {
      if (st.type === 'reflect') { rows += '<tr><td>' + (si + 1) + '. ' + esc(st.title) + '</td><td>' + (isDone(si) ? 'Completed' : 'Not completed') + '</td><td class="num">&ndash;</td></tr>'; return; }
      var sc = stationScore(si);
      if (isDone(si)) { tot.c += sc.c; tot.n += sc.n; units(si).forEach(function (u) { if (!u.ok) review.push({ st: st, u: u }); }); }
      rows += '<tr><td>' + (si + 1) + '. ' + esc(st.title) + '</td><td>' + (isDone(si) ? 'Checked' + (S.attempts[si] > 1 ? ', ' + S.attempts[si] + ' attempts' : '') : 'Not attempted') + '</td><td class="num">' + (isDone(si) ? sc.c + ' / ' + sc.n : '&ndash;') + '</td></tr>';
    });
    var pct = tot.n ? Math.round(100 * tot.c / tot.n) : 0, m = mastery();
    var mrows = cfg.concepts.map(function (c) { var v = m[c.key]; return '<tr><td>' + esc(c.name) + '</td><td class="num">' + (v.n ? v.c + ' / ' + v.n + ' (' + Math.round(100 * v.c / v.n) + '%)' : 'Not attempted') + '</td><td class="num">' + (S.conf[c.key] ? S.conf[c.key] + ' / 5' : '&ndash;') + '</td></tr>'; }).join('');
    var refl = stations.filter(function (s) { return s.type === 'reflect'; }).map(function (st) {
      return st.prompts.map(function (pr) { return '<p class="px-refl"><b>' + esc(pr.label) + '</b>' + (S.text[pr.key] ? esc(S.text[pr.key]).replace(/\n/g, '<br>') : '<em>No response.</em>') + '</p>'; }).join('');
    }).join('');
    var allDone = stations.every(function (_, i) { return isDone(i); });

    card.innerHTML =
      '<div class="px-print-banner"><div class="t">CISM 5-Day Boot Camp &middot; CISM Practices &middot; Activity ' + esc(cfg.id) + ' &middot; Summary Report</div><div class="h">' + esc(cfg.title) + '</div></div>' +
      '<div class="px-no-print"><p class="eyebrow">Summary report</p><h2 class="h2" id="px-h2" tabindex="-1">Your results</h2><div class="rule"></div>' +
      '<p class="lead-p">Enter your name, then print the report or save it as a PDF. In the print dialog, choose <b>Save as PDF</b> as the destination.' + (allDone ? '' : ' <b>Some stations are not complete yet.</b> You can still print a partial report.') + '</p></div>' +
      '<div class="quiz-card px-report">' +
      '<div class="px-report-head">' +
        '<div class="px-field"><label for="rp-name">Learner name</label><input type="text" id="rp-name" value="' + esc(S.name) + '" autocomplete="name"></div>' +
        '<div class="px-field' + (S.team.trim() ? '' : ' px-empty') + '" id="rp-team-wrap"><label for="rp-team">Team members (optional)</label><input type="text" id="rp-team" value="' + esc(S.team) + '"></div>' +
      '</div>' +
      '<div class="table-wrap"><table class="data"><tbody>' +
        '<tr><td class="term">Activity</td><td>' + esc(cfg.id) + ', ' + esc(cfg.title) + ' (' + esc(cfg.domain) + ')</td></tr>' +
        '<tr><td class="term">Report generated</td><td>' + new Date().toLocaleString() + '</td></tr>' +
        '<tr><td class="term">Active time</td><td>' + fmtTime(S.elapsed) + '</td></tr>' +
        '<tr><td class="term">Overall score</td><td><b>' + (tot.n ? tot.c + ' of ' + tot.n + ' (' + pct + '%)' : 'No stations checked yet') + '</b></td></tr>' +
      '</tbody></table></div>' +
      '<h3>Score by station</h3><div class="table-wrap"><table class="data"><thead><tr><th>Station</th><th>Status</th><th class="num">Score</th></tr></thead><tbody>' + rows +
        '<tr class="px-total"><td>Total</td><td></td><td class="num">' + (tot.n ? tot.c + ' / ' + tot.n : '&ndash;') + '</td></tr></tbody></table></div>' +
      '<h3>Mastery by concept</h3><div class="table-wrap"><table class="data"><thead><tr><th>Concept</th><th class="num">Correct</th><th class="num">Self-rated confidence</th></tr></thead><tbody>' + mrows + '</tbody></table></div>' +
      '<h3>Items to review</h3>' + (review.length ? '<ol class="px-review">' + review.map(function (r) {
        return '<li><b>' + esc(r.u.prompt) + '</b><br>Your answer: ' + esc(r.u.given) + '. Correct: ' + esc(r.u.correct) + '.<br>' + esc(r.u.why) +
          (r.st.review ? ' <span class="px-no-print">(<a href="' + esc(r.st.review.href) + '">' + esc(r.st.review.label) + '</a>)</span><span class="px-print-inline">Review: ' + esc(r.st.review.label) + '.</span>' : '') + '</li>';
      }).join('') + '</ol>' : '<p class="px-refl">' + (tot.n ? 'No missed items. Well done.' : 'Check at least one station to see items to review.') + '</p>') +
      '<h3>Recommended next steps</h3><ul class="px-review">' + cfg.concepts.map(function (c) {
        var v = m[c.key], p = v.n ? v.c / v.n : null;
        if (p === null) return '<li><b>' + esc(c.name) + ':</b> not attempted yet.</li>';
        return '<li><b>' + esc(c.name) + ':</b> ' + (p >= 0.8 ? 'solid. Move on to timed practice questions.' : (p >= 0.6 ? 'developing. Reread the lesson section and retry the station.' : 'needs work. Review ' + esc(c.review || cfg.lessonLabel) + ' before continuing.')) + '</li>';
      }).join('') + '</ul>' +
      '<h3>Reflections</h3>' + (refl || '<p class="px-refl">None.</p>') +
      '<div class="px-sign"><div>Learner signature</div><div>Instructor initials / date</div></div>' +
      '<div class="px-actions"><button type="button" class="btn" data-nav="print">&#128424; Print / Save as PDF</button><button type="button" class="btn ghost" data-nav="restart">&#8635; Start over</button></div>' +
      '</div>';
    card.querySelector('#rp-name').addEventListener('input', function (e) { S.name = e.target.value; save(); e.target.style.borderColor = ''; });
    card.querySelector('#rp-team').addEventListener('input', function (e) { S.team = e.target.value; save(); card.querySelector('#rp-team-wrap').classList.toggle('px-empty', !S.team.trim()); });
  }

  /* ---------- Navigation: lesson-style pager, never a dead Next ---------- */
  function stepName(i) { return i === REPORT ? 'Summary report' : 'Station ' + (i + 1) + ': ' + (stations[i].short || stations[i].title); }
  function pager() {
    var prev = S.cur > 0
      ? '<a href="#" class="prev" data-nav="prev"><span class="pager-dir">&#8592; Previous</span><span class="pager-name">' + esc(stepName(S.cur - 1)) + '</span></a>'
      : '<a href="' + esc(cfg.lessonHref) + '" class="prev"><span class="pager-dir">&#8592; Back to lesson</span><span class="pager-name">' + esc(cfg.lessonLabel) + '</span></a>';
    var next = S.cur < REPORT
      ? '<a href="#" class="next" data-nav="next"><span class="pager-dir">Next &#8594;</span><span class="pager-name">' + esc(stepName(S.cur + 1)) + '</span></a>'
      : '<a href="practices.html" class="next"><span class="pager-dir">Continue &#8594;</span><span class="pager-name">CISM Practices: all activities</span></a>';
    return '<nav class="pager px-pager" aria-label="Station navigation"><div class="pager-inner">' + prev + next + '</div></nav>';
  }

  function render() {
    renderSteps(); renderMastery();
    var stage = document.getElementById('px-stage');
    stage.innerHTML = '<section class="block" id="px-card" style="margin-bottom:0"></section>' + pager();
    var card = document.getElementById('px-card');
    if (S.cur === REPORT) renderReport(card);
    else { var st = stations[S.cur]; ({ sort: renderSort, scenario: renderScenario, order: renderOrder, calc: renderCalc, reflect: renderReflect })[st.type](st, S.cur, card); }
    card.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var si = S.cur, st = stations[si];
        if (b.dataset.act === 'check') { S.checked[si] = true; S.attempts[si] = (S.attempts[si] || 0) + 1; save(); render(); }
        if (b.dataset.act === 'retry') { S.checked[si] = false; if (st.type !== 'reflect') S.ans[si] = {}; save(); render(); }
        if (b.dataset.act === 'pop') { openFacts(si); return; }
        if (b.dataset.act === 'hint') {
          var box = document.getElementById('px-hintbox'), open = b.getAttribute('aria-expanded') === 'true';
          box.innerHTML = open ? '' : '<div class="tip"><span class="tip-label">&#128161; Hint</span>' + st.hint + '</div>';
          b.setAttribute('aria-expanded', !open);
        }
      });
    });
    stage.querySelectorAll('[data-nav]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        var n = b.dataset.nav; e.preventDefault();
        if (n === 'prev') go(S.cur - 1);
        if (n === 'next') go(S.cur + 1);
        if (n === 'print') {
          if (!S.name.trim()) { var f = document.getElementById('rp-name'); f.focus(); f.style.borderColor = 'var(--gold)'; if (!confirm('No learner name entered. Print anyway?')) return; }
          window.print();
        }
        if (n === 'restart') { if (confirm('Start over? This clears every answer and reflection for this activity in this browser.')) { var nm = S.name; S = blank(); S.name = nm; save(); go(0); } }
      });
    });
  }
  function rerender(btn) {
    var sel = btn ? '[data-i="' + btn.dataset.i + '"][data-k="' + btn.dataset.k + '"],[data-c="' + btn.dataset.c + '"][data-n="' + btn.dataset.n + '"]' : null;
    var y = window.scrollY; render(); window.scrollTo(0, y);
    if (sel) { var t = document.querySelector(sel); if (t) t.focus(); }
  }
  function go(i) {
    S.cur = Math.max(0, Math.min(REPORT, i)); save(); render();
    var top = document.querySelector('.px-layout').getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo(0, window.scrollY > top ? top : window.scrollY);
    var h = document.getElementById('px-h2'); if (h) h.focus({ preventScroll: true });
  }

  document.title = cfg.id + ' ' + cfg.title + ' | CISM 5-Day Boot Camp';
  document.documentElement.removeAttribute('data-theme');
  shell(); render();
})();

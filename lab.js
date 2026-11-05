/* CISM 5-Day Boot Camp: shared engine for hands-on labs.
   A lab page sets window.LAB = { ... } and loads this file after practice.css.
   Flow: Ticket brief -> Workbench (lab-specific tool + checklist) -> Lab report.
   Checklist item types: "set" (list of IDs), "number" (numeric with tolerance),
   "choice" (multiple choice), "text" (written deliverable, graded for completeness).
   Self-checking: each item can be checked and retried; revealing the debrief before
   the item is verified forfeits its points. The report prints or saves as PDF. */
(function () {
  'use strict';
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

  var L = window.LAB;
  if (!L) return;
  var KEY = 'cism-lab-' + L.id, LETTERS = 'ABCDEFGH';
  var items = L.checklist;
  var STEPS = [{ key: 'brief', title: 'Ticket brief' }, { key: 'work', title: L.workbenchTitle || 'Workbench' }, { key: 'report', title: 'Lab report' }];

  function blank() { return { v: 1, step: 0, a: {}, st: {}, tries: {}, revealed: {}, name: '', team: '', elapsed: 0, notes: '' }; }
  var S = blank();
  try { var raw = localStorage.getItem(KEY); if (raw) { var p = JSON.parse(raw); if (p && p.v === 1) S = Object.assign(blank(), p); } } catch (e) { }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  var last = Date.now();
  setInterval(function () { var n = Date.now(); if (document.visibilityState === 'visible') S.elapsed += Math.min(n - last, 10000); last = n; save(); }, 5000);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function totalPts() { return items.reduce(function (s, it) { return s + it.points; }, 0); }
  function earned() { return items.reduce(function (s, it) { return s + (S.st[it.id] === 'ok' ? it.points : 0); }, 0); }
  function doneCount() { return items.filter(function (it) { return S.st[it.id] === 'ok'; }).length; }

  /* ---------- Grading ---------- */
  function norm(x) { return String(x).trim().toUpperCase(); }
  function parseSet(s) { return String(s || '').split(/[\s,;]+/).map(norm).filter(Boolean).filter(function (v, i, arr) { return arr.indexOf(v) === i; }); }
  function expected(it) { return typeof it.answer === 'function' ? it.answer() : it.answer; }
  function grade(it) {
    var g = S.a[it.id], exp = expected(it);
    if (it.type === 'set') {
      var got = parseSet(g), want = exp.map(norm);
      var missing = want.filter(function (x) { return got.indexOf(x) < 0; }), extra = got.filter(function (x) { return want.indexOf(x) < 0; });
      return { ok: !missing.length && !extra.length, msg: missing.length || extra.length ? (missing.length ? missing.length + ' expected ' + (missing.length === 1 ? 'item is' : 'items are') + ' missing. ' : '') + (extra.length ? extra.length + ' ' + (extra.length === 1 ? 'entry does not belong' : 'entries do not belong') + ': ' + extra.join(', ') + '.' : '') : 'All ' + want.length + ' items identified.' };
    }
    if (it.type === 'number') { var v = parseFloat(g); var ok = !isNaN(v) && Math.abs(v - exp) <= (it.tol || 0); return { ok: ok, msg: ok ? 'Correct.' : 'Not quite. Recheck the figures and the rules in the lab.' }; }
    if (it.type === 'choice') { var okc = +g === exp; return { ok: okc, msg: okc ? 'Correct.' : 'Not the best answer.' }; }
    if (it.type === 'text') {
      var miss = it.fields.filter(function (f) { return String((g || {})[f.key] || '').trim().length < (f.min || 20); });
      return { ok: !miss.length, msg: miss.length ? 'Complete every element. Still too short: ' + miss.map(function (f) { return f.label; }).join(', ') + '.' : 'All elements are complete. Compare your wording with the model finding below.' };
    }
    return { ok: false, msg: '' };
  }
  function answered(it) {
    var g = S.a[it.id];
    if (it.type === 'text') return it.fields.some(function (f) { return String((g || {})[f.key] || '').trim(); });
    return g != null && String(g).trim() !== '';
  }
  function givenText(it) {
    var g = S.a[it.id];
    if (!answered(it)) return '(no answer)';
    if (it.type === 'choice') return LETTERS[+g] + '. ' + it.options[+g];
    if (it.type === 'set') return parseSet(g).join(', ');
    if (it.type === 'text') return '';
    return String(g);
  }
  function correctText(it) {
    var exp = expected(it);
    if (it.type === 'choice') return LETTERS[exp] + '. ' + it.options[exp];
    if (it.type === 'set') return exp.join(', ');
    if (it.type === 'number') return String(exp);
    return '';
  }

  /* ---------- Shell ---------- */
  function catalogList(list) {
    return '<ul class="px-catalog">' + list.map(function (r) {
      if (r[0] === L.id) return '<li><span class="cur" aria-current="page"><b>' + r[0] + '</b>' + esc(r[2]) + '</span></li>';
      if (BUILT.indexOf(r[0]) >= 0) return '<li><a href="' + r[1] + '"><b>' + r[0] + '</b>' + esc(r[2]) + '</a></li>';
      return '<li><span class="soon" aria-disabled="true"><b>' + r[0] + '</b>' + esc(r[2]) + '<em>Soon</em></span></li>';
    }).join('') + '</ul>';
  }
  function heroTitle() {
    function nb(s) { return esc(s).replace(/(\S+-\S+)/g, '<span class="px-nw">$1</span>'); }
    var t = L.title, a = L.accent || '', i = a ? t.indexOf(a) : -1;
    return i < 0 ? nb(t) : nb(t.slice(0, i)) + '<span>' + nb(a) + '</span>' + nb(t.slice(i + a.length));
  }
  function shell() {
    document.getElementById('app').innerHTML =
      '<nav class="topnav"><a href="index.html" class="nav-brand"><div class="nav-seal">CISM<br>PREP</div><span class="nav-title">5-Day Boot Camp</span></a>' +
        '<div class="nav-right"><ul class="nav-links"><li><a href="index.html">Home</a></li><li><a href="index.html#lessons">Lessons</a></li><li><a href="index.html#schedule">Schedule</a></li><li><a href="practices.html">Practices</a></li><li><a href="labs.html">Leadership Lab</a></li><li><a href="index.html#exam-prep">Exam Prep</a></li></ul></div></nav>' +
      '<header class="lesson-hero"><div class="lesson-hero-inner">' +
        '<p class="breadcrumb"><a href="index.html">Boot Camp</a> &nbsp;&rsaquo;&nbsp; <a href="labs.html">CISM Leadership Lab</a> &nbsp;&rsaquo;&nbsp; <span>Lab ' + esc(L.id) + '</span></p>' +
        '<span class="lesson-badge-lg">CISM Leadership Lab &middot; Lab ' + esc(L.id) + ' &middot; ' + esc(L.domain) + '</span>' +
        '<h1>' + heroTitle() + '</h1><p class="lesson-lede">' + esc(L.lede) + '</p>' +
        '<div class="meta-chips"><span class="meta-chip">Ticket: <strong>' + esc(L.ticket.number) + '</strong></span><span class="meta-chip">Time: <strong>' + esc(L.time) + '</strong></span><span class="meta-chip">Level: <strong>' + esc(L.level) + '</strong></span>' +
        '<span class="meta-chip">Checklist: <strong>' + items.length + ' items, ' + totalPts() + ' pts</strong></span><span class="meta-chip">Mode: <strong>Individual or team</strong></span>' +
        '<a class="meta-chip" style="text-decoration:none" href="' + esc(L.lessonHref) + '">Review: <strong>' + esc(L.lessonLabel) + '</strong></a></div>' +
      '</div></header>' +
      '<div class="px-layout">' +
        '<aside class="px-rail" aria-label="Lab navigation">' +
          '<p class="eyebrow">Lab steps</p><ol class="px-steps" id="lb-steps"></ol>' +
          '<section class="px-mastery" aria-live="polite"><p class="eyebrow">Checklist progress</p><div id="lb-prog"></div><ol class="lb-check" id="lb-check"></ol></section>' +
          '<div class="px-more"><details><summary>All activities</summary>' + catalogList(CATALOG.activities) + '</details>' +
          '<details><summary>All labs</summary>' + catalogList(CATALOG.labs) + '</details><a class="px-hub" href="labs.html">CISM Leadership Lab home &rarr;</a><a class="px-hub" href="practices.html">CISM Practices home &rarr;</a></div>' +
        '</aside>' +
        '<main class="px-content" id="main"><div id="lb-stage"></div></main>' +
      '</div>' +
      '<footer><div class="footer-logo">CISM 5-DAY BOOT CAMP</div><p class="footer-disclaimer">This boot camp is an independent educational resource and is not affiliated with, endorsed by, or sponsored by ISACA. CISM&#174; is a registered trademark of ISACA. Lab data, companies, and people are fictional. Everything runs in your browser; progress is saved in this browser only.</p></footer>';
  }

  function renderRail() {
    var ol = document.getElementById('lb-steps'); ol.innerHTML = '';
    STEPS.forEach(function (s, i) {
      var li = document.createElement('li'), b = document.createElement('button');
      b.className = 'px-step' + ((i === 0 && S.seenBrief) || (i === 1 && doneCount() === items.length) ? ' done' : '');
      if (i === S.step) b.setAttribute('aria-current', 'step');
      b.innerHTML = '<span class="dot" aria-hidden="true">' + (i === 2 ? '&#9998;' : i + 1) + '</span><span>' + esc(s.title) + '</span>';
      b.addEventListener('click', function () { go(i); });
      li.appendChild(b); ol.appendChild(li);
    });
    var pct = Math.round(100 * earned() / totalPts());
    document.getElementById('lb-prog').innerHTML = '<div class="px-m-item"><div class="px-m-row"><span>' + doneCount() + ' of ' + items.length + ' verified</span><b>' + earned() + ' / ' + totalPts() + '</b></div><div class="px-bar ' + (pct >= 80 ? 'hi' : '') + '" role="img" aria-label="Score ' + pct + ' percent"><i style="width:' + pct + '%"></i></div></div>';
    document.getElementById('lb-check').innerHTML = items.map(function (it, i) {
      var st = S.st[it.id], cls = st === 'ok' ? 'ok' : (S.revealed[it.id] ? 'rev' : (S.tries[it.id] ? 'bad' : ''));
      return '<li><button type="button" class="lb-ci ' + cls + '" data-jump="' + i + '"><span class="lb-ci-dot" aria-hidden="true">' + (st === 'ok' ? '&#10003;' : (S.revealed[it.id] ? '!' : i + 1)) + '</span><span>' + esc(it.short || it.title) + '</span><span class="sr-only">' + (st === 'ok' ? ' (verified)' : '') + '</span></button></li>';
    }).join('');
    document.querySelectorAll('[data-jump]').forEach(function (b) {
      b.addEventListener('click', function () { var i = +b.dataset.jump; if (S.step !== 1) go(1); var t = document.getElementById('ci-' + i); if (t) { t.scrollIntoView({ block: 'start' }); var h = t.querySelector('.q-stem'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } } });
    });
  }

  /* ---------- Step 1: ticket brief ---------- */
  function renderBrief(card) {
    S.seenBrief = true; save();
    var t = L.ticket;
    card.innerHTML = '<p class="eyebrow">Step 1 of 3</p><h2 class="h2" id="px-h2" tabindex="-1">Ticket brief</h2><div class="rule"></div>' +
      '<div class="lb-ticket"><div class="lb-ticket-head"><span class="lb-tno">' + esc(t.number) + '</span><span class="lb-prio">' + esc(t.priority || 'Normal priority') + '</span></div>' +
      '<dl class="lb-meta"><dt>From</dt><dd>' + esc(t.from) + '</dd><dt>To</dt><dd>' + esc(t.to) + '</dd><dt>Subject</dt><dd><b>' + esc(t.subject) + '</b></dd>' + (t.due ? '<dt>Due</dt><dd>' + esc(t.due) + '</dd>' : '') + '</dl>' +
      '<div class="lb-body">' + t.body + '</div></div>' +
      '<div class="quiz-card" style="margin-top:1.4rem"><p class="q-stem">Your checklist</p><ol class="lb-brief-list">' + items.map(function (it) { return '<li><b>' + esc(it.title) + '</b> <span class="lb-pts">' + it.points + ' pts</span></li>'; }).join('') + '</ol>' +
      (L.howTo ? '<div class="tip"><span class="tip-label">&#128161; How this lab works</span>' + L.howTo + '</div>' : '') + '</div>';
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

  function ticketSnap() {
    var t = L.ticket;
    return '<div class="lb-ticket"><div class="lb-ticket-head"><span class="lb-tno">' + esc(t.number) + '</span><span class="lb-prio">' + esc(t.priority || 'Normal priority') + '</span></div>' +
      '<dl class="lb-meta"><dt>From</dt><dd>' + esc(t.from) + '</dd><dt>To</dt><dd>' + esc(t.to) + '</dd><dt>Subject</dt><dd><b>' + esc(t.subject) + '</b></dd>' + (t.due ? '<dt>Due</dt><dd>' + esc(t.due) + '</dd>' : '') + '</dl>' +
      '<div class="lb-body">' + t.body + '</div></div>';
  }
  function popTargets() {
    var tool = document.getElementById('lb-tool');
    var out = [{ key: 'ticket', name: 'Ticket brief', snap: ticketSnap, live: false }];
    if (!tool) return out;
    var panels = [].filter.call(tool.querySelectorAll('[role="tabpanel"]'), function (p) { return !(p.parentElement && p.parentElement.closest('[role="tabpanel"]')); });
    if (!panels.length) out.push({ key: 'tool', name: STEPS[1].title, live: true, snap: function () { var t = document.getElementById('lb-tool'); return t && t.firstElementChild ? liveSnapshot(t.firstElementChild, t.parentElement) : null; } });
    panels.forEach(function (p, i) {
      var id = p.id, lb = p.getAttribute('aria-labelledby');
      var tab = (lb && document.getElementById(lb)) || (id && tool.querySelector('[aria-controls="' + id + '"]'));
      var name = (tab ? tab.textContent : 'Panel ' + (i + 1)).replace(/\s+/g, ' ').trim();
      out.push({ key: 'p-' + (id || i), name: name, live: true, snap: function () {
        var t = document.getElementById('lb-tool'), el = id ? document.getElementById(id) : null;
        return el && t ? liveSnapshot(el, t.parentElement) : null;
      } });
    });
    return out;
  }
  function setupViewbar() {
    var sel = document.getElementById('lb-pop-sel'), go = document.getElementById('lb-pop-go'), sb = document.getElementById('lb-split-btn');
    if (!sel || !go || !sb) return;
    var T = popTargets();
    sel.innerHTML = T.map(function (t, i) { return '<option value="' + i + '">' + esc(t.name) + '</option>'; }).join('');
    var cur = document.querySelector('#lb-tool [role="tab"][aria-selected="true"]');
    if (cur) T.forEach(function (t, i) { if (t.name === cur.textContent.replace(/\s+/g, ' ').trim()) sel.value = String(i); });
    go.onclick = function () {
      var t = popTargets()[+sel.value]; if (!t) return;
      openPop(L.id + '-' + t.key, popCourse() + ' · Lab ' + L.id + ': ' + L.title, t.name,
        function () { return t.snap() || '<p class="lead-p">Open the workbench in the main window to refresh this view.</p>'; },
        t.live ? 'Live, read-only view. It updates as you work in the main window.' : 'Read-only copy of the ticket.', t.live);
    };
    sb.setAttribute('aria-pressed', S.split ? 'true' : 'false');
    sb.textContent = S.split ? 'Stacked view' : 'Side-by-side view';
    sb.onclick = function () { S.split = !S.split; save(); applySplit(); setupViewbar(); try { window.dispatchEvent(new Event('resize')); } catch (e) { } };
  }
  function applySplit() { document.body.classList.toggle('lb-split-on', !!S.split && S.step === 1); }

  /* ---------- Step 2: workbench + checklist ---------- */
  function itemHTML(it, i) {
    var st = S.st[it.id], g = S.a[it.id], locked = st === 'ok';
    var lk = !locked && typeof it.locked === 'function' ? it.locked() : false;
    if (lk) return '<div class="q lb-item lb-locked" id="ci-' + i + '"><p class="q-stem"><span class="qn">' + (i + 1) + '.</span>' + esc(it.title) + ' <span class="lb-pts">' + it.points + ' pts</span></p><p class="lead-p">&#128274; ' + esc(lk) + '</p></div>';
    var h = '<div class="q lb-item' + (locked ? ' ok' : '') + '" id="ci-' + i + '"><p class="q-stem"><span class="qn">' + (i + 1) + '.</span>' + esc(it.title) + ' <span class="lb-pts">' + it.points + ' pts</span></p>' +
      '<p class="lead-p" style="margin-bottom:.8rem">' + it.task + '</p>';
    if (it.type === 'set') h += '<div class="px-field"><label for="in-' + it.id + '">' + esc(it.label || 'Enter the IDs, separated by commas') + '</label><input type="text" id="in-' + it.id + '" data-id="' + it.id + '" value="' + esc(g || '') + '"' + (locked ? ' readonly' : '') + ' placeholder="' + esc(it.placeholder || '') + '" autocomplete="off" spellcheck="false"></div>';
    if (it.type === 'number') h += '<div class="px-calc"><input type="number" step="any" id="in-' + it.id + '" data-id="' + it.id + '" value="' + esc(g == null ? '' : g) + '"' + (locked ? ' readonly' : '') + ' aria-label="' + esc(it.title) + '">' + (it.unit ? '<span>' + esc(it.unit) + '</span>' : '') + '</div>';
    if (it.type === 'choice') h += '<fieldset class="options" aria-label="' + esc(it.title) + '">' + it.options.map(function (o, k) {
      var cls = locked ? (k === expected(it) ? ' correct' : '') + ' locked' : '';
      return '<label class="opt' + cls + '"><input type="radio" name="ch-' + it.id + '" data-id="' + it.id + '" value="' + k + '"' + (+g === k && g != null ? ' checked' : '') + (locked ? ' disabled' : '') + '><span><span class="opt-letter">' + LETTERS[k] + '.</span> ' + esc(o) + '</span></label>';
    }).join('') + '</fieldset>';
    if (it.type === 'text') h += it.fields.map(function (f) { return '<div class="px-field"><label for="in-' + it.id + '-' + f.key + '">' + esc(f.label) + '</label><textarea id="in-' + it.id + '-' + f.key + '" data-id="' + it.id + '" data-f="' + f.key + '"' + (locked ? ' readonly' : '') + ' placeholder="' + esc(f.placeholder || '') + '">' + esc((g || {})[f.key] || '') + '</textarea></div>'; }).join('');
    var res = S.tries[it.id] ? grade(it) : null;
    h += '<div class="px-actions">' + (locked ? '<span class="score ok">&#10003; Verified &middot; ' + it.points + ' pts</span>' : '<button type="button" class="btn" data-check="' + it.id + '">Check</button>' +
      (it.hint ? '<button type="button" class="btn secondary" data-hint="' + it.id + '" aria-expanded="false">Hint</button>' : '') +
      (S.tries[it.id] && !S.revealed[it.id] ? '<button type="button" class="btn ghost" data-reveal="' + it.id + '">Reveal debrief (0 pts)</button>' : '') +
      (res ? '<span class="score bad">' + esc(res.msg) + '</span>' : '')) + '</div><div id="hint-' + it.id + '"></div>';
    if (locked && res && res.msg !== 'Correct.') h += '<div class="rationale show ok"><b>' + esc(res.msg) + '</b></div>';
    if (locked || S.revealed[it.id]) h += '<div class="lb-debrief"><span class="lb-debrief-label">&#128270; Manager&rsquo;s debrief</span>' + (S.revealed[it.id] && !locked && it.type !== 'text' ? '<p><b>Expected answer:</b> ' + esc(correctText(it)) + '</p>' : '') + it.debrief + '</div>';
    return h + '</div>';
  }
  function renderWork(card) {
    card.innerHTML = '<p class="eyebrow">Step 2 of 3</p><h2 class="h2" id="px-h2" tabindex="-1">' + esc(STEPS[1].title) + '</h2><div class="rule"></div>' +
      (L.workIntro ? '<p class="lead-p">' + L.workIntro + '</p>' : '') +
      '<div class="lb-viewbar" role="group" aria-label="View options"><span class="lb-viewbar-label">Keep the facts in view</span>' +
        '<label class="sr-only" for="lb-pop-sel">Choose what to open in a new window</label><select id="lb-pop-sel"></select>' +
        '<button type="button" class="btn ghost" id="lb-pop-go">Open in new window &#8599;</button>' +
        '<button type="button" class="btn ghost" id="lb-split-btn" aria-pressed="false">Side-by-side view</button></div>' +
      '<div class="lb-split" id="lb-split"><div class="lb-split-tool"><div id="lb-tool"></div></div>' +
      '<div class="lb-split-list"><h3 class="lb-h3" id="lb-checklist">Checklist</h3><div class="quiz-card" id="lb-items">' + items.map(itemHTML).join('') + '</div></div></div>';
    L.workbench(document.getElementById('lb-tool'), API);
    wireItems();
    setupViewbar();
  }
  function rerenderItem(i, focusSel) {
    var el = document.getElementById('ci-' + i); if (!el) return;
    var tmp = document.createElement('div'); tmp.innerHTML = itemHTML(items[i], i); el.replaceWith(tmp.firstChild);
    wireItems(); renderRail();
    if (focusSel) { var f = document.querySelector(focusSel); if (f) f.focus(); }
  }
  function wireItems() {
    var box = document.getElementById('lb-items'); if (!box) return;
    box.querySelectorAll('input[type=text],input[type=number]').forEach(function (inp) { if (inp.dataset.w) return; inp.dataset.w = 1; inp.addEventListener('input', function () { S.a[inp.dataset.id] = inp.value; save(); }); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var b = box.querySelector('[data-check="' + inp.dataset.id + '"]'); if (b) b.click(); } }); });
    box.querySelectorAll('input[type=radio]').forEach(function (r) { if (r.dataset.w) return; r.dataset.w = 1; r.addEventListener('change', function () { S.a[r.dataset.id] = +r.value; save(); }); });
    box.querySelectorAll('textarea').forEach(function (t) { if (t.dataset.w) return; t.dataset.w = 1; t.addEventListener('input', function () { var o = S.a[t.dataset.id] || {}; o[t.dataset.f] = t.value; S.a[t.dataset.id] = o; save(); }); });
    box.querySelectorAll('[data-check]').forEach(function (b) { if (b.dataset.w) return; b.dataset.w = 1; b.addEventListener('click', function () {
      var id = b.dataset.check, i = idx(id), it = items[i];
      if (!answered(it)) { document.getElementById('hint-' + id).innerHTML = '<div class="rationale show bad"><b>Enter an answer first.</b></div>'; return; }
      S.tries[id] = (S.tries[id] || 0) + 1; var r = grade(it);
      if (r.ok && !S.revealed[id]) S.st[id] = 'ok';
      save(); rerenderItem(i, '#ci-' + i + ' .px-actions .score, #ci-' + i + ' [data-check]');
    }); });
    box.querySelectorAll('[data-hint]').forEach(function (b) { if (b.dataset.w) return; b.dataset.w = 1; b.addEventListener('click', function () {
      var id = b.dataset.hint, open = b.getAttribute('aria-expanded') === 'true', it = items[idx(id)];
      document.getElementById('hint-' + id).innerHTML = open ? '' : '<div class="tip"><span class="tip-label">&#128161; Hint</span>' + it.hint + '</div>'; b.setAttribute('aria-expanded', !open);
    }); });
    box.querySelectorAll('[data-reveal]').forEach(function (b) { if (b.dataset.w) return; b.dataset.w = 1; b.addEventListener('click', function () {
      if (!confirm('Reveal the debrief? This item will earn 0 points, but you can still record your answer.')) return;
      var id = b.dataset.reveal; S.revealed[id] = true; save(); rerenderItem(idx(id));
    }); });
  }
  function idx(id) { for (var i = 0; i < items.length; i++) if (items[i].id === id) return i; return -1; }

  /* ---------- Step 3: report ---------- */
  function fmtTime(ms) { var m = Math.round(ms / 60000); return m < 1 ? 'under 1 minute' : (m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'); }
  function renderReport(card) {
    var e = earned(), T = totalPts(), pct = Math.round(100 * e / T);
    var rows = items.map(function (it, i) {
      var st = S.st[it.id] === 'ok' ? 'Verified' : (S.revealed[it.id] ? 'Debrief revealed' : (S.tries[it.id] ? 'Not yet correct' : 'Not attempted'));
      return '<tr><td>' + (i + 1) + '. ' + esc(it.title) + '</td><td>' + st + (S.tries[it.id] > 1 ? ' (' + S.tries[it.id] + ' checks)' : '') + '</td><td class="num">' + (S.st[it.id] === 'ok' ? it.points : 0) + ' / ' + it.points + '</td></tr>';
    }).join('');
    var answers = items.filter(function (it) { return it.type !== 'text'; }).map(function (it) {
      var ok = S.st[it.id] === 'ok';
      return '<li><b>' + esc(it.title) + ':</b> ' + esc(givenText(it)) + (ok ? '' : (S.revealed[it.id] ? ' <span class="lb-exp">Expected: ' + esc(correctText(it)) + '</span>' : '')) + '</li>';
    }).join('');
    var textItems = items.filter(function (it) { return it.type === 'text'; }).map(function (it) {
      var g = S.a[it.id] || {};
      return '<h3>' + esc(it.reportTitle || it.title) + '</h3>' + it.fields.map(function (f) { return '<p class="px-refl"><b>' + esc(f.label) + '</b>' + (g[f.key] ? esc(g[f.key]).replace(/\n/g, '<br>') : '<em>Not completed.</em>') + '</p>'; }).join('');
    }).join('');
    var review = items.filter(function (it) { return S.st[it.id] !== 'ok' && (S.tries[it.id] || S.revealed[it.id]); });
    card.innerHTML =
      '<div class="px-print-banner"><div class="t">CISM 5-Day Boot Camp &middot; CISM Leadership Lab &middot; Lab ' + esc(L.id) + ' &middot; Lab Report</div><div class="h">' + esc(L.title) + '</div></div>' +
      '<div class="px-no-print"><p class="eyebrow">Step 3 of 3</p><h2 class="h2" id="px-h2" tabindex="-1">Lab report</h2><div class="rule"></div>' +
      '<p class="lead-p">Enter your name, or your team name and members, then print the report or save it as a PDF. In the print dialog, choose <b>Save as PDF</b>.' + (doneCount() < items.length ? ' <b>Some checklist items are not verified yet.</b> You can still print a partial report.' : '') + '</p></div>' +
      '<div class="quiz-card px-report"><div class="px-report-head">' +
        '<div class="px-field"><label for="rp-name">Learner or team name</label><input type="text" id="rp-name" value="' + esc(S.name) + '" autocomplete="name"></div>' +
        '<div class="px-field' + (S.team.trim() ? '' : ' px-empty') + '" id="rp-team-wrap"><label for="rp-team">Team members (optional)</label><input type="text" id="rp-team" value="' + esc(S.team) + '"></div></div>' +
      '<div class="table-wrap"><table class="data"><tbody>' +
        '<tr><td class="term">Lab</td><td>' + esc(L.id) + ', ' + esc(L.title) + ' (' + esc(L.domain) + ')</td></tr>' +
        '<tr><td class="term">Ticket</td><td>' + esc(L.ticket.number) + ', ' + esc(L.ticket.subject) + '</td></tr>' +
        '<tr><td class="term">Report generated</td><td>' + new Date().toLocaleString() + '</td></tr>' +
        '<tr><td class="term">Active time</td><td>' + fmtTime(S.elapsed) + '</td></tr>' +
        '<tr><td class="term">Score</td><td><b>' + e + ' of ' + T + ' (' + pct + '%)</b>, ' + doneCount() + ' of ' + items.length + ' checklist items verified</td></tr>' +
      '</tbody></table></div>' +
      '<h3>Checklist results</h3><div class="table-wrap"><table class="data"><thead><tr><th>Item</th><th>Status</th><th class="num">Points</th></tr></thead><tbody>' + rows +
        '<tr class="px-total"><td>Total</td><td></td><td class="num">' + e + ' / ' + T + '</td></tr></tbody></table></div>' +
      '<h3>Answers recorded</h3><ul class="px-review">' + answers + '</ul>' + textItems +
      '<h3>Items to review</h3>' + (review.length ? '<ol class="px-review">' + review.map(function (it) { return '<li><b>' + esc(it.title) + '.</b> ' + esc(it.reviewNote || '') + ' <span class="px-no-print">(<a href="' + esc(L.lessonHref) + '">' + esc(L.lessonLabel) + '</a>)</span><span class="px-print-inline">Review: ' + esc(L.lessonLabel) + '.</span></li>'; }).join('') + '</ol>' : '<p class="px-refl">' + (doneCount() ? 'Nothing outstanding among attempted items.' : 'No items attempted yet.') + '</p>') +
      '<div class="px-sign"><div>Learner signature</div><div>Instructor initials / date</div></div>' +
      '<div class="px-actions"><button type="button" class="btn" data-nav="print">&#128424; Print / Save as PDF</button><button type="button" class="btn ghost" data-nav="restart">&#8635; Reset lab</button></div></div>';
    card.querySelector('#rp-name').addEventListener('input', function (ev) { S.name = ev.target.value; save(); ev.target.style.borderColor = ''; });
    card.querySelector('#rp-team').addEventListener('input', function (ev) { S.team = ev.target.value; save(); card.querySelector('#rp-team-wrap').classList.toggle('px-empty', !S.team.trim()); });
  }

  /* ---------- Navigation ---------- */
  function pager() {
    var prev = S.step > 0 ? '<a href="#" class="prev" data-nav="prev"><span class="pager-dir">&#8592; Previous</span><span class="pager-name">' + esc(STEPS[S.step - 1].title) + '</span></a>'
      : '<a href="' + esc(L.lessonHref) + '" class="prev"><span class="pager-dir">&#8592; Back to lesson</span><span class="pager-name">' + esc(L.lessonLabel) + '</span></a>';
    var next = S.step < 2 ? '<a href="#" class="next" data-nav="next"><span class="pager-dir">Next &#8594;</span><span class="pager-name">' + esc(STEPS[S.step + 1].title) + '</span></a>'
      : '<a href="labs.html" class="next"><span class="pager-dir">Continue &#8594;</span><span class="pager-name">CISM Leadership Lab: all labs</span></a>';
    return '<nav class="pager px-pager" aria-label="Lab navigation"><div class="pager-inner">' + prev + next + '</div></nav>';
  }
  function render() {
    renderRail();
    var stage = document.getElementById('lb-stage');
    stage.innerHTML = '<section class="block" id="lb-card" style="margin-bottom:0"></section>' + pager();
    var card = document.getElementById('lb-card');
    [renderBrief, renderWork, renderReport][S.step](card);
    applySplit();
    stage.querySelectorAll('[data-nav]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        var n = b.dataset.nav; e.preventDefault();
        if (n === 'prev') go(S.step - 1);
        if (n === 'next') go(S.step + 1);
        if (n === 'print') { if (!S.name.trim()) { var f = document.getElementById('rp-name'); f.focus(); f.style.borderColor = 'var(--gold)'; if (!confirm('No name entered. Print anyway?')) return; } window.print(); }
        if (n === 'restart') { if (confirm('Reset this lab? This clears every answer and the score in this browser.')) { var nm = S.name, tm = S.team; S = blank(); S.name = nm; S.team = tm; save(); if (L.onReset) L.onReset(); go(0); } }
      });
    });
  }
  function go(i) {
    S.step = Math.max(0, Math.min(2, i)); save(); render();
    var top = document.querySelector('.px-layout').getBoundingClientRect().top + window.scrollY - 70;
    if (window.scrollY > top) window.scrollTo(0, top);
    var h = document.getElementById('px-h2'); if (h) h.focus({ preventScroll: true });
  }

  // API for the lab-specific workbench
  var API = {
    esc: esc,
    state: function () { return S; },
    note: function (k, v) { if (v === undefined) return (S.tool || {})[k]; S.tool = S.tool || {}; S.tool[k] = v; save(); },
    refresh: function () { items.forEach(function (_, i) { rerenderItem(i); }); },
    goChecklist: function () { var c = document.getElementById('lb-checklist'); if (c) c.scrollIntoView({ block: 'start' }); }
  };
  window.LAB_API = API;

  document.title = L.id + ' ' + L.title + ' | CISM 5-Day Boot Camp';
  document.documentElement.removeAttribute('data-theme');
  shell(); render();
})();

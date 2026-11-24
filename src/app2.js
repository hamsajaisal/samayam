'use strict';
/* global I18N, SamayamPresets, SamayamSolver, SamayamSub, t, PR, io, D, S, VIEWS, ACTIONS, CHANGES, $, $$, esc, pad, clone, WD,
   todayStr, fmtDate, dayName, nDays, nPer, sDay, pTime, periodLabel, subj, tch, cls, les, subjName, tName, tNames, tShorts, hueOf,
   sortByName, classesSorted, cellOf, teacherLoad, save, announce, modal, confirmDlg, infoDlg, setView, render, renderNav, applySettings */
/* Samayam UI - part 2: timetable, substitution, now, dashboard, reports, import/export, start-up. */

// ======================================================================
// TIMETABLE
// ======================================================================
function pushUndo() {
  S.undo.push(JSON.stringify({ cells: D.timetable.cells, locked: D.timetable.locked }));
  if (S.undo.length > 40) S.undo.shift();
}
ACTIONS.undo = () => {
  const u = S.undo.pop();
  if (!u) { announce(t('Nothing to undo.')); return; }
  const o = JSON.parse(u);
  D.timetable.cells = o.cells;
  D.timetable.locked = o.locked;
  save();
  render(false);
  announce(t('Undone.'));
};

function ensureCells(classId) {
  const Dn = nDays(), P = nPer();
  let g = D.timetable.cells[classId];
  if (!g) g = D.timetable.cells[classId] = [];
  for (let d = 0; d < Dn; d++) { if (!g[d]) g[d] = []; for (let p = 0; p < P; p++) if (g[d][p] === undefined) g[d][p] = null; }
  return g;
}

// Teachers of lesson `lid` who are already elsewhere at d,p (or unavailable).
function teacherConflicts(lid, d, p, exceptClassId) {
  const l = les(lid);
  if (!l) return [];
  const out = [];
  for (const tid of l.teacherIds || []) {
    const seen = new Set();
    for (const c of D.classes) {
      if (c.id === exceptClassId) continue;
      const o = les(cellOf(c.id, d, p));
      if (o && o.id !== lid && !seen.has(o.id) && (o.teacherIds || []).includes(tid)) { seen.add(o.id); out.push(`${tName(tid)} ${t('is in')} ${groupName(lcIds(o))}`); }
    }
    const x = tch(tid);
    if (x && (x.unavailable || []).includes(d + '-' + p)) out.push(`${x.name} ${t('is marked not available then')}`);
  }
  // a combined period also replaces what the other joined classes have then
  for (const cid of lcIds(l)) {
    if (cid === exceptClassId) continue;
    const o = les(cellOf(cid, d, p));
    if (o && o.id !== lid) out.push(`${(cls(cid) || {}).name}: ${subjName(o.subjectId)} ${t('will be removed')}`);
  }
  return out;
}

// Put a lesson (or null) at d,p of class c. A combined lesson goes into all of
// its classes at once, and a combined lesson that is replaced leaves all of them.
function clearLessonAt(lid, d, p) {
  const l = les(lid);
  if (!l) return;
  for (const cid of lcIds(l)) if (cellOf(cid, d, p) === lid) ensureCells(cid)[d][p] = null;
}
function setCell(c, d, p, lid) {
  const old = cellOf(c, d, p);
  if (old && isCombined(les(old))) clearLessonAt(old, d, p);
  else ensureCells(c)[d][p] = null;
  const nl = les(lid);
  if (!nl) return;
  for (const cid of lcIds(nl)) {
    const prev = cellOf(cid, d, p);
    if (prev && prev !== lid && isCombined(les(prev))) clearLessonAt(prev, d, p);
    ensureCells(cid)[d][p] = lid;
  }
}
function setLock(c, d, p, on) {
  const l = les(cellOf(c, d, p));
  for (const cid of l ? lcIds(l) : [c]) {
    if (on) D.timetable.locked[`${cid}|${d}|${p}`] = true;
    else delete D.timetable.locked[`${cid}|${d}|${p}`];
  }
}

function ttTargets() {
  if (S.tt.mode === 'teacher') {
    const list = sortByName(D.teachers);
    if (!S.tt.target || !tch(S.tt.target)) S.tt.target = list[0] && list[0].id;
    return list.map((x) => ({ id: x.id, name: x.name }));
  }
  const list = classesSorted();
  if (!S.tt.target || !cls(S.tt.target)) S.tt.target = list[0] && list[0].id;
  return list.map((c) => ({ id: c.id, name: c.name }));
}

// What to show in one cell. Returns {text, sr, hue, lid, empty}
function ttCell(mode, target, d, p) {
  if (mode === 'teacher') {
    const hits = [];
    for (const c of D.classes) {
      const l = les(cellOf(c.id, d, p));
      if (l && (l.teacherIds || []).includes(target) && !hits.some((h) => h.l.id === l.id)) hits.push({ c, l });
    }
    if (!hits.length) return { empty: true, s: '', tt: '', sr: t('Free') };
    return {
      hue: hueOf(hits[0].l.subjectId),
      s: hits.map((h) => groupName(lcIds(h.l))).join(', '),
      tt: hits.map((h) => (subj(h.l.subjectId) || {}).short || '?').join(', '),
      sr: hits.map((h) => `${groupName(lcIds(h.l))}, ${subjName(h.l.subjectId)}`).join('; ') + (hits.length > 1 ? '. ' + t('Clash') : ''),
      clash: hits.length > 1,
      combined: hits.some((h) => isCombined(h.l)),
      classId: hits[0].c.id
    };
  }
  const lid = cellOf(target, d, p);
  const l = les(lid);
  if (!l) return { empty: true, s: '', tt: '', sr: t('Empty') };
  const comb = isCombined(l);
  const others = lcIds(l).filter((x) => x !== target);
  return {
    hue: hueOf(l.subjectId), s: (subj(l.subjectId) || {}).short || '?', tt: tShorts(l.teacherIds), lid, combined: comb,
    sr: `${subjName(l.subjectId)}, ${tNames(l.teacherIds)}${comb ? '. ' + t('Combined with') + ' ' + groupName(others) : ''}`
  };
}

function ttGridHtml(mode, target, clashKeys) {
  const Dn = nDays(), P = nPer();
  const label = mode === 'teacher' ? tName(target) : (cls(target) || {}).name;
  let h = `<div class="tablewrap"><table class="tt" role="grid" aria-label="${esc(t('Timetable'))} ${esc(label)}" aria-describedby="ttHelp">
    <thead><tr><th scope="col">${esc(t('Day'))}</th>`;
  for (let p = 0; p < P; p++) h += `<th scope="col">${esc(t('Period'))} ${p + 1}<small>${esc(pTime(p))}</small></th>`;
  h += '</tr></thead><tbody>';
  for (let d = 0; d < Dn; d++) {
    h += `<tr><th scope="row">${esc(sDay(d))}${hasOwnTimes(d) ? `<small>${esc(t("own timings"))}: ${esc(pTime(0, d))}</small>` : ""}</th>`;
    for (let p = 0; p < P; p++) {
      const c = ttCell(mode, target, d, p);
      const locked = mode === 'class' && D.timetable.locked[`${target}|${d}|${p}`];
      const clash = c.clash || (mode === 'class' && clashKeys.has(`${target}|${d}|${p}`));
      const picked = S.tt.picked && S.tt.picked.d === d && S.tt.picked.p === p && mode === 'class';
      const focus = S.tt.focus.d === d && S.tt.focus.p === p;
      const cl = [c.empty ? 'empty' : '', clash ? 'clash' : '', picked ? 'picked' : ''].join(' ').trim();
      const sr = (hasOwnTimes(d) ? pTime(p, d) + ': ' : '') + c.sr + (locked ? '. ' + t('Locked') : '') + (clash && !c.clash ? '. ' + t('Clash: teacher has another class') : '') + (picked ? '. ' + t('Picked') : '');
      h += `<td role="gridcell" id="cell_${d}_${p}" data-cell="${d}|${p}" tabindex="${focus ? 0 : -1}" class="${cl}" ${c.empty ? '' : `style="--h:${c.hue}"`} ${mode === 'class' ? 'draggable="true"' : ''}>
        <span class="sr-only">${esc(sr)}</span><span aria-hidden="true"><span class="s">${esc(c.s)}</span><span class="t">${esc(c.tt)}</span>
        <span class="icons">${c.combined ? '🔗' : ''}${locked ? '🔒' : ''}${clash ? '⚠️' : ''}</span></span></td>`;
    }
    h += '</tr>';
  }
  return h + '</tbody></table></div>';
}

function ttListHtml(mode, target) {
  let h = '';
  for (let d = 0; d < nDays(); d++) {
    h += `<h3>${esc(sDay(d))}</h3><ul class="list-plain">`;
    for (let p = 0; p < nPer(); p++) {
      const c = ttCell(mode, target, d, p);
      const locked = mode === 'class' && D.timetable.locked[`${target}|${d}|${p}`];
      h += `<li>${esc(periodLabel(p, true, d))}: <strong>${esc(c.sr)}</strong>${locked ? ' – ' + esc(t('Locked')) : ''}
        ${mode === 'class' ? ` <button type="button" class="btn small" id="le_${d}_${p}" data-act="ttEditBtn" data-d="${d}" data-p="${p}" aria-label="${esc(t('Change'))} ${esc(sDay(d))} ${esc(periodLabel(p, false))}">${esc(t('Change'))}</button>` : ''}</li>`;
    }
    h += '</ul>';
  }
  return h;
}

VIEWS.timetable = () => {
  if (!D.classes.length) return `<h1>${esc(t('Timetable'))}</h1><p class="msg">${esc(t('Add classes, subjects and teachers first.'))}</p><button class="btn primary" data-nav="school">${esc(t('School Profile'))}</button>`;
  const targets = ttTargets();
  const mode = S.tt.mode, target = S.tt.target;
  const clashes = SamayamSolver.findClashes(D);
  const filled = Object.values(D.timetable.cells).reduce((a, g) => a + g.reduce((b, r) => b + r.filter(Boolean).length, 0), 0);
  let status = '';
  if (S.tt.generating) status = `<p class="msg" role="status"><span class="spinner" aria-hidden="true"></span> ${esc(t('Generating timetable, please wait…'))}</p>`;
  else if (S.tt.lastGen) {
    const g = S.tt.lastGen;
    status = g.unplaced.length
      ? `<div class="msg warn"><strong>${g.unplacedCount} ${esc(t('periods could not be placed:'))}</strong><ul>${g.unplaced.map((u) => { const l = les(u.lessonId); return l ? `<li>${esc(groupName(lcIds(l)))} – ${esc(subjName(l.subjectId))} (${esc(tNames(l.teacherIds))}): ${u.count}</li>` : ''; }).join('')}</ul>
         <p>${esc(t('Try Generate again, reduce the teacher’s periods, raise “Max/day”, or place these by hand in the empty (dashed) cells.'))}</p></div>`
      : `<p class="msg ok">✓ ${esc(t('Timetable generated. All periods placed without clashes.'))} (${g.ms} ms)</p>`;
  }
  const clashMsg = clashes.list.length || clashes.unavailable.length
    ? `<div class="msg err"><strong>${clashes.list.length + clashes.unavailable.length} ${esc(t('clashes'))}</strong><ul>${clashes.list.slice(0, 12).map((x) => `<li>${esc(tName(x.teacherId))}: ${esc(sDay(x.d))} ${esc(periodLabel(x.p, false))} – ${esc(x.classIds.map((c) => (cls(c) || {}).name).join(', '))}</li>`).join('')}
       ${clashes.unavailable.slice(0, 6).map((x) => `<li>${esc(tName(x.teacherId))}: ${esc(sDay(x.d))} ${esc(periodLabel(x.p, false))} – ${esc(t('not available'))}</li>`).join('')}</ul></div>` : '';
  const versions = (D.versions || []).map((v) => `<tr><td>${esc(v.name)}</td><td>${esc(new Date(v.savedAt).toLocaleString())}</td>
      <td><button type="button" class="btn small" data-act="restoreVersion" data-id="${v.id}">${esc(t('Restore'))}</button>
      <button type="button" class="btn small danger" data-act="delVersion" data-id="${v.id}" aria-label="${esc(t('Delete'))} ${esc(v.name)}">${esc(t('Delete'))}</button></td></tr>`).join('');
  return `<h1>${esc(t('Timetable'))}</h1>
  <div class="toolbar">
    <button type="button" class="btn primary" data-act="generate" ${S.tt.generating ? 'disabled' : ''}>⚡ ${esc(t('Generate timetable'))}</button>
    <button type="button" class="btn" data-act="undo" ${S.undo.length ? '' : 'disabled'}>↶ ${esc(t('Undo'))}</button>
    <button type="button" class="btn" data-act="clearTT">${esc(t('Clear unlocked periods'))}</button>
    <span class="sep" aria-hidden="true"></span>
    <button type="button" class="btn" data-act="pdfTT" data-what="one">PDF: ${esc(t('this'))}</button>
    <button type="button" class="btn" data-act="pdfTT" data-what="classes">PDF: ${esc(t('all classes'))}</button>
    <button type="button" class="btn" data-act="pdfTT" data-what="teachers">PDF: ${esc(t('all teachers'))}</button>
    <button type="button" class="btn" data-act="pdfTT" data-what="master">PDF: ${esc(t('master'))}</button>
    <button type="button" class="btn" data-act="excelTT">Excel</button>
  </div>
  ${status}${clashMsg}
  <div class="toolbar">
    <fieldset class="row" style="margin:0"><legend>${esc(t('View by'))}</legend>
      <label class="check"><input type="radio" name="ttmode" id="ttm_class" value="class" data-change="ttMode" ${mode === 'class' ? 'checked' : ''}> ${esc(t('Class'))}</label>
      <label class="check"><input type="radio" name="ttmode" id="ttm_teacher" value="teacher" data-change="ttMode" ${mode === 'teacher' ? 'checked' : ''}> ${esc(t('Teacher'))}</label>
    </fieldset>
    ${combo({ id: "tt_target", label: mode === "teacher" ? t("Teacher") : t("Class"), kind: mode, selectedId: target, change: "ttTarget" })}
    <label class="check"><input type="checkbox" id="tt_list" data-change="ttList" ${S.tt.list ? 'checked' : ''}> ${esc(t('List view'))}</label>
    <span class="muted">${filled} ${esc(t('periods filled'))}</span>
  </div>
  <p id="ttHelp" class="muted">${esc(mode === 'class'
    ? t('Arrow keys move between periods. Enter changes a period, Space picks and swaps two periods, L locks, Delete clears, Ctrl+Z undoes. With a mouse you can drag a period onto another to swap.')
    : t('Teacher view is read-only. Press Enter on a period to open that class.'))}</p>
  ${S.tt.list ? ttListHtml(mode, target) : ttGridHtml(mode, target, clashes.cellKeys)}
  <details class="card"><summary><strong>${esc(t('Saved versions'))}</strong> (${(D.versions || []).length})</summary>
    <div class="row" style="margin:10px 0"><label>${esc(t('Version name'))}<input id="ver_name" placeholder="${esc(t('e.g. Term 1, Exam week'))}"></label>
    <button type="button" class="btn" data-act="saveVersion">${esc(t('Save as version'))}</button></div>
    ${versions ? `<table class="data"><thead><tr><th scope="col">${esc(t('Name'))}</th><th scope="col">${esc(t('Saved'))}</th><th scope="col">${esc(t('Actions'))}</th></tr></thead><tbody>${versions}</tbody></table>` : ''}
  </details>`;
};

CHANGES.ttMode = (el) => { S.tt.mode = el.value; S.tt.target = null; S.tt.picked = null; render(false); };
CHANGES.ttTarget = (el) => { S.tt.target = el.value; S.tt.picked = null; render(false); };
CHANGES.ttList = (el) => { S.tt.list = el.checked; render(false); };

function focusCell(d, p) {
  $$('td[data-cell]').forEach((x) => (x.tabIndex = -1));
  const el = document.getElementById(`cell_${d}_${p}`);
  if (el) { el.tabIndex = 0; el.focus(); }
  S.tt.focus = { d, p };
}

async function editCell(d, p) {
  const c = S.tt.target;
  const cur = cellOf(c, d, p);
  const ls = lessonsOfClass(c);
  const placed = (lid) => (D.timetable.cells[c] || []).reduce((a, r) => a + r.filter((v) => v === lid).length, 0);
  const lockKey = `${c}|${d}|${p}`;
  const opts = [`<label><input type="radio" name="lid" value="" ${cur ? '' : 'checked'}> <span>${esc(t('Empty'))}</span></label>`].concat(ls.map((l) => {
    const conf = teacherConflicts(l.id, d, p, c);
    return `<label><input type="radio" name="lid" value="${l.id}" ${cur === l.id ? 'checked' : ''}>
      <span><span class="chip" style="--h:${hueOf(l.subjectId)}" aria-hidden="true">${esc((subj(l.subjectId) || {}).short)}</span> ${esc(subjName(l.subjectId))} – ${esc(tNames(l.teacherIds))}${isCombined(l) ? ` · 🔗 ${esc(t('Combined'))}: ${esc(groupName(lcIds(l)))}` : ''}
      <br><small class="muted">${placed(l.id)}/${l.perWeek} ${esc(t('placed'))}${conf.length ? ' · ⚠ ' + esc(conf.join('; ')) : ''}</small></span></label>`;
  }));
  const fd = await modal({
    title: `${(cls(c) || {}).name}: ${sDay(d)}, ${periodLabel(p, true, d)}`,
    body: `<fieldset class="radio-list"><legend>${esc(t('Choose the subject for this period'))}</legend>${opts.join('')}</fieldset>
      <label class="check"><input type="checkbox" name="lock" ${D.timetable.locked[lockKey] ? 'checked' : ''}> ${esc(t('Lock this period (generator will keep it)'))}</label>`
  });
  if (!fd) return;
  const lid = fd.get('lid') || null;
  if (lid && lid !== cur) {
    const conf = teacherConflicts(lid, d, p, c);
    if (conf.length && !(await confirmDlg(`${conf.join('; ')}. ${t('Place it anyway?')}`, t('Place anyway')))) return;
  }
  pushUndo();
  setLock(c, d, p, false);
  setCell(c, d, p, lid);
  if (fd.get('lock') && lid) setLock(c, d, p, true);
  save();
  S.tt.focus = { d, p };
  render(false);
  focusCell(d, p);
  announce(lid ? `${subjName(les(lid).subjectId)} ${t('placed.')}` : t('Period cleared.'));
}

async function swapCells(a, b) {
  const c = S.tt.target;
  const g = ensureCells(c);
  const ka = `${c}|${a.d}|${a.p}`, kb = `${c}|${b.d}|${b.p}`;
  if (D.timetable.locked[ka] || D.timetable.locked[kb]) { announce(t('A locked period cannot be moved. Unlock it with L first.')); return; }
  const la = g[a.d][a.p], lb = g[b.d][b.p];
  if (isCombined(les(la)) || isCombined(les(lb))) { announce(t('A combined period moves together with its other classes. Press Enter on the empty period where it should go and choose it there.')); S.tt.picked = null; render(false); focusCell(b.d, b.p); return; }
  const conf = [].concat(la ? teacherConflicts(la, b.d, b.p, c) : [], lb ? teacherConflicts(lb, a.d, a.p, c) : []);
  if (conf.length && !(await confirmDlg(`${conf.join('; ')}. ${t('Swap anyway?')}`, t('Swap anyway')))) return;
  pushUndo();
  g[a.d][a.p] = lb;
  g[b.d][b.p] = la;
  save();
  S.tt.picked = null;
  S.tt.focus = { d: b.d, p: b.p };
  render(false);
  focusCell(b.d, b.p);
  announce(`${t('Swapped')} ${sDay(a.d)} ${periodLabel(a.p, false)} ${t('and')} ${sDay(b.d)} ${periodLabel(b.p, false)}.`);
}

function gridKey(e, td) {
  const [d, p] = td.dataset.cell.split('|').map(Number);
  const Dn = nDays(), P = nPer();
  let nd = d, np = p;
  const mode = S.tt.mode;
  switch (e.key) {
    case 'ArrowRight': np = Math.min(P - 1, p + 1); break;
    case 'ArrowLeft': np = Math.max(0, p - 1); break;
    case 'ArrowDown': nd = Math.min(Dn - 1, d + 1); break;
    case 'ArrowUp': nd = Math.max(0, d - 1); break;
    case 'Home': np = 0; if (e.ctrlKey) nd = 0; break;
    case 'End': np = P - 1; if (e.ctrlKey) nd = Dn - 1; break;
    case 'Enter':
    case 'F2':
      e.preventDefault();
      if (mode === 'class') editCell(d, p);
      else {
        const c = ttCell('teacher', S.tt.target, d, p);
        if (c.classId) { S.tt.mode = 'class'; S.tt.target = c.classId; S.tt.focus = { d, p }; render(false); focusCell(d, p); announce(`${t('Showing class')} ${(cls(c.classId) || {}).name}`); }
        else announce(t('Free'));
      }
      return;
    case ' ':
      e.preventDefault();
      if (mode !== 'class') return;
      if (!S.tt.picked) {
        S.tt.picked = { d, p };
        render(false);
        focusCell(d, p);
        announce(`${t('Picked')} ${sDay(d)} ${periodLabel(p, false)}. ${t('Move to another period and press Space to swap. Escape cancels.')}`);
      } else if (S.tt.picked.d === d && S.tt.picked.p === p) {
        S.tt.picked = null; render(false); focusCell(d, p); announce(t('Pick cancelled.'));
      } else swapCells(S.tt.picked, { d, p });
      return;
    case 'Escape':
      if (S.tt.picked) { S.tt.picked = null; render(false); focusCell(d, p); announce(t('Pick cancelled.')); }
      return;
    case 'Delete':
    case 'Backspace': {
      e.preventDefault();
      if (mode !== 'class') return;
      const k = `${S.tt.target}|${d}|${p}`;
      if (D.timetable.locked[k]) { announce(t('Locked. Press L to unlock first.')); return; }
      pushUndo();
      const wasComb = isCombined(les(cellOf(S.tt.target, d, p)));
      setCell(S.tt.target, d, p, null);
      save(); render(false); focusCell(d, p); announce(wasComb ? t('Combined period cleared in all its classes.') : t('Period cleared.'));
      return;
    }
    case 'l':
    case 'L': {
      if (mode !== 'class' || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      const k = `${S.tt.target}|${d}|${p}`;
      if (!cellOf(S.tt.target, d, p)) { announce(t('Empty periods cannot be locked.')); return; }
      pushUndo();
      setLock(S.tt.target, d, p, !D.timetable.locked[k]);
      save(); render(false); focusCell(d, p);
      announce(D.timetable.locked[k] ? t('Locked') : t('Unlocked'));
      return;
    }
    default: return;
  }
  e.preventDefault();
  focusCell(nd, np);
}

ACTIONS.ttEditBtn = (el) => editCell(+el.dataset.d, +el.dataset.p);

function runSolver(input, opts) {
  return new Promise((resolve, reject) => {
    const direct = () => setTimeout(() => { try { resolve(SamayamSolver.generateTimetable(input, opts)); } catch (er) { reject(er); } }, 30);
    let w;
    try { w = new Worker('solver-worker.js'); } catch (e) { direct(); return; }
    w.onmessage = (e) => { w.terminate(); if (e.data.ok) resolve(e.data.result); else reject(new Error(e.data.error)); };
    w.onerror = (ev) => { ev.preventDefault(); w.terminate(); direct(); };
    w.postMessage({ input, opts });
  });
}

function precheckText(m) {
  switch (m.key) {
    case 'classOver': return `${m.cls}: ${m.total} ${t('periods planned but only')} ${m.N} ${t('slots in a week.')}`;
    case 'classUnder': return `${m.cls}: ${m.total} ${t('of')} ${m.N} ${t('periods planned; the rest stay free.')}`;
    case 'noTeacher': return `${m.cls} – ${m.subject}: ${t('no teacher assigned.')}`;
    case 'maxDayTooLow': return `${m.cls} – ${m.subject}: ${t('“Max/day” is too low to fit all periods in the week.')}`;
    case 'teacherImpossible': return `${m.teacher}: ${m.load} ${t('periods but only')} ${m.avail} ${t('possible slots.')}`;
    case 'teacherOver': return `${m.teacher}: ${m.load} ${t('periods, above the limit of')} ${m.max}.`;
    default: return m.key;
  }
}

ACTIONS.generate = async () => {
  const pre = SamayamSolver.precheck(D);
  const errs = pre.filter((m) => m.level === 'error');
  const warns = pre.filter((m) => m.level === 'warn');
  if (errs.length) {
    await infoDlg(t('Please fix these first'), `<ul>${errs.map((m) => `<li>${esc(precheckText(m))}</li>`).join('')}</ul>
      ${warns.length ? `<h3>${esc(t('Also note'))}</h3><ul>${warns.slice(0, 20).map((m) => `<li>${esc(precheckText(m))}</li>`).join('')}</ul>` : ''}`);
    return;
  }
  if (warns.length) {
    const ok = await modal({ title: t('Check before generating'), body: `<ul>${warns.slice(0, 30).map((m) => `<li>${esc(precheckText(m))}</li>`).join('')}</ul>${warns.length > 30 ? `<p>… ${warns.length - 30} ${esc(t('more'))}</p>` : ''}<p>${esc(t('Generate anyway?'))}</p>`, ok: t('Generate') });
    if (!ok) return;
  }
  S.tt.generating = true;
  S.tt.lastGen = null;
  render(false);
  announce(t('Generating timetable, please wait…'));
  try {
    const res = await runSolver(SamayamSolver.buildInput(D), { timeLimitMs: 10000, seed: Date.now() % 100000 });
    pushUndo();
    D.timetable.cells = res.cells;
    D.timetable.generatedAt = new Date().toISOString();
    S.tt.lastGen = res;
    save();
    announce(res.unplacedCount ? `${t('Timetable generated.')} ${res.unplacedCount} ${t('periods could not be placed. Details are shown on the page.')}` : t('Timetable generated. All periods placed without clashes.'));
  } catch (err) {
    console.error(err);
    announce(t('Generation failed:') + ' ' + err.message);
  }
  S.tt.generating = false;
  render(false);
};

ACTIONS.clearTT = async () => {
  if (!(await confirmDlg(t('Clear all unlocked periods of all classes? Locked periods stay. You can undo this.'), t('Clear')))) return;
  pushUndo();
  for (const c of Object.keys(D.timetable.cells)) D.timetable.cells[c] = D.timetable.cells[c].map((row, d) => row.map((v, p) => (D.timetable.locked[`${c}|${d}|${p}`] ? v : null)));
  S.tt.lastGen = null;
  save();
  render(false);
  announce(t('Cleared.'));
};

ACTIONS.saveVersion = () => {
  const name = $('#ver_name').value.trim() || `${t('Version')} ${(D.versions || []).length + 1}`;
  D.versions = D.versions || [];
  D.versions.push({ id: PR.uid('v'), name, savedAt: new Date().toISOString(), cells: clone(D.timetable.cells), locked: clone(D.timetable.locked) });
  save();
  render(false);
  announce(`${name}: ${t('Saved.')}`);
};
ACTIONS.restoreVersion = async (el) => {
  const v = D.versions.find((x) => x.id === el.dataset.id);
  if (!v || !(await confirmDlg(`${t('Restore')} “${v.name}”? ${t('The current timetable will be replaced (you can undo).')}`, t('Restore')))) return;
  pushUndo();
  D.timetable.cells = clone(v.cells);
  D.timetable.locked = clone(v.locked || {});
  save();
  render(false);
  announce(`${v.name} ${t('restored.')}`);
};
ACTIONS.delVersion = async (el) => {
  const v = D.versions.find((x) => x.id === el.dataset.id);
  if (!v || !(await confirmDlg(`${t('Delete version')} “${v.name}”?`, t('Delete')))) return;
  D.versions = D.versions.filter((x) => x.id !== v.id);
  save();
  render(false);
  announce(t('Deleted.'));
};

// ---------- printing (PDF) ----------
function printDoc(title, inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font-family:"Segoe UI","Nirmala UI",sans-serif;font-size:11px;color:#000;margin:0}
    h1{font-size:17px;margin:0 0 2px} h2{font-size:14px;margin:10px 0 4px} .sub{color:#333;margin:0 0 8px}
    table{border-collapse:collapse;width:100%;margin-bottom:8px} th,td{border:1px solid #555;padding:4px 5px;text-align:center;vertical-align:middle}
    th{background:#e6ecf7} td.l{text-align:left} small{color:#333} .page{page-break-after:always} .page:last-child{page-break-after:auto}
    .foot{margin-top:28px;display:flex;justify-content:space-between} .warn{color:#a00;font-weight:bold}
  </style></head><body>${inner}</body></html>`;
}
function schoolHeader(sub) {
  return `<h1>${esc(D.school.name)}${D.school.place ? ', ' + esc(D.school.place) : ''}</h1><p class="sub">${esc(sub)}</p>`;
}
function ttTablePrint(mode, target) {
  let h = `<table><thead><tr><th>${esc(t('Day'))}</th>`;
  for (let p = 0; p < nPer(); p++) h += `<th>${p + 1}<br><small>${esc(pTime(p))}</small></th>`;
  h += '</tr></thead><tbody>';
  for (let d = 0; d < nDays(); d++) {
    h += `<tr><th>${esc(sDay(d))}${hasOwnTimes(d) ? `<br><small>${[...Array(nPer()).keys()].map((q) => esc(pTime(q, d))).join("<br>")}</small>` : ""}</th>`;
    for (let p = 0; p < nPer(); p++) {
      if (mode === 'teacher') {
        const c = ttCell('teacher', target, d, p);
        h += `<td>${c.empty ? '' : `<b>${esc(c.s)}</b><br><small>${esc(c.tt)}</small>`}</td>`;
      } else {
        const l = les(cellOf(target, d, p));
        h += `<td>${l ? `<b>${esc(subjName(l.subjectId))}</b><br><small>${esc(tNames(l.teacherIds))}</small>` : ''}</td>`;
      }
    }
    h += '</tr>';
  }
  return h + '</tbody></table>';
}
function masterPrint() {
  let h = '';
  for (let d = 0; d < nDays(); d++) {
    h += `<div class="page">${schoolHeader(t('Master timetable') + ' – ' + sDay(d))}<table><thead><tr><th>${esc(t('Class'))}</th>`;
    for (let p = 0; p < nPer(); p++) h += `<th>${p + 1}<br><small>${esc(pTime(p, d))}</small></th>`;
    h += '</tr></thead><tbody>';
    for (const c of classesSorted()) {
      h += `<tr><th>${esc(c.name)}</th>`;
      for (let p = 0; p < nPer(); p++) {
        const l = les(cellOf(c.id, d, p));
        h += `<td>${l ? `${esc((subj(l.subjectId) || {}).short)}<br><small>${esc(tShorts(l.teacherIds))}</small>` : ''}</td>`;
      }
      h += '</tr>';
    }
    h += '</tbody></table></div>';
  }
  return h;
}
ACTIONS.pdfTT = async (el) => {
  const what = el.dataset.what;
  let inner = '', name = '';
  if (what === 'one') {
    const label = S.tt.mode === 'teacher' ? tName(S.tt.target) : (cls(S.tt.target) || {}).name;
    inner = `<div class="page">${schoolHeader(`${t('Timetable')} – ${label}`)}${ttTablePrint(S.tt.mode, S.tt.target)}</div>`;
    name = `Timetable_${label}.pdf`;
  } else if (what === 'classes') {
    inner = classesSorted().map((c) => `<div class="page">${schoolHeader(`${t('Class timetable')} – ${c.name}${c.classTeacherId ? ' (' + t('Class teacher') + ': ' + tName(c.classTeacherId) + ')' : ''}`)}${ttTablePrint('class', c.id)}</div>`).join('');
    name = 'Timetable_All_Classes.pdf';
  } else if (what === 'teachers') {
    inner = sortByName(D.teachers).map((x) => `<div class="page">${schoolHeader(`${t('Teacher timetable')} – ${x.name}`)}${ttTablePrint('teacher', x.id)}</div>`).join('');
    name = 'Timetable_All_Teachers.pdf';
  } else {
    inner = masterPrint();
    name = 'Master_Timetable.pdf';
  }
  const p = await io.savePdf({ html: printDoc(name, inner), fileName: name.replace(/[\\/:*?"<>|]/g, '-'), landscape: true });
  if (p) announce(t('PDF saved.'));
};

// ---------- Excel ----------
const xlHeader = () => ['Day'].concat([...Array(nPer()).keys()].map((p) => `P${p + 1}${pTime(p) ? ' ' + pTime(p) : ''}`));
function timetableSheets() {
  const sheets = [];
  for (const c of classesSorted()) {
    const rows = [xlHeader()];
    for (let d = 0; d < nDays(); d++) {
      const r = [WD[D.school.workingDays[d]]];
      for (let p = 0; p < nPer(); p++) {
        const l = les(cellOf(c.id, d, p));
        r.push(l ? `${subjName(l.subjectId)} / ${(l.teacherIds || []).map((id) => (tch(id) || {}).short).join(' + ')}` : '');
      }
      rows.push(r);
    }
    sheets.push({ name: c.name, rows });
  }
  for (const x of sortByName(D.teachers)) {
    const rows = [xlHeader()];
    for (let d = 0; d < nDays(); d++) {
      const r = [WD[D.school.workingDays[d]]];
      for (let p = 0; p < nPer(); p++) { const c = ttCell('teacher', x.id, d, p); r.push(c.empty ? '' : `${c.s} ${c.tt}`); }
      rows.push(r);
    }
    sheets.push({ name: 'T - ' + x.name, rows });
  }
  for (let d = 0; d < nDays(); d++) {
    const rows = [['Class'].concat([...Array(nPer()).keys()].map((p) => `P${p + 1}`))];
    for (const c of classesSorted()) rows.push([c.name].concat([...Array(nPer()).keys()].map((p) => { const l = les(cellOf(c.id, d, p)); return l ? `${(subj(l.subjectId) || {}).short}/${tShorts(l.teacherIds)}` : ''; })));
    sheets.push({ name: 'Master - ' + WD[D.school.workingDays[d]], rows, colWidth: 12 });
  }
  return sheets;
}
ACTIONS.excelTT = async () => {
  const p = await io.exportExcel({ fileName: 'Timetable.xlsx', sheets: timetableSheets() });
  if (p) announce(t('Excel file saved.'));
};

// ======================================================================
// LEAVE & SUBSTITUTION
// ======================================================================
const SESS = { full: 'Full day', am: 'Forenoon', pm: 'Afternoon', custom: 'Specific periods' };

function loadSubDate(ds) {
  S.sub.date = ds;
  S.sub.absences = D.leaves.filter((l) => l.date === ds).map((l) => ({ teacherId: l.teacherId, session: l.session || 'full', periods: l.periods || [], note: l.note || '' }));
  S.sub.rows = D.substitutions[ds] ? clone(D.substitutions[ds]) : null;
  S.sub.stale = false;
}
function persistSub() {
  const ds = S.sub.date;
  D.leaves = D.leaves.filter((l) => l.date !== ds).concat(S.sub.absences.map((a) => ({ id: PR.uid('lv'), date: ds, teacherId: a.teacherId, session: a.session, periods: a.periods, note: a.note })));
  if (S.sub.rows) D.substitutions[ds] = S.sub.rows.map((r) => ({ period: r.period, classId: r.classId, classIds: r.classIds || [r.classId], lessonId: r.lessonId, subjectId: r.subjectId, absentTeacherId: r.absentTeacherId, subTeacherId: r.subTeacherId, note: r.note || '', manual: !!r.manual }));
  else delete D.substitutions[ds];
  save();
}
function sessLabel(a) {
  if (a.session === 'custom') return `${t('Periods')} ${(a.periods || []).map((p) => p + 1).join(', ')}`;
  return t(SESS[a.session] || 'Full day');
}

function subText(ds, rows, absences) {
  const L = [];
  L.push(`*${t('Substitution')} – ${fmtDate(ds)}*`);
  L.push(D.school.name);
  L.push('');
  L.push(`${t('Absent')}: ${absences.map((a) => `${tName(a.teacherId)} (${sessLabel(a)})`).join(', ') || '—'}`);
  const byP = {};
  rows.forEach((r) => (byP[r.period] = byP[r.period] || []).push(r));
  for (const p of Object.keys(byP).map(Number).sort((a, b) => a - b)) {
    L.push('');
    L.push(`*${periodLabel(p, true, dayIdx(ds))}*`);
    for (const r of byP[p]) {
      const c = rowClassName(r);
      L.push(r.subTeacherId
        ? `• ${c} – ${subjName(r.subjectId)} → ${tName(r.subTeacherId)} (${t('for')} ${tName(r.absentTeacherId)})`
        : `• ${c} – ${subjName(r.subjectId)} → ⚠ ${t('No substitute')} (${tName(r.absentTeacherId)})`);
      if (r.note) L.push(`   ${t('Work')}: ${r.note}`);
    }
  }
  const duty = {};
  rows.forEach((r) => r.subTeacherId && (duty[r.subTeacherId] = duty[r.subTeacherId] || []).push(r));
  if (Object.keys(duty).length) {
    L.push('');
    L.push(`*${t('Duty list')}*`);
    for (const tid of Object.keys(duty).sort((a, b) => tName(a).localeCompare(tName(b)))) {
      L.push(`${tName(tid)}: ${duty[tid].sort((a, b) => a.period - b.period).map((r) => `P${r.period + 1} ${rowClassName(r)}`).join(', ')}`);
    }
  }
  return L.join('\n');
}

function reasonText(c) {
  const map = { teachesClass: t('teaches this class'), sameSubject: t('same subject'), classTeacher: t('class teacher'), backToBack: t('busy before and after'), overLimit: t('over daily limit'), noFreeLeft: t('would lose the last free period') };
  return c.reasons.map((r) => map[r]).filter(Boolean).join(', ');
}

VIEWS.substitution = () => {
  const ds = S.sub.date;
  const dIdx = dayIdx(ds);
  const sp = (D.specialDays || {})[ds];
  const hasTT = Object.keys(D.timetable.cells).length > 0;
  const abs = S.sub.absences.map((a) => {
    const id = a.teacherId;
    const per = a.session === 'custom' ? `<fieldset class="periods-pick"><legend>${esc(t('Absent periods of'))} ${esc(tName(id))}</legend>${[...Array(nPer()).keys()].map((p) =>
      `<label class="check"><input type="checkbox" id="ap_${id}_${p}" data-change="absPeriod" data-id="${id}" data-p="${p}" ${(a.periods || []).includes(p) ? 'checked' : ''}> ${p + 1}</label>`).join('')}</fieldset>` : '';
    return `<li class="absent-item"><span class="name">${esc(tName(id))}</span>
      <label>${esc(t('Leave type'))}<select id="as_${id}" data-change="absSess" data-id="${id}" aria-label="${esc(t('Leave type'))} ${esc(tName(id))}">${Object.entries(SESS).map(([k, v]) => `<option value="${k}" ${a.session === k ? 'selected' : ''}>${esc(t(v))}</option>`).join('')}</select></label>
      <label>${esc(t('Work for the class (optional)'))}<input id="an_${id}" data-change="absNote" data-id="${id}" value="${esc(a.note)}" aria-label="${esc(t('Work for the class (optional)'))} – ${esc(tName(id))}"></label>
      <button type="button" class="btn small danger" data-act="absRemove" data-id="${id}" aria-label="${esc(t('Remove'))} ${esc(tName(id))}">${esc(t('Remove'))}</button>${per}</li>`;
  }).join('');
  let results = '';
  if (S.sub.rows) {
    const rows = S.sub.rows;
    const ctx = SamayamSub.createContext(D, ds, S.sub.absences);
    const covered = rows.filter((r) => r.subTeacherId).length;
    const trs = rows.map((r, i) => {
      const cands = ctx.evaluate(rows, i);
      const free = cands.filter((c) => c.free), busy = cands.filter((c) => !c.free);
      const opt = (c) => `<option value="${c.teacherId}" ${c.teacherId === r.subTeacherId ? 'selected' : ''}>${esc(tName(c.teacherId))}${reasonText(c) ? ' – ' + esc(reasonText(c)) : ''} · ${c.loadToday} ${esc(t('periods today'))}</option>`;
      const optB = (c) => `<option value="${c.teacherId}" ${c.teacherId === r.subTeacherId ? 'selected' : ''}>${esc(tName(c.teacherId))} – ${esc(c.busyWith === 'sub' ? t('another substitution') : (cls(c.busyWith) || {}).name || t('not available'))}</option>`;
      return `<tr class="${r.subTeacherId ? '' : 'uncovered'}">
        <th scope="row">${esc(periodLabel(r.period, true, dIdx))}</th>
        <td>${esc(rowClassName(r))}</td>
        <td><span class="chip" style="--h:${hueOf(r.subjectId)}" aria-hidden="true">${esc((subj(r.subjectId) || {}).short)}</span> ${esc(subjName(r.subjectId))}</td>
        <td>${esc(tName(r.absentTeacherId))}</td>
        <td><select id="sb_${i}" data-change="subPick" data-i="${i}" aria-label="${esc(t('Substitute'))}: ${esc(periodLabel(r.period, false))}, ${esc(rowClassName(r))}">
          <option value="">⚠ ${esc(t('No substitute'))}</option>
          <optgroup label="${esc(t('Free'))}">${free.map(opt).join('')}</optgroup>
          <optgroup label="${esc(t('Busy at this time'))}">${busy.map(optB).join('')}</optgroup></select>
          ${r.overLimit ? `<span class="badge warn">${esc(t('over daily limit'))}</span>` : ''}</td></tr>`;
    }).join('');
    const text = subText(ds, rows, S.sub.absences);
    results = `<section class="card" aria-labelledby="subRes">
      <h2 id="subRes">${esc(t('Substitutions for'))} ${esc(fmtDate(ds, true))}: ${rows.length} ${esc(t('periods'))}, ${covered} ${esc(t('covered'))}${rows.length - covered ? `, ${rows.length - covered} ${esc(t('not covered'))}` : ''}</h2>
      ${S.sub.stale ? `<p class="msg warn">${esc(t('The absent list changed. Press Create substitutions again to update this list.'))}</p>` : ''}
      ${rows.length ? `<div class="tablewrap"><table class="data"><caption class="sr-only">${esc(t('Substitutions'))}</caption>
        <thead><tr><th scope="col">${esc(t('Period'))}</th><th scope="col">${esc(t('Class'))}</th><th scope="col">${esc(t('Subject'))}</th><th scope="col">${esc(t('Absent'))}</th><th scope="col">${esc(t('Substitute'))}</th></tr></thead>
        <tbody>${trs}</tbody></table></div>` : `<p class="msg ok">${esc(t('The absent teachers have no classes in this time. Nothing to cover.'))}</p>`}
      <div class="toolbar">
        <button type="button" class="btn primary" data-act="subWhatsApp">💬 ${esc(t('Share on WhatsApp'))}</button>
        <button type="button" class="btn" data-act="subCopy">📋 ${esc(t('Copy text'))}</button>
        <button type="button" class="btn" data-act="subPdf">📄 ${esc(t('Save PDF'))}</button>
        <button type="button" class="btn" data-act="subAuto">${esc(t('Re-assign automatically'))}</button>
      </div>
      <details><summary>${esc(t('Message preview'))}</summary><label class="sr-only" for="sub_text">${esc(t('Message preview'))}</label><textarea id="sub_text" readonly rows="14">${esc(text)}</textarea></details>
    </section>`;
  }
  return `<h1>${esc(t('Leave & Substitution'))}</h1>
  <p class="lead">${esc(t('Choose the date, add the teachers who are on leave, then press Create substitutions. Free teachers are chosen fairly, preferring those who teach the class or subject.'))}</p>
  ${hasTT ? '' : `<p class="msg warn">${esc(t('There is no timetable yet. Generate or import a timetable first.'))}</p>`}
  <div class="card">
    <div class="row">
      <label>${esc(t('Date'))}<input type="date" id="sub_date" data-change="subDate" value="${esc(ds)}"></label>
      <button type="button" class="btn" data-act="subToday">${esc(t('Today'))}</button>
      <button type="button" class="btn" data-act="subTomorrow">${esc(t('Tomorrow'))}</button>
      <strong>${esc(fmtDate(ds))}</strong>
    </div>
    ${sp ? `<p class="msg">📆 ${esc(t('Special day'))}: ${esc(specialLabel(sp))}${sp.note ? ' – ' + esc(sp.note) : ''}. <button type="button" class="btn small" data-act="subClearSpecial">${esc(t('Undo special day'))}</button></p>` : ''}
    ${dIdx < 0 && !sp ? `<div class="msg warn"><p>${esc(t('There are no classes on this day in the school profile.'))}</p>
      <div class="row"><label>${esc(t('Classes on this day? Follow the timetable of'))}<select id="sub_follow">${[...Array(nDays()).keys()].map((d) => `<option value="${d}">${esc(sDay(d))}</option>`).join('')}</select></label>
      <button type="button" class="btn" data-act="subMakeWorking">${esc(t('Make it a working day'))}</button></div></div>` : ''}
    ${dIdx >= 0 && !sp ? `<p><button type="button" class="btn small" data-act="subMakeHoliday">${esc(t('Mark this day as a holiday'))}</button></p>` : ''}
  </div>
  <section class="card" aria-labelledby="absH">
    <h2 id="absH">${esc(t('Absent teachers'))} (${S.sub.absences.length})</h2>
    <div class="row">
      <label>${esc(t('Type or choose a teacher'))}<input id="abs_in" list="tlist" autocomplete="off" aria-describedby="absHelp" style="min-width:280px"></label>
      <datalist id="tlist">${sortByName(D.teachers).filter((x) => !S.sub.absences.some((a) => a.teacherId === x.id)).map((x) => `<option value="${esc(x.name)}">${esc(x.short)}</option>`).join('')}</datalist>
      <label>${esc(t('Leave type'))}<select id="abs_sess">${Object.entries(SESS).map(([k, v]) => `<option value="${k}">${esc(t(v))}</option>`).join('')}</select></label>
      <button type="button" class="btn" data-act="absAdd">${esc(t('Add'))}</button>
    </div>
    <p id="absHelp" class="muted">${esc(t('Type a few letters of the name or short name and press Enter. Add as many teachers as needed.'))}</p>
    ${abs ? `<ul class="list-plain">${abs}</ul>` : ''}
    <p><button type="button" class="btn primary" data-act="subCreate" ${S.sub.absences.length && dIdx >= 0 ? '' : 'disabled'}>🔁 ${esc(t('Create substitutions'))}</button></p>
  </section>
  ${results}`;
};

function findTeacher(q) {
  q = q.trim().toLowerCase();
  if (!q) return null;
  const exact = D.teachers.find((x) => x.name.toLowerCase() === q || (x.short || '').toLowerCase() === q);
  if (exact) return exact;
  const starts = D.teachers.filter((x) => x.name.toLowerCase().startsWith(q));
  if (starts.length === 1) return starts[0];
  const has = D.teachers.filter((x) => x.name.toLowerCase().includes(q));
  return has.length === 1 ? has[0] : null;
}

ACTIONS.absAdd = () => {
  const inp = $('#abs_in');
  const x = findTeacher(inp.value);
  if (!x) { announce(inp.value.trim() ? t('No single teacher matches. Type more of the name.') : t('Type a teacher name first.')); inp.focus(); return; }
  if (S.sub.absences.some((a) => a.teacherId === x.id)) { announce(`${x.name} ${t('is already in the list.')}`); inp.value = ''; inp.focus(); return; }
  S.sub.absences.push({ teacherId: x.id, session: $('#abs_sess').value, periods: [], note: '' });
  if (S.sub.rows) S.sub.stale = true;
  persistSub();
  render(false);
  $('#abs_in').focus();
  announce(`${x.name} ${t('added')} (${t(SESS[$('#abs_sess').value])}). ${S.sub.absences.length} ${t('absent')}.`);
};
ACTIONS.absRemove = (el) => {
  S.sub.absences = S.sub.absences.filter((a) => a.teacherId !== el.dataset.id);
  if (S.sub.rows) S.sub.stale = true;
  persistSub();
  render(false);
  $('#abs_in').focus();
  announce(`${tName(el.dataset.id)} ${t('removed.')}`);
};
CHANGES.absSess = (el) => {
  const a = S.sub.absences.find((x) => x.teacherId === el.dataset.id);
  if (!a) return;
  a.session = el.value;
  if (S.sub.rows) S.sub.stale = true;
  persistSub();
  render(false);
};
CHANGES.absPeriod = (el) => {
  const a = S.sub.absences.find((x) => x.teacherId === el.dataset.id);
  if (!a) return;
  const p = +el.dataset.p;
  a.periods = el.checked ? [...new Set([...(a.periods || []), p])].sort((x, y) => x - y) : (a.periods || []).filter((x) => x !== p);
  if (S.sub.rows) S.sub.stale = true;
  persistSub();
};
CHANGES.absNote = (el) => {
  const a = S.sub.absences.find((x) => x.teacherId === el.dataset.id);
  if (!a) return;
  a.note = el.value;
  if (S.sub.rows) S.sub.rows.forEach((r) => r.absentTeacherId === a.teacherId && (r.note = a.note));
  persistSub();
};
CHANGES.subDate = (el) => { if (el.value) { loadSubDate(el.value); render(false); announce(fmtDate(el.value)); } };
ACTIONS.subToday = () => { loadSubDate(todayStr()); render(false); announce(fmtDate(S.sub.date)); };
ACTIONS.subTomorrow = () => { loadSubDate(SamayamSub.addDays(todayStr(), 1)); render(false); announce(fmtDate(S.sub.date)); };

ACTIONS.subCreate = () => {
  const keepManual = S.sub.rows && !S.sub.stale ? S.sub.rows.filter((r) => r.manual) : [];
  const res = SamayamSub.plan(D, S.sub.date, S.sub.absences);
  // keep choices the user made by hand when the same period still needs cover
  for (const m of keepManual) {
    const r = res.rows.find((x) => x.period === m.period && x.classId === m.classId && x.absentTeacherId === m.absentTeacherId);
    if (r) { r.subTeacherId = m.subTeacherId; r.manual = true; }
  }
  S.sub.rows = res.rows;
  S.sub.stale = false;
  persistSub();
  render(false);
  const h = $('#subRes'); if (h) { h.tabIndex = -1; h.focus(); }
  const cov = res.rows.filter((r) => r.subTeacherId).length;
  announce(`${t('Substitutions created')}: ${res.rows.length} ${t('periods')}, ${cov} ${t('covered')}${res.rows.length - cov ? ', ' + (res.rows.length - cov) + ' ' + t('not covered') : ''}.`);
};
ACTIONS.subAuto = () => {
  S.sub.rows.forEach((r) => (r.manual = false));
  const ctx = SamayamSub.createContext(D, S.sub.date, S.sub.absences);
  ctx.autoAssign(S.sub.rows);
  persistSub();
  render(false);
  announce(t('Substitutes re-assigned automatically.'));
};
CHANGES.subPick = (el) => {
  const r = S.sub.rows[+el.dataset.i];
  r.subTeacherId = el.value || null;
  r.manual = true;
  r.overLimit = false;
  persistSub();
  render(false);
  announce(r.subTeacherId ? `${tName(r.subTeacherId)} ${t('will take')} ${rowClassName(r)}, ${periodLabel(r.period, false)}.` : t('Marked as not covered.'));
};
ACTIONS.subCopy = async () => { await io.copyText(subText(S.sub.date, S.sub.rows, S.sub.absences)); announce(t('Copied.') + ' ' + t('Paste it in WhatsApp or anywhere.')); };
ACTIONS.subWhatsApp = async () => {
  const text = subText(S.sub.date, S.sub.rows, S.sub.absences);
  await io.copyText(text);
  await io.shareWhatsApp(text);
  announce(t('Opening WhatsApp. The message is also copied, so you can paste it.'));
};
ACTIONS.subPdf = async () => {
  const ds = S.sub.date, rows = S.sub.rows;
  const trs = rows.slice().sort((a, b) => a.period - b.period).map((r) => `<tr><td>${r.period + 1}<br><small>${esc(pTime(r.period, dayIdx(ds)))}</small></td><td>${esc(rowClassName(r))}</td><td class="l">${esc(subjName(r.subjectId))}</td>
    <td class="l">${esc(tName(r.absentTeacherId))}</td><td class="l">${r.subTeacherId ? esc(tName(r.subTeacherId)) : `<span class="warn">${esc(t('No substitute'))}</span>`}</td><td class="l">${esc(r.note || '')}</td><td style="width:70px"></td></tr>`).join('');
  const inner = `${schoolHeader(`${t('Substitution')} – ${fmtDate(ds)}`)}
    <p><b>${esc(t('Absent'))}:</b> ${esc(S.sub.absences.map((a) => `${tName(a.teacherId)} (${sessLabel(a)})`).join(', '))}</p>
    <table><thead><tr><th>${esc(t('Period'))}</th><th>${esc(t('Class'))}</th><th>${esc(t('Subject'))}</th><th>${esc(t('Absent'))}</th><th>${esc(t('Substitute'))}</th><th>${esc(t('Work'))}</th><th>${esc(t('Signature'))}</th></tr></thead><tbody>${trs}</tbody></table>
    <div class="foot"><span>${esc(t('Prepared by'))}: ____________</span><span>${esc(t('Headmaster / Principal'))}: ____________</span></div>`;
  const p = await io.savePdf({ html: printDoc('Substitution ' + ds, inner), fileName: `Substitution_${ds}.pdf` });
  if (p) announce(t('PDF saved.'));
};

// ======================================================================
// NOW
// ======================================================================
const toMin = (s) => { if (!s) return null; const [h, m] = s.split(':').map(Number); return h * 60 + m; };
ACTIONS.subMakeWorking = () => {
  setSpecialDay(S.sub.date, 'follow', $('#sub_follow').value, '');
  render(false);
  announce(`${fmtDate(S.sub.date)}: ${specialLabel(D.specialDays[S.sub.date])}.`);
};
ACTIONS.subMakeHoliday = () => {
  setSpecialDay(S.sub.date, 'holiday', 0, '');
  render(false);
  announce(`${fmtDate(S.sub.date)}: ${t('Holiday – no classes')}.`);
};
ACTIONS.subClearSpecial = () => {
  delete D.specialDays[S.sub.date];
  save();
  render(false);
  announce(t('Back to the normal timetable for this day.'));
};

function nowInfo(dt) {
  const d = dayIdx(todayStr(dt));
  if (d < 0) return { d, state: 'holiday' };
  const m = dt.getHours() * 60 + dt.getMinutes();
  const P = nPer(), pts = periodTimesFor(d);
  for (let p = 0; p < P; p++) {
    const s = toMin(pts[p] && pts[p].start), e = toMin(pts[p] && pts[p].end);
    if (s == null || e == null) continue;
    if (m >= s && m < e) return { d, p, state: 'during', next: p + 1 < P ? p + 1 : null };
    if (p === 0 && m < s) return { d, state: 'before', next: 0 };
    const ns = toMin(pts[p + 1] && pts[p + 1].start);
    if (m >= e && ns != null && m < ns) return { d, state: 'break', next: p + 1 };
  }
  return { d, state: 'after' };
}
// Lesson in a class at d,p with that day's substitutions applied.
function effective(classId, d, p, ds) {
  const l = les(cellOf(classId, d, p));
  if (!l) return null;
  const subs = (ds && D.substitutions[ds]) || [];
  const teachers = (l.teacherIds || []).map((tid) => {
    const r = subs.find((x) => (x.classIds || [x.classId]).includes(classId) && x.period === p && x.absentTeacherId === tid);
    return r ? { id: r.subTeacherId, sub: true, forId: tid } : { id: tid };
  });
  return { l, teachers };
}
function effText(e) {
  if (!e) return t('Free period');
  return `${subjName(e.l.subjectId)} – ${e.teachers.map((x) => x.sub ? (x.id ? `${tName(x.id)} (${t('substitute for')} ${tName(x.forId)})` : `⚠ ${t('no teacher')} (${tName(x.forId)} ${t('on leave')})`) : tName(x.id)).join(' + ')}`;
}
function teacherAt(tid, d, p, ds) {
  const leave = D.leaves.find((l) => l.date === ds && l.teacherId === tid);
  if (leave && SamayamSub.absentPeriods(leave, D.school).includes(p)) return t('On leave');
  const sub = ((ds && D.substitutions[ds]) || []).find((r) => r.subTeacherId === tid && r.period === p);
  if (sub) return `${t('Substitution in')} ${rowClassName(sub)} – ${subjName(sub.subjectId)}`;
  for (const c of D.classes) {
    const l = les(cellOf(c.id, d, p));
    if (l && (l.teacherIds || []).includes(tid)) return `${groupName(lcIds(l))} – ${subjName(l.subjectId)}`;
  }
  return t('Free');
}

function nowOutput() {
  const N = S.now;
  const real = nowInfo(new Date());
  const ds = todayStr();
  let d = N.day === 'auto' ? real.d : +N.day;
  let p = N.period === 'auto' ? (real.state === 'during' ? real.p : real.next) : +N.period;
  let head = '';
  if (N.day === 'auto' && N.period === 'auto') {
    if (real.state === 'holiday') return `<p class="now-big">${esc(t('Today is not a working day.'))}</p>`;
    if (real.state === 'after') return `<p class="now-big">${esc(t('School is over for today.'))}</p>`;
    head = real.state === 'during' ? `${t('Current period')}: ${periodLabel(p, true, d)}` : real.state === 'break' ? `${t('Break now. Next')}: ${periodLabel(p, true, d)}` : `${t('Before school. First')}: ${periodLabel(p, true, d)}`;
  } else {
    if (d < 0 || d == null) d = 0;
    if (p == null || isNaN(p)) p = 0;
    head = `${sDay(d)}, ${periodLabel(p, true, d)}`;
  }
  const useDs = N.day === 'auto' ? ds : null;
  if (N.mode === 'class') {
    const c = cls(N.target) || classesSorted()[0];
    if (!c) return '';
    const e = effective(c.id, d, p, useDs);
    const nextP = p + 1 < nPer() ? p + 1 : null;
    return `<p class="muted">${esc(head)}</p><p class="now-big">${esc(c.name)}: ${esc(effText(e))}</p>
      ${nextP != null ? `<p>${esc(t('Next period'))} (${esc(periodLabel(nextP, true, d))}): <strong>${esc(effText(effective(c.id, d, nextP, useDs)))}</strong></p>` : ''}`;
  }
  if (N.mode === 'teacher') {
    const x = tch(N.target) || sortByName(D.teachers)[0];
    if (!x) return '';
    let list = '';
    for (let q = 0; q < nPer(); q++) list += `<li ${q === p ? 'aria-current="true" style="font-weight:700"' : ''}>${esc(periodLabel(q, true, d))}: ${esc(teacherAt(x.id, d, q, useDs))}</li>`;
    return `<p class="muted">${esc(head)}</p><p class="now-big">${esc(x.name)}: ${esc(teacherAt(x.id, d, p, useDs))}</p>
      <h3>${esc(t('Day schedule'))} – ${esc(sDay(d))}</h3><ul class="list-plain">${list}</ul>`;
  }
  const rows = classesSorted().map((c) => { const e = effective(c.id, d, p, useDs); return `<tr><th scope="row">${esc(c.name)}</th><td>${e ? `<span class="chip" style="--h:${hueOf(e.l.subjectId)}" aria-hidden="true">${esc((subj(e.l.subjectId) || {}).short)}</span> ` : ''}${esc(effText(e))}</td></tr>`; }).join('');
  const free = sortByName(D.teachers).filter((x) => teacherAt(x.id, d, p, useDs) === t('Free'));
  return `<p class="now-big">${esc(head)}</p>
    <div class="grid2"><div class="tablewrap"><table class="data"><caption>${esc(t('Whole school'))}</caption><thead><tr><th scope="col">${esc(t('Class'))}</th><th scope="col">${esc(t('Subject'))} / ${esc(t('Teacher'))}</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div><h3>${esc(t('Free teachers now'))} (${free.length})</h3><ul class="list-plain">${free.map((x) => `<li>${esc(x.name)}</li>`).join('') || `<li>${esc(t('None'))}</li>`}</ul></div></div>`;
}

VIEWS.now = () => {
  const N = S.now;
  const targets = N.mode === 'teacher' ? sortByName(D.teachers) : classesSorted();
  if (N.mode !== 'school' && !targets.some((x) => x.id === N.target)) N.target = targets[0] ? targets[0].id : '';
  return `<h1>${esc(t('Now'))}</h1>
  <p class="lead">${esc(t('See what is happening right now in a class, for a teacher, or in the whole school. Today’s substitutions are included.'))}</p>
  <div class="card"><div class="toolbar">
    <label>${esc(t('Show'))}<select id="now_mode" data-change="nowMode">
      <option value="school" ${N.mode === 'school' ? 'selected' : ''}>${esc(t('Whole school'))}</option>
      <option value="class" ${N.mode === 'class' ? 'selected' : ''}>${esc(t('One class'))}</option>
      <option value="teacher" ${N.mode === 'teacher' ? 'selected' : ''}>${esc(t('One teacher'))}</option></select></label>
    ${N.mode !== "school" ? combo({ id: "now_target", label: N.mode === "teacher" ? t("Teacher") : t("Class"), kind: N.mode, selectedId: N.target, change: "nowTarget" }) : ""}
    <label>${esc(t('Day'))}<select id="now_day" data-change="nowDay"><option value="auto">${esc(t('Today (live)'))}</option>${[...Array(nDays()).keys()].map((d) => `<option value="${d}" ${String(N.day) === String(d) ? 'selected' : ''}>${esc(sDay(d))}</option>`).join('')}</select></label>
    <label>${esc(t('Period'))}<select id="now_period" data-change="nowPeriod"><option value="auto">${esc(t('Current (live)'))}</option>${[...Array(nPer()).keys()].map((p) => `<option value="${p}" ${String(N.period) === String(p) ? 'selected' : ''}>${esc(periodLabel(p, true, N.day === "auto" ? dayIdx(todayStr()) : +N.day))}</option>`).join('')}</select></label>
    <button type="button" class="btn" data-act="nowRead">${esc(t('Read aloud summary'))}</button>
  </div></div>
  <section class="card" id="nowOut" aria-label="${esc(t('Result'))}">${nowOutput()}</section>`;
};
CHANGES.nowMode = (el) => { S.now.mode = el.value; S.now.target = ''; render(false); };
CHANGES.nowTarget = (el) => { S.now.target = el.value; render(false); };
CHANGES.nowDay = (el) => { S.now.day = el.value; if (el.value === 'auto') S.now.period = 'auto'; render(false); };
CHANGES.nowPeriod = (el) => { S.now.period = el.value; render(false); };
ACTIONS.nowRead = () => { const o = $('#nowOut'); announce((o.querySelector('.now-big') || o).textContent.trim() + ' ' + ((o.querySelector('.now-big + p') || {}).textContent || '')); };

// ======================================================================
// DASHBOARD
// ======================================================================
VIEWS.dashboard = () => {
  const ds = todayStr();
  const leaves = D.leaves.filter((l) => l.date === ds);
  const subs = D.substitutions[ds] || [];
  const cov = subs.filter((r) => r.subTeacherId).length;
  const ni = nowInfo(new Date());
  const nowTxt = ni.state === 'during' ? periodLabel(ni.p) : ni.state === 'holiday' ? t('Holiday') : ni.state === 'after' ? t('School over') : ni.state === 'before' ? t('Before school') : t('Break');
  const filled = Object.values(D.timetable.cells).some((g) => g.some((r) => r.some(Boolean)));
  const N = nDays() * nPer();
  const classOk = D.classes.length && D.classes.every((c) => lessonsOfClass(c.id).reduce((a, l) => a + (+l.perWeek || 0), 0) === N);
  const assignOk = D.lessons.length && D.lessons.every((l) => (l.teacherIds || []).length);
  const clashes = SamayamSolver.findClashes(D).list.length;
  const check = [
    [true, t('School profile saved'), 'school'],
    [D.classes.length > 0, `${t('Classes added')} (${D.classes.length})`, 'school'],
    [D.teachers.length > 0, `${t('Teachers added')} (${D.teachers.length})`, 'teachers'],
    [classOk, t('Every class has a full week of subjects'), 'allocation'],
    [assignOk, t('Every subject has a teacher'), 'allocation'],
    [filled && !clashes, filled ? (clashes ? `${t('Timetable has clashes')} (${clashes})` : t('Timetable ready')) : t('Timetable not generated yet'), 'timetable']
  ];
  return `<h1>${esc(t('Today'))}</h1>
  <p class="lead">${esc(fmtDate(ds))} · ${esc(D.school.name)}</p>
  ${(D.specialDays || {})[ds] ? `<p class="msg">📆 ${esc(t('Special day'))}: ${esc(specialLabel(D.specialDays[ds]))}${D.specialDays[ds].note ? ' – ' + esc(D.specialDays[ds].note) : ''}</p>` : ''}
  <div class="cards">
    <div class="stat"><div class="big">${esc(nowTxt)}</div><div class="label">${esc(t('Now'))}</div></div>
    <div class="stat"><div class="big">${leaves.length}</div><div class="label">${esc(t('Absent today'))}</div></div>
    <div class="stat"><div class="big">${cov}/${subs.length}</div><div class="label">${esc(t('Substitutions covered today'))}</div></div>
    <div class="stat"><div class="big">${D.classes.length} · ${D.teachers.length}</div><div class="label">${esc(t('Classes · Teachers'))}</div></div>
  </div>
  <div class="toolbar">
    <button type="button" class="btn primary" data-nav="substitution">🔁 ${esc(t('Mark leave & create substitutions'))}</button>
    <button type="button" class="btn" data-nav="now">🕒 ${esc(t('What is happening now'))}</button>
    <button type="button" class="btn" data-nav="timetable">📅 ${esc(t('Timetable'))}</button>
  </div>
  ${leaves.length ? `<section class="card" aria-labelledby="tdH"><h2 id="tdH">${esc(t('Absent today'))}</h2><ul class="list-plain">${leaves.map((l) => `<li>${esc(tName(l.teacherId))} – ${esc(sessLabel(l))}</li>`).join('')}</ul>
    ${subs.length - cov ? `<p class="msg err">${subs.length - cov} ${esc(t('periods are not covered yet.'))}</p>` : subs.length ? `<p class="msg ok">${esc(t('All periods are covered.'))}</p>` : `<p class="msg warn">${esc(t('Substitutions not created yet.'))}</p>`}</section>` : ''}
  <section class="card" aria-labelledby="ckH"><h2 id="ckH">${esc(t('Setup checklist'))}</h2>
    <ul class="list-plain checklist">${check.map(([ok, txt, v]) => `<li>${ok ? '✅' : '⬜'} <span class="sr-only">${ok ? t('Done') : t('Not done')}:</span> ${esc(txt)} ${ok ? '' : `<button type="button" class="btn small" data-nav="${v}">${esc(t('Go'))}</button>`}</li>`).join('')}</ul>
  </section>`;
};

// ======================================================================
// REPORTS
// ======================================================================
function inRange(ds) { return ds >= S.rep.from && ds <= S.rep.to; }
function reportData() {
  const subsBy = {}, leaveBy = {}, lostBy = {};
  D.teachers.forEach((x) => { subsBy[x.id] = 0; leaveBy[x.id] = { full: 0, half: 0, periods: 0 }; });
  D.classes.forEach((c) => (lostBy[c.id] = { absent: 0, covered: 0 }));
  for (const [ds, rows] of Object.entries(D.substitutions)) {
    if (!inRange(ds)) continue;
    for (const r of rows) {
      if (r.subTeacherId && subsBy[r.subTeacherId] !== undefined) subsBy[r.subTeacherId]++;
      for (const cid of r.classIds || [r.classId]) if (lostBy[cid]) { lostBy[cid].absent++; if (r.subTeacherId) lostBy[cid].covered++; }
    }
  }
  for (const l of D.leaves) {
    if (!inRange(l.date) || !leaveBy[l.teacherId]) continue;
    if (l.session === 'full' || !l.session) leaveBy[l.teacherId].full++;
    else if (l.session === 'am' || l.session === 'pm') leaveBy[l.teacherId].half++;
    else leaveBy[l.teacherId].periods += (l.periods || []).length;
  }
  return { subsBy, leaveBy, lostBy };
}
function ttCount(tid) {
  let n = 0;
  for (let d = 0; d < nDays(); d++) for (let p = 0; p < nPer(); p++) if (D.classes.some((c) => { const l = les(cellOf(c.id, d, p)); return l && (l.teacherIds || []).includes(tid); })) n++;
  return n;
}
VIEWS.reports = () => {
  if (!S.rep.from) { const n = new Date(); S.rep.from = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-01`; S.rep.to = todayStr(); }
  const { subsBy, leaveBy, lostBy } = reportData();
  const maxS = Math.max(1, ...Object.values(subsBy));
  const subsRows = sortByName(D.teachers).sort((a, b) => subsBy[b.id] - subsBy[a.id]).map((x) => `<tr><th scope="row">${esc(x.name)}</th><td>${subsBy[x.id]}</td>
    <td><div class="barwrap" aria-hidden="true"><div class="bar" style="width:${(subsBy[x.id] / maxS) * 100}%"></div></div></td></tr>`).join('');
  const leaveRows = sortByName(D.teachers).filter((x) => leaveBy[x.id].full + leaveBy[x.id].half + leaveBy[x.id].periods).map((x) => `<tr><th scope="row">${esc(x.name)}</th><td>${leaveBy[x.id].full}</td><td>${leaveBy[x.id].half}</td><td>${leaveBy[x.id].periods}</td></tr>`).join('');
  const lostRows = classesSorted().filter((c) => lostBy[c.id].absent).map((c) => `<tr><th scope="row">${esc(c.name)}</th><td>${lostBy[c.id].absent}</td><td>${lostBy[c.id].covered}</td><td>${lostBy[c.id].absent - lostBy[c.id].covered ? `<span class="badge err">${lostBy[c.id].absent - lostBy[c.id].covered}</span>` : 0}</td></tr>`).join('');
  const wlRows = sortByName(D.teachers).map((x) => { const a = teacherLoad(x.id), m = +x.maxPerWeek || 0, tc = ttCount(x.id); return `<tr><th scope="row">${esc(x.name)}</th><td>${a}</td><td>${tc}</td><td>${m || '–'}</td><td>${m && a > m ? `<span class="badge err">${esc(t('Over limit'))}</span>` : `<span class="badge ok">OK</span>`}</td></tr>`; }).join('');
  const none = `<p class="muted">${esc(t('No records in this period.'))}</p>`;
  return `<h1>${esc(t('Reports'))}</h1>
  <div class="card"><div class="row">
    <label>${esc(t('From'))}<input type="date" id="rep_from" data-change="repFrom" value="${S.rep.from}"></label>
    <label>${esc(t('To'))}<input type="date" id="rep_to" data-change="repTo" value="${S.rep.to}"></label>
    <button type="button" class="btn" data-act="repExcel">Excel</button>
    <button type="button" class="btn" data-act="repPdf">PDF</button>
  </div></div>
  <section class="card" aria-labelledby="r1"><h2 id="r1">${esc(t('Substitutions taken'))}</h2>
    <p class="muted">${esc(t('Shows how fairly substitution duty is shared.'))}</p>
    ${D.teachers.length ? `<div class="tablewrap"><table class="data"><thead><tr><th scope="col">${esc(t('Teacher'))}</th><th scope="col">${esc(t('Count'))}</th><th scope="col"><span class="sr-only">${esc(t('Bar'))}</span></th></tr></thead><tbody>${subsRows}</tbody></table></div>` : none}</section>
  <section class="card" aria-labelledby="r2"><h2 id="r2">${esc(t('Leave taken'))}</h2>
    ${leaveRows ? `<table class="data"><thead><tr><th scope="col">${esc(t('Teacher'))}</th><th scope="col">${esc(t('Full days'))}</th><th scope="col">${esc(t('Half days'))}</th><th scope="col">${esc(t('Single periods'))}</th></tr></thead><tbody>${leaveRows}</tbody></table>` : none}</section>
  <section class="card" aria-labelledby="r3"><h2 id="r3">${esc(t('Periods lost per class'))}</h2>
    ${lostRows ? `<table class="data"><thead><tr><th scope="col">${esc(t('Class'))}</th><th scope="col">${esc(t('Teacher absent'))}</th><th scope="col">${esc(t('Covered'))}</th><th scope="col">${esc(t('Not covered'))}</th></tr></thead><tbody>${lostRows}</tbody></table>` : none}</section>
  <section class="card" aria-labelledby="r4"><h2 id="r4">${esc(t('Teacher workload'))}</h2>
    <table class="data"><thead><tr><th scope="col">${esc(t('Teacher'))}</th><th scope="col">${esc(t('Assigned periods/week'))}</th><th scope="col">${esc(t('In timetable'))}</th><th scope="col">${esc(t('Limit'))}</th><th scope="col">${esc(t('Status'))}</th></tr></thead><tbody>${wlRows}</tbody></table></section>`;
};
CHANGES.repFrom = (el) => { S.rep.from = el.value; render(false); };
CHANGES.repTo = (el) => { S.rep.to = el.value; render(false); };
function reportSheets() {
  const { subsBy, leaveBy, lostBy } = reportData();
  return [
    { name: 'Substitutions', rows: [['Teacher', 'Substitutions taken']].concat(sortByName(D.teachers).map((x) => [x.name, subsBy[x.id]])) },
    { name: 'Leave', rows: [['Teacher', 'Full days', 'Half days', 'Single periods']].concat(sortByName(D.teachers).map((x) => [x.name, leaveBy[x.id].full, leaveBy[x.id].half, leaveBy[x.id].periods])) },
    { name: 'Periods lost', rows: [['Class', 'Teacher absent', 'Covered', 'Not covered']].concat(classesSorted().map((c) => [c.name, lostBy[c.id].absent, lostBy[c.id].covered, lostBy[c.id].absent - lostBy[c.id].covered])) },
    { name: 'Workload', rows: [['Teacher', 'Assigned/week', 'In timetable', 'Limit']].concat(sortByName(D.teachers).map((x) => [x.name, teacherLoad(x.id), ttCount(x.id), +x.maxPerWeek || ''])) }
  ];
}
ACTIONS.repExcel = async () => { if (await io.exportExcel({ fileName: `Report_${S.rep.from}_to_${S.rep.to}.xlsx`, sheets: reportSheets() })) announce(t('Excel file saved.')); };
ACTIONS.repPdf = async () => {
  const inner = schoolHeader(`${t('Report')}: ${fmtDate(S.rep.from, true)} – ${fmtDate(S.rep.to, true)}`) + reportSheets().map((s) =>
    `<h2>${esc(s.name)}</h2><table><thead><tr>${s.rows[0].map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${s.rows.slice(1).map((r) => `<tr>${r.map((v, i) => `<td class="${i ? '' : 'l'}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('');
  if (await io.savePdf({ html: printDoc('Report', inner), fileName: `Report_${S.rep.from}_to_${S.rep.to}.pdf` })) announce(t('PDF saved.'));
};

// ======================================================================
// IMPORT / EXPORT
// ======================================================================
VIEWS.data = () => `<h1>${esc(t('Import / Export'))}</h1>
  <section class="card" aria-labelledby="d1"><h2 id="d1">Excel</h2>
    <div class="toolbar">
      <button type="button" class="btn" data-act="excelTT" ${D.school ? '' : 'disabled'}>${esc(t('Export timetable to Excel'))}</button>
      <button type="button" class="btn" data-act="tplTeachers">${esc(t('Download teachers template'))}</button>
      <button type="button" class="btn" data-act="tplTT" ${D.school ? '' : 'disabled'}>${esc(t('Download timetable template'))}</button>
    </div>
    <div class="toolbar">
      <button type="button" class="btn primary" data-act="impTeachers" ${D.school ? '' : 'disabled'}>${esc(t('Import teachers from Excel'))}</button>
      <button type="button" class="btn primary" data-act="impTT" ${D.school ? '' : 'disabled'}>${esc(t('Import timetable from Excel'))}</button>
    </div>
    <details><summary>${esc(t('Excel format help'))}</summary>
      <p><strong>${esc(t('Teachers'))}:</strong> ${esc(t('one sheet. First row: Name, Short, Subjects, Max per week, Max per day, Phone, Senior. Subjects are separated by commas, for example: English, Hindi.'))}</p>
      <p><strong>${esc(t('Timetable'))}:</strong> ${esc(t('one sheet per class, named with the class name (for example 5A or +1 S1). First row: Day, P1, P2 … Next rows: one row per day (Monday, Tuesday …). Each cell: Subject / Teacher short name, for example “Mathematics / SK”. Two teachers: “Arabic / AK + SN”. Sheets whose names start with “T - ” or “Master” are skipped, so an exported file can be imported again.'))}</p>
    </details>
  </section>
  <section class="card" aria-labelledby="d2"><h2 id="d2">${esc(t('Backup'))}</h2>
    <p class="muted">${esc(t('A backup is one file with everything: school, teachers, timetable, leave and substitution history. Keep a copy on a pen drive or in Google Drive.'))}</p>
    <div class="toolbar">
      <button type="button" class="btn primary" data-act="backup">${esc(t('Save backup'))}</button>
      <button type="button" class="btn" data-act="restore">${esc(t('Restore from backup'))}</button>
    </div>
  </section>
  <section class="card" aria-labelledby="d3"><h2 id="d3">${esc(t('Demo and reset'))}</h2>
    <div class="toolbar">
      <button type="button" class="btn" data-act="loadDemo">🎓 ${esc(t('Load demo school'))}</button>
      <button type="button" class="btn danger" data-act="resetAll">${esc(t('Delete all data'))}</button>
    </div>
  </section>`;

ACTIONS.tplTT = async () => {
  const head = xlHeader();
  const list = D.classes.length ? classesSorted() : [{ name: '5A' }];
  const sheets = list.map((c) => ({ name: c.name, rows: [head].concat(D.school.workingDays.map((wd) => [WD[wd]].concat(Array(nPer()).fill('')))) }));
  if (await io.exportExcel({ fileName: 'Timetable_template.xlsx', sheets })) announce(t('Excel file saved.'));
};

function colIdx(header, ...names) {
  const h = header.map((x) => String(x).toLowerCase());
  for (const n of names) { const i = h.findIndex((x) => x.includes(n)); if (i >= 0) return i; }
  return -1;
}

// ---------- teachers from Excel / Google Sheets ----------
ACTIONS.tplTeachers = async () => {
  const rows = [
    ['Name', 'Short name', 'Senior/Junior', 'Subjects', 'Classes', 'Max periods per week', 'Available days', 'Phone'],
    ['Sreeja K', 'SK', 'Senior', 'Malayalam I', '8, 9', 25, '', ''],
    ['A.K.P', '', 'Junior', 'English, Hindi, Basic Science', '5A, 6B', 25, '', ''],
    ['Music teacher', 'MUS', 'Junior', 'Music', '', 25, 'Monday, Wednesday', '']
  ];
  const ref = [['Subjects in this school (copy names from here)']].concat(sortByName(D.subjects).map((s) => [`${s.name}`]));
  const clsRows = [['Classes in this school']].concat(classesSorted().map((c) => [c.name]));
  if (await io.exportExcel({ fileName: 'Teachers_template.xlsx', sheets: [{ name: 'Teachers', rows, colWidth: 24 }, { name: 'Subjects list', rows: ref, firstColWidth: 40 }, { name: 'Classes list', rows: clsRows }] })) announce(t('Excel file saved.'));
};

const normTxt = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9+ഀ-ൿ]+/g, ' ').trim();
const SUBJ_ALIAS = { maths: 'mathematics', math: 'mathematics', eng: 'english', hin: 'hindi', social: 'social science', 'social studies': 'social science', 'physical education': 'health physical education', pt: 'health physical education', it: 'information technology', computer: 'information technology', evs: 'environmental studies', science: 'basic science' };
function matchSubject(token) {
  const n = normTxt(token);
  if (!n) return null;
  const exact = D.subjects.find((x) => normTxt(x.name) === n || normTxt(x.short) === n);
  if (exact) return exact;
  const target = SUBJ_ALIAS[n] || n;
  const c = D.subjects.filter((x) => normTxt(x.name).startsWith(target));
  return c.length === 1 ? c[0] : null;
}
function matchClasses(token) {
  const n = normTxt(token).replace(/\s+/g, '');
  if (!n) return [];
  const byName = D.classes.filter((c) => normTxt(c.name).replace(/\s+/g, '') === n);
  if (byName.length) return byName;
  return D.classes.filter((c) => c.std && normTxt(c.std).replace(/\s+/g, '') === n); // a whole standard, e.g. "8"
}

ACTIONS.impTeachers = async () => {
  if (!D.school) { announce(t('Save the school profile first.')); return; }
  const res = await io.importExcel();
  if (!res) return;
  const sh = res.sheets.find((s) => s.rows.length && colIdx(s.rows[0], 'name') >= 0 && colIdx(s.rows[0], 'subject') >= 0) || res.sheets.find((s) => s.rows.length && colIdx(s.rows[0], 'name') >= 0);
  if (!sh) { await infoDlg(t('Import failed'), `<p>${esc(t('No sheet with a “Name” column was found. Download the template to see the format.'))}</p>`); return; }
  const h = sh.rows[0].map((x) => String(x).toLowerCase().trim());
  const find = (fn) => h.findIndex(fn);
  const ci = {
    name: (() => { const i = find((x) => ['name', 'teacher', 'teacher name', 'full name', 'name of teacher'].includes(x)); return i >= 0 ? i : find((x) => x.includes('name') && !x.includes('short')); })(),
    short: find((x) => /short|code|initial/.test(x)),
    senior: find((x) => /senior|junior|post|category|designation/.test(x)),
    subj: find((x) => x.includes('subject')),
    classes: find((x) => /class|std|division/.test(x)),
    week: find((x) => x.includes('week')),
    perDay: find((x) => /per day|max day|a day/.test(x)),
    days: find((x) => x.includes('available') || x === 'days' || x.includes('working days')),
    phone: find((x) => /phone|mobile|whatsapp/.test(x)),
    minFree: find((x) => x.includes('free'))
  };
  const cell = (r, i) => (i >= 0 ? String(r[i] || '').trim() : '');
  const recs = sh.rows.slice(1).map((r) => ({
    name: cell(r, ci.name), short: cell(r, ci.short), senior: cell(r, ci.senior),
    subjects: cell(r, ci.subj).split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean),
    classes: cell(r, ci.classes).split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean),
    week: +cell(r, ci.week) || 0, perDay: +cell(r, ci.perDay) || 0,
    days: cell(r, ci.days).split(/[,;\n]+|\s+/).map((s) => s.trim()).filter(Boolean),
    phone: cell(r, ci.phone), minFree: cell(r, ci.minFree)
  })).filter((r) => r.name);
  if (!recs.length) { await infoDlg(t('Import failed'), `<p>${esc(t('No teacher rows found under the header row.'))}</p>`); return; }

  // Subject names that do not match: ask what each one is.
  const unknown = [...new Set(recs.flatMap((r) => r.subjects).filter((s) => !matchSubject(s)).map((s) => s.trim()))];
  const mapping = {};
  if (unknown.length) {
    const opts = sortByName(D.subjects).map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    const fd = await modal({
      title: t('Match the subjects in the file'),
      ok: t('Continue import'),
      body: `<p>${esc(t('These subject names in the file are not in the school’s subject list. Choose what each one means.'))}</p>
        ${unknown.map((u, i) => `<label>${esc(t('In the file'))}: “${esc(u)}”<select name="map_${i}"><option value="new">${esc(t('Create a new subject'))} “${esc(u)}”</option><option value="">${esc(t('Ignore'))}</option><optgroup label="${esc(t('Same as'))}">${opts}</optgroup></select></label>`).join('')}`
    });
    if (!fd) return;
    unknown.forEach((u, i) => { mapping[normTxt(u)] = fd.get('map_' + i); });
  }
  const subjectId = (tok) => {
    const m = matchSubject(tok);
    if (m) return m.id;
    const v = mapping[normTxt(tok)];
    if (v === 'new') return PR.ensureSubject(D, tok.trim(), PR.initials(tok)).id;
    return v || null;
  };

  let added = 0, updated = 0, allocated = 0;
  const notFound = new Set();
  for (const r of recs) {
    let x = D.teachers.find((y) => y.name.toLowerCase() === r.name.toLowerCase() || (r.short && y.short.toLowerCase() === r.short.toLowerCase()));
    if (!x) { x = { id: PR.uid('t'), name: r.name, short: '', phone: '', subjects: [], maxPerWeek: D.school.defaultMaxWeek || 25, maxPerDay: nPer(), senior: false, unavailable: [] }; D.teachers.push(x); added++; } else updated++;
    x.name = r.name;
    // names written as initials (e.g. "J.K.P") are used as the short name too
    const initialsOnly = /^[A-Z](\.?\s?[A-Z]){1,4}\.?$/.test(r.name);
    x.short = uniqueShort(r.short || x.short || (initialsOnly ? r.name.replace(/[^A-Z]/g, '') : PR.initials(r.name)), x.id);
    const sids = [...new Set(r.subjects.map(subjectId).filter(Boolean))];
    if (sids.length) x.subjects = sids;
    if (r.senior) x.senior = /^(y|yes|senior|sr|hm|head|s)\b/i.test(r.senior);
    if (r.week) x.maxPerWeek = r.week;
    else if (x.senior && D.school.seniorMaxWeek) x.maxPerWeek = D.school.seniorMaxWeek;
    if (r.perDay) x.maxPerDay = r.perDay;
    if (r.phone) x.phone = r.phone;
    if (r.minFree !== '') x.minFree = Math.max(0, +r.minFree || 0);
    if (r.days.length) {
      const on = new Set(r.days.map(matchDay).filter((d) => d >= 0));
      if (on.size) {
        x.unavailable = [];
        for (let d = 0; d < nDays(); d++) if (!on.has(d)) for (let p = 0; p < nPer(); p++) x.unavailable.push(d + '-' + p);
      }
    }
    // Classes column: give this teacher their subjects in those classes
    for (const tok of r.classes) {
      const cs = matchClasses(tok);
      if (!cs.length) { notFound.add(tok); continue; }
      for (const c of cs) for (const l of lessonsOfClass(c.id)) {
        if (x.subjects.includes(l.subjectId) && !(l.teacherIds || []).length) { l.teacherIds = [x.id]; allocated++; }
      }
    }
  }
  save();
  render(false);
  const msg = `${added} ${t('teachers added')}, ${updated} ${t('updated')}${allocated ? `, ${allocated} ${t('class subjects assigned from the Classes column')}` : ''}.`;
  announce(msg);
  const next = await modal({
    title: t('Teachers imported'),
    ok: t('Assign and generate timetable'),
    cancel: t('Not now'),
    body: `<p>${esc(msg)}</p>${notFound.size ? `<p class="msg warn">${esc(t('These classes were not found:'))} ${esc([...notFound].join(', '))}</p>` : ''}
      <p>${esc(t('Next step: give the remaining subjects to qualified teachers automatically and create the timetable.'))}</p>`
  });
  if (!next) return;
  const r = PR.autoAssign(D);
  save();
  setView('timetable');
  announce(`${r.assigned} ${t('subjects got a teacher.')}`);
  await ACTIONS.generate();
};
function matchDay(s) {
  s = String(s || '').trim().toLowerCase();
  if (!s) return -1;
  const wd = WD.findIndex((w) => w.toLowerCase().startsWith(s.slice(0, 3)) || t(w) === s);
  return D.school.workingDays.indexOf(wd);
}
ACTIONS.impTT = async () => {
  const res = await io.importExcel();
  if (!res) return;
  const sheets = res.sheets.filter((s) => !/^(t - |master|info|teachers)/i.test(s.name) && s.rows.some((r) => /^day$/i.test((r[0] || '').trim())));
  if (!sheets.length) { await infoDlg(t('Import failed'), `<p>${esc(t('No class sheet found. Each class sheet needs a first column titled “Day”. See Excel format help.'))}</p>`); return; }
  const maxP = Math.max(...sheets.map((s) => { const hr = s.rows.find((r) => /^day$/i.test((r[0] || '').trim())); return hr.filter((v, i) => i > 0 && v).length; }));
  const extra = maxP > nPer() ? ` ${t('The file has')} ${maxP} ${t('periods per day; the school profile will be changed to')} ${maxP}.` : '';
  if (!(await confirmDlg(`${t('Import')} ${sheets.length} ${t('class sheets from')} ${res.file}? ${t('For these classes the subjects, teachers and timetable will be replaced.')}${extra}`, t('Import')))) return;
  if (maxP > nPer()) {
    const old = clone(D.school);
    D.school.periodsPerDay = maxP;
    while (D.school.periodTimes.length < maxP) D.school.periodTimes.push({ start: '', end: '' });
    resizeTimetable(old, D.school);
  }
  pushUndo();
  let cellsSet = 0;
  const importedIds = new Set();
  const findT = (s) => {
    s = s.trim();
    if (!s) return null;
    let x = D.teachers.find((y) => y.short.toLowerCase() === s.toLowerCase() || y.name.toLowerCase() === s.toLowerCase());
    if (!x) { x = { id: PR.uid('t'), name: s, short: uniqueShort(s.length <= 6 ? s : PR.initials(s)), phone: '', subjects: [], maxPerWeek: D.school.defaultMaxWeek || 30, maxPerDay: nPer(), senior: false, unavailable: [] }; D.teachers.push(x); }
    return x;
  };
  for (const sh of sheets) {
    let c = D.classes.find((k) => k.name.toLowerCase() === sh.name.trim().toLowerCase());
    if (!c) {
      const m = /^\+?(\d+)/.exec(sh.name.trim());
      const std = m ? (sh.name.trim().startsWith('+') ? '+' + m[1] : m[1]) : '';
      const level = std.startsWith('+') ? 'HSS' : +std <= 4 ? 'LP' : +std <= 7 ? 'UP' : 'HS';
      c = { id: PR.uid('c'), name: sh.name.trim(), level, std, stream: level === 'HSS' ? ({ S: 'science', C: 'commerce', H: 'humanities' }[(/\s([SCH])\d/i.exec(sh.name) || [])[1] && (/\s([SCH])\d/i.exec(sh.name) || [])[1].toUpperCase()] || 'science') : null, classTeacherId: null };
      D.classes.push(c);
    }
    importedIds.add(c.id);
    D.lessons = D.lessons.filter((l) => {
      const ids = lcIds(l).filter((x) => x !== c.id);
      if (!ids.length) return false;
      if (l.classIds) { l.classIds = ids; l.classId = ids[0]; if (ids.length === 1) delete l.classIds; }
      return true;
    });
    D.timetable.cells[c.id] = [];
    Object.keys(D.timetable.locked).forEach((k) => k.startsWith(c.id + '|') && delete D.timetable.locked[k]);
    const g = ensureCells(c.id);
    const hr = sh.rows.findIndex((r) => /^day$/i.test((r[0] || '').trim()));
    const counts = {};
    for (const r of sh.rows.slice(hr + 1)) {
      const d = matchDay(r[0]);
      if (d < 0) continue;
      for (let p = 0; p < nPer(); p++) {
        const v = (r[p + 1] || '').trim();
        if (!v) continue;
        const [sp, tp = ''] = v.split('/');
        const sName = sp.trim();
        const s = D.subjects.find((x) => x.name.toLowerCase() === sName.toLowerCase() || x.short.toLowerCase() === sName.toLowerCase()) || PR.ensureSubject(D, sName, PR.initials(sName));
        const tids = tp.split('+').map(findT).filter(Boolean).map((x) => x.id).sort();
        tids.forEach((id) => { const x = tch(id); if (!x.subjects.includes(s.id)) x.subjects.push(s.id); });
        let l = D.lessons.find((y) => y.classId === c.id && y.subjectId === s.id && (y.teacherIds || []).slice().sort().join() === tids.join());
        if (!l) { l = { id: PR.uid('l'), classId: c.id, subjectId: s.id, teacherIds: tids, perWeek: 0, maxPerDay: 1 }; D.lessons.push(l); }
        l.perWeek++;
        counts[l.id + '|' + d] = (counts[l.id + '|' + d] || 0) + 1;
        l.maxPerDay = Math.max(l.maxPerDay, counts[l.id + '|' + d]);
        g[d][p] = l.id;
        cellsSet++;
      }
    }
  }
  // Same subject and same teachers at exactly the same periods in several
  // classes = one combined period (for example a language group).
  const groups = {};
  for (const l of D.lessons) {
    if (!importedIds.has(l.classId) || isCombined(l) || !(l.teacherIds || []).length) continue;
    const slots = [];
    (D.timetable.cells[l.classId] || []).forEach((row, d) => row.forEach((v, p) => v === l.id && slots.push(d + '-' + p)));
    const key = l.subjectId + '|' + l.teacherIds.slice().sort().join() + '|' + slots.join();
    (groups[key] = groups[key] || []).push(l);
  }
  let merged = 0;
  for (const ls of Object.values(groups)) {
    if (ls.length < 2) continue;
    const keep = ls[0];
    keep.classIds = ls.map((l) => l.classId);
    for (const o of ls.slice(1)) {
      D.lessons = D.lessons.filter((x) => x.id !== o.id);
      (D.timetable.cells[o.classId] || []).forEach((row) => row.forEach((v, i) => v === o.id && (row[i] = keep.id)));
    }
    merged++;
  }
  save();
  render(false);
  announce(`${t('Imported')} ${sheets.length} ${t('classes')}, ${cellsSet} ${t('periods')}.${merged ? ` ${merged} ${t('combined periods found.')}` : ''}`);
};

ACTIONS.backup = async () => {
  const p = await io.exportBackup({ json: JSON.stringify(D, null, 1), fileName: `Samayam-backup-${todayStr()}.json` });
  if (p) announce(t('Backup saved.'));
};
ACTIONS.restore = async () => {
  const raw = await io.importBackup();
  if (!raw) return;
  let data;
  try { data = JSON.parse(raw); } catch { data = null; }
  if (!data || !Array.isArray(data.teachers) || !Array.isArray(data.classes)) { await infoDlg(t('Restore failed'), `<p>${esc(t('This file is not a Samayam backup.'))}</p>`); return; }
  if (!(await confirmDlg(t('Replace all current data with this backup?'), t('Restore')))) return;
  D = migrate(data);
  window.D = D;
  applySettings();
  save();
  S.sub = { date: null, absences: [], rows: null, stale: false };
  setView(D.school ? 'dashboard' : 'school');
  announce(t('Backup restored.'));
};
ACTIONS.resetAll = async () => {
  if (!(await confirmDlg(t('Delete ALL data (school, teachers, timetable, leave history)? This cannot be undone. Save a backup first if you may need it.'), t('Delete everything')))) return;
  const settings = D.settings;
  D = PR.emptyData();
  D.settings = settings;
  window.D = D;
  save();
  S.sub = { date: null, absences: [], rows: null, stale: false };
  setView('school');
  announce(t('All data deleted.'));
};

// ======================================================================
// EVENTS & START-UP
// ======================================================================
function migrate(data) {
  const base = PR.emptyData();
  for (const k of Object.keys(base)) if (data[k] === undefined) data[k] = base[k];
  data.timetable.cells = data.timetable.cells || {};
  data.timetable.locked = data.timetable.locked || {};
  data.settings = Object.assign(base.settings, data.settings || {});
  if (data.school) data.school = Object.assign(PR.defaultSchool(), data.school);
  data.teachers.forEach((x) => { x.subjects = x.subjects || []; x.unavailable = x.unavailable || []; });
  data.lessons.forEach((l) => (l.teacherIds = l.teacherIds || []));
  return data;
}

function wireEvents() {
  const main = $('#main');
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { setView(nav.dataset.nav); return; }
    const a = e.target.closest('[data-act]');
    if (a && ACTIONS[a.dataset.act]) { e.preventDefault(); ACTIONS[a.dataset.act](a, e); }
  });
  main.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-submit]');
    if (f) { e.preventDefault(); ACTIONS[f.dataset.submit](f); }
  });
  // Lists (select): on Windows every arrow key fires "change". Wait until the
  // user confirms (Enter) or leaves the list (Tab), so arrowing through the
  // options only reads them and does not save or redraw the page each time.
  let lastPointer = 0;
  main.addEventListener('pointerdown', () => (lastPointer = Date.now()));
  const commitSelect = (el) => {
    if (!el.dataset.pending) return;
    delete el.dataset.pending;
    el._applying = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el._applying = false;
  };
  main.addEventListener('focusout', (e) => { if (e.target.tagName === 'SELECT') commitSelect(e.target); });
  main.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'SELECT') { e.preventDefault(); commitSelect(e.target); } });
  main.addEventListener('change', (e) => {
    const el = e.target;
    if (el.tagName === 'SELECT' && !el._applying && document.activeElement === el && Date.now() - lastPointer > 1500) {
      el.dataset.pending = '1';
      return;
    }
    if (el.dataset.combo) {
      const item = resolveCombo(el);
      if (!item) {
        const n = comboItems(el.dataset.kind).filter((x) => x.name.toLowerCase().startsWith(el.value.trim().toLowerCase())).length;
        announce(n > 1 ? `${n} ${t('matches. Type more, or pick one from the list with the Down arrow.')}` : t('No match. Check the name, or clear the box and press Down arrow to see the list.'));
        return;
      }
      CHANGES[el.dataset.combo]({ value: item.id, dataset: {} });
      const back = document.getElementById(el.id);
      if (back) back.focus();
      announce(`${item.name} ${t('selected.')}`);
      return;
    }
    // Run after the browser has finished moving focus (e.g. Tab out of a field),
    // so the page refresh keeps focus where the user went, not where they were.
    if (el.dataset.change && CHANGES[el.dataset.change]) { setTimeout(() => CHANGES[el.dataset.change](el), 0); return; }
    if (S.view !== 'school' || !S.draft) return;
    if (el.dataset.draftLevel) {
      const k = el.dataset.draftLevel;
      S.draft.levels = el.checked ? [...new Set([...S.draft.levels, k])] : S.draft.levels.filter((x) => x !== k);
    } else if (el.dataset.draftDay) {
      const v = +el.dataset.draftDay;
      S.draft.workingDays = el.checked ? [...new Set([...S.draft.workingDays, v])].sort((a, b) => a - b) : S.draft.workingDays.filter((x) => x !== v);
      render(false); // keeps the "Weekly holidays" choice in step
    } else if (el.hasAttribute('data-draft-week')) {
      const p = WEEK_PRESETS.find((x) => x[0] === el.value);
      if (p) {
        S.draft.workingDays = p[2].slice();
        render(false);
        announce(`${t('Working days')}: ${p[2].map(dayName).join(', ')}. ${t('Press Save school profile to keep it.')}`);
      } else {
        announce(t('Tick the working days below.'));
      }
    } else if (el.hasAttribute('data-draft-periods')) {
      const n = Math.min(12, Math.max(1, +el.value || 1));
      S.draft.periodsPerDay = n;
      for (const arr of [S.draft.periodTimes].concat(Object.values(S.draft.dayTimes || {}))) while (arr.length < n) arr.push({ start: '', end: '' });
      render(false);
    } else if (el.hasAttribute('data-draft-tday')) {
      S.timeDay = el.value === 'all' ? 'all' : +el.value;
      render(false);
    } else if (el.hasAttribute('data-draft-tdiff')) {
      const wd = S.timeDay;
      S.draft.dayTimes = S.draft.dayTimes || {};
      if (el.checked) S.draft.dayTimes[wd] = clone(S.draft.periodTimes); // start from the normal timings
      else delete S.draft.dayTimes[wd];
      render(false);
      announce(el.checked ? `${dayName(wd)}: ${t('own timings. Change them below, then save.')}` : `${dayName(wd)} ${t('uses the normal timings.')}`);
    }
  });
  main.addEventListener('input', (e) => {
    const el = e.target;
    if (S.view !== 'school' || !S.draft) return;
    if (el.dataset.draft) S.draft[el.dataset.draft] = el.type === 'number' ? +el.value : el.value;
    else if (el.dataset.time) {
      const [p, k] = el.dataset.time.split('|');
      const arr = S.timeDay === 'all' ? S.draft.periodTimes : (S.draft.dayTimes || {})[S.timeDay];
      if (arr) arr[+p] = Object.assign({ start: '', end: '' }, arr[+p], { [k]: el.value });
    }
  });
  main.addEventListener('keydown', (e) => {
    const td = e.target.closest && e.target.closest('td[data-cell]');
    if (td) { gridKey(e, td); return; }
    if (e.key === 'Enter' && e.target.id === 'abs_in') { e.preventDefault(); ACTIONS.absAdd(); }
  });
  main.addEventListener('focusin', (e) => {
    if (e.target.dataset && e.target.dataset.combo) e.target.select(); // typing replaces the current name
    const td = e.target.closest && e.target.closest('td[data-cell]');
    if (td) { const [d, p] = td.dataset.cell.split('|').map(Number); S.tt.focus = { d, p }; }
  });
  main.addEventListener('dblclick', (e) => {
    const td = e.target.closest('td[data-cell]');
    if (td && S.tt.mode === 'class') { const [d, p] = td.dataset.cell.split('|').map(Number); editCell(d, p); }
  });
  let dragFrom = null;
  main.addEventListener('dragstart', (e) => {
    const td = e.target.closest('td[data-cell]');
    if (!td) return;
    const [d, p] = td.dataset.cell.split('|').map(Number);
    dragFrom = { d, p };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', td.dataset.cell);
  });
  main.addEventListener('dragover', (e) => {
    const td = e.target.closest('td[data-cell]');
    if (td && dragFrom) { e.preventDefault(); td.classList.add('dragover'); }
  });
  main.addEventListener('dragleave', (e) => { const td = e.target.closest('td[data-cell]'); if (td) td.classList.remove('dragover'); });
  main.addEventListener('drop', (e) => {
    const td = e.target.closest('td[data-cell]');
    if (!td || !dragFrom) return;
    e.preventDefault();
    const [d, p] = td.dataset.cell.split('|').map(Number);
    const from = dragFrom;
    dragFrom = null;
    if (from.d !== d || from.p !== p) swapCells(from, { d, p });
    else render(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === "F1") { e.preventDefault(); ACTIONS.openGuide(); return; }
    if (e.altKey && !e.ctrlKey && /^Digit[0-9]$/.test(e.code)) {
      const k = e.code.slice(5);
      const item = NAV.find((n) => n[3] === k);
      if (item) { e.preventDefault(); setView(item[0]); }
    } else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z' && S.view === 'timetable' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault();
      ACTIONS.undo();
    }
  });
  // keep the Now page live
  setInterval(() => {
    if (S.view === 'now' && S.now.day === 'auto' && S.now.period === 'auto') { const o = $('#nowOut'); if (o && !o.contains(document.activeElement)) o.innerHTML = nowOutput(); }
  }, 30000);
}

async function init() {
  let raw = null;
  try { raw = await io.loadData(); } catch (e) { console.error(e); }
  let data = null;
  if (raw) { try { data = JSON.parse(raw); } catch (e) { console.error('Bad data file', e); } }
  D = migrate(data || PR.emptyData());
  window.D = D;
  applySettings();
  wireEvents();
  setView(D.school ? 'dashboard' : 'school');
  io.info().then((i) => { const el = document.getElementById('aboutInfo'); if (el) el.textContent = `Version ${i.version} · ${i.dataFile}`; }).catch(() => {});
}

// Automated check used by `npm run smoke`: renders every page with demo data.
window.__smoke = async () => {
  const out = { views: {}, errors: [] };
  const orig = window.console.error;
  console.error = (...a) => { out.errors.push(a.map(String).join(' ')); orig.apply(console, a); };
  try {
    D = PR.demoData();
    window.D = D;
    const res = SamayamSolver.generateTimetable(SamayamSolver.buildInput(D), { seed: 2 });
    D.timetable.cells = res.cells;
    out.unplaced = res.unplacedCount;
    S.sub = { date: null, absences: [], rows: null, stale: false };
    loadSubDate('2026-11-24');
    S.sub.absences = [{ teacherId: D.teachers[0].id, session: 'full', periods: [], note: 'Revise chapter 2' }, { teacherId: D.teachers[3].id, session: 'pm', periods: [], note: '' }];
    S.sub.rows = SamayamSub.plan(D, S.sub.date, S.sub.absences).rows;
    out.subRows = S.sub.rows.length;
    out.subCovered = S.sub.rows.filter((r) => r.subTeacherId).length;
    out.whatsappText = subText(S.sub.date, S.sub.rows, S.sub.absences).split('\n').slice(0, 8);
    for (const v of Object.keys(VIEWS)) {
      setView(v);
      const h1 = $('#main h1');
      out.views[v] = { h1: h1 ? h1.textContent : null, focused: document.activeElement === h1, len: $('#main').innerHTML.length, err: !!$('#main .msg.err') && v !== 'timetable' };
      const unlabeled = $$('#main input, #main select, #main textarea').filter((el) => el.type !== 'hidden' && !el.closest('label') && !el.getAttribute('aria-label') && !(el.id && document.querySelector(`label[for="${el.id}"]`)));
      if (unlabeled.length) out.views[v].unlabeled = unlabeled.map((el) => el.id || el.name);
    }
    // combined period: clearing it in one class clears it in the other, placing puts it in both
    const cl = D.lessons.find(isCombined);
    const [c1, c2] = lcIds(cl);
    let pos = null;
    D.timetable.cells[c1].forEach((row, d) => row.forEach((v, p) => { if (v === cl.id && !pos) pos = [d, p]; }));
    setCell(c1, pos[0], pos[1], null);
    const clearedBoth = cellOf(c2, pos[0], pos[1]) === null;
    setCell(c2, pos[0], pos[1], cl.id);
    out.combinedEdit = clearedBoth && cellOf(c1, pos[0], pos[1]) === cl.id;
    out.combinedClash = SamayamSolver.findClashes(D).list.length;
    // subject names as people type them in a sheet
    out.subjectMatch = ['Maths', 'english', 'Social', 'Basic Science', 'Malayalam', 'Music'].map((s) => `${s}→${(matchSubject(s) || {}).name || '?'}`);
    out.classMatch = ['5A', '5 a', '8'].map((s) => `${s}→${matchClasses(s).map((c) => c.name).join('+')}`);
    // standard-wise periods: Std 8 Social Science 4, Std 9 stays as it was
    setView('allocation');
    const ssId = D.subjects.find((s) => s.short === 'SS').id;
    const gi = stdGroups().findIndex((g) => g.label.endsWith(' 8'));
    const inp = document.getElementById(`sp_${gi}_${ssId}`);
    inp.value = '4'; CHANGES.stdPw(inp);
    out.stdGrid = stdGroups().map((g) => `${g.label}:${g.classes.map((c) => (lessonsOfClass(c.id).find((l) => l.subjectId === ssId) || {}).perWeek).join('/')}`).join(' ');
    // a Saturday following Monday
    setSpecialDay('2026-11-28', 'follow', 0, 'test');
    out.saturdayFollows = dayIdx('2026-11-28');
    // Friday starts at 09:00 while other days start at 09:30
    D.school.dayTimes = { 5: D.school.periodTimes.map((x, i) => (i === 0 ? { start: '09:00', end: '09:40' } : x)) };
    out.fridayTimes = [pTime(0, 0), pTime(0, 4), nowInfo(new Date(2026, 10, 27, 9, 10)).state, nowInfo(new Date(2026, 10, 24, 9, 10)).state].join(' | ');
    setView('school');
    out.schoolFridayPicker = !!$('#sc_tday');
    $('#wk_frisun').click();
    out.friSunDays = S.draft.workingDays.map(dayName).join(',') + ' / radio kept: ' + $('#wk_frisun').checked;
    // Tab out of a changed number field: focus must land on the next field, not jump back
    setView('allocation');
    const pw = $('input[data-change="lessonPw"]');
    const md = document.getElementById(pw.id.replace('lpw_', 'lmd_'));
    pw.focus(); pw.value = String(+pw.value + 1);
    pw.dispatchEvent(new Event('change', { bubbles: true }));
    md.focus();
    await new Promise((r) => setTimeout(r, 80));
    out.tabAfterChange = (document.activeElement && document.activeElement.id) === md.id ? 'ok: next field' : 'BUG: focus on ' + (document.activeElement && document.activeElement.id);
    // Arrowing through the substitute list must not save; leaving it (Tab) saves
    setView('substitution');
    const sb = $('#sb_0');
    const before = S.sub.rows[0].subTeacherId;
    sb.focus();
    sb.selectedIndex = [...sb.options].findIndex((o) => o.value && o.value !== before);
    sb.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));
    const whileArrowing = S.sub.rows[0].subTeacherId === before;
    const nextEl = $('[data-act="subWhatsApp"]');
    nextEl.focus();
    await new Promise((r) => setTimeout(r, 80));
    out.selectCommit = `${whileArrowing ? 'ok: not saved while arrowing' : 'BUG: saved while arrowing'} / ${S.sub.rows[0].subTeacherId !== before ? 'ok: saved on Tab' : 'BUG: not saved on Tab'}`;
    // typing a class name into the timetable combo box
    setView('timetable');
    const tb = $('#tt_target');
    tb.value = '6 b';
    tb.dispatchEvent(new Event('change', { bubbles: true }));
    out.comboPicked = (cls(S.tt.target) || {}).name;
    tb.value = '8';
    tb.dispatchEvent(new Event('change', { bubbles: true }));
    out.comboAmbiguousKept = (cls(S.tt.target) || {}).name;
    S.tt.list = true; setView('timetable'); out.listView = $$('#main li').length; S.tt.list = false;
    S.now.mode = 'teacher'; setView('now'); out.nowTeacher = $('#nowOut').textContent.slice(0, 80);
    D.settings.lang = 'ml'; applySettings(); setView('dashboard'); out.mlHeading = $('#main h1').textContent;
  } catch (e) {
    out.errors.push(String(e && e.stack || e));
  }
  console.error = orig;
  return out;
};

init();

'use strict';
/* global I18N, SamayamPresets, SamayamSolver, SamayamSub */
/* Samayam UI - part 1: core helpers, navigation, dialogs, school profile,
 * teachers, classes & subjects, settings. Part 2 is in app2.js. */

const t = I18N.t;
const PR = SamayamPresets;

// When opened in a normal browser (not the desktop app) keep data in localStorage.
const io = window.api || {
  loadData: async () => localStorage.getItem('samayam-data'),
  saveData: async (j) => { localStorage.setItem('samayam-data', j); return true; },
  info: async () => ({ version: 'browser', dataFile: 'browser localStorage' }),
  openDataFolder: async () => {},
  copyText: async (s) => { await navigator.clipboard.writeText(s); return true; },
  shareWhatsApp: async (s) => { window.open('https://web.whatsapp.com/send?text=' + encodeURIComponent(s)); return 'web'; },
  openUrl: async (u) => window.open(u),
  savePdf: async () => { announce('PDF export works in the desktop app.'); return null; },
  exportExcel: async () => { announce('Excel export works in the desktop app.'); return null; },
  importExcel: async () => { announce('Excel import works in the desktop app.'); return null; },
  exportBackup: async () => { announce('Backup works in the desktop app.'); return null; },
  importBackup: async () => null
};

let D = null; // all school data
const S = {
  view: 'dashboard',
  draft: null,
  timeDay: 'all',
  alClass: null,
  tt: { mode: 'class', target: null, list: false, picked: null, focus: { d: 0, p: 0 }, generating: false, lastGen: null },
  undo: [],
  sub: { date: null, absences: [], rows: null, stale: false },
  now: { mode: 'school', target: '', day: 'auto', period: 'auto' },
  rep: { from: null, to: null }
};
const VIEWS = {};
const ACTIONS = {};
const CHANGES = {};

// ---------- small helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const clone = (o) => JSON.parse(JSON.stringify(o));
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function todayStr(dt) {
  const n = dt || new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}
function fmtDate(ds, short) {
  const dt = SamayamSub.parseDate(ds);
  const loc = I18N.getLang() === 'ml' ? 'ml-IN' : 'en-IN';
  return dt.toLocaleDateString(loc, short ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' } : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
const dayName = (wd) => t(WD[wd]);
const nDays = () => D.school.workingDays.length;
const nPer = () => D.school.periodsPerDay;
const sDay = (d) => dayName(D.school.workingDays[d]);
const dayIdx = (ds) => SamayamSub.dayIndexFor(D.school, ds, D.specialDays);
// Period timings of timetable day d. Some days (often Friday) can have their
// own timings in school.dayTimes, keyed by weekday number (1 = Monday).
function periodTimesFor(d) {
  const s = D.school;
  const wd = d == null || d < 0 ? null : s.workingDays[d];
  return (wd != null && s.dayTimes && s.dayTimes[wd]) || s.periodTimes || [];
}
const hasOwnTimes = (d) => !!(D.school.dayTimes && D.school.dayTimes[D.school.workingDays[d]]);
function pTime(p, d) {
  const pt = periodTimesFor(d)[p];
  return pt && pt.start ? `${pt.start}–${pt.end}` : '';
}
function periodLabel(p, withTime = true, d) {
  const tm = withTime ? pTime(p, d) : '';
  return `${t('Period')} ${p + 1}${tm ? ' (' + tm + ')' : ''}`;
}
const subj = (id) => D.subjects.find((x) => x.id === id);
const tch = (id) => D.teachers.find((x) => x.id === id);
const cls = (id) => D.classes.find((x) => x.id === id);
const les = (id) => D.lessons.find((x) => x.id === id);
const lcIds = (l) => SamayamSolver.lessonClassIds(l);
const isCombined = (l) => !!l && lcIds(l).length > 1;
const groupName = (cids) => (cids || []).map((c) => (cls(c) || {}).name || '?').join(' + ');
const rowClassName = (r) => groupName(r.classIds || [r.classId]);
const lessonsOfClass = (cid) => D.lessons.filter((l) => lcIds(l).includes(cid));
const subjName = (id) => (subj(id) || {}).name || '?';
const tName = (id) => (tch(id) || {}).name || '?';
const tNames = (ids) => (ids || []).filter(Boolean).map(tName).join(' + ') || t('No teacher');
const tShorts = (ids) => (ids || []).filter(Boolean).map((i) => (tch(i) || {}).short || '?').join('+') || '—';
const hueOf = (subjectId) => (subj(subjectId) || {}).hue ?? 220;
function sortByName(arr) { return arr.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); }
function classesSorted() {
  const order = { LP: 0, UP: 1, HS: 2, HSS: 3 };
  return D.classes.slice().sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9) || a.name.localeCompare(b.name, undefined, { numeric: true }));
}
function cellOf(classId, d, p) {
  const g = D.timetable.cells[classId];
  return (g && g[d] && g[d][p]) || null;
}
function teacherLoad(id) { return PR.teacherLoad(D, id); }

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => io.saveData(JSON.stringify(D)), 300);
}

let toastTimer = null;
function announce(msg) {
  const live = $('#live');
  live.textContent = '';
  setTimeout(() => (live.textContent = msg), 60);
  const toast = $('#toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

// ---------- dialogs (native <dialog>: focus is trapped, Escape closes) ----------
function modal({ title, body, ok = t('Save'), cancel = t('Cancel'), onOpen }) {
  return new Promise((resolve) => {
    const dlg = $('#dlg');
    const prev = document.activeElement;
    dlg.innerHTML = `<form method="dialog" novalidate><h2 id="dlgTitle">${esc(title)}</h2><div class="dlg-body">${body}</div>
      <div class="dlg-actions">${ok ? `<button value="ok" class="btn primary">${esc(ok)}</button>` : ''}${cancel ? `<button value="cancel" class="btn" formnovalidate>${esc(cancel)}</button>` : ''}</div></form>`;
    dlg.setAttribute('aria-labelledby', 'dlgTitle');
    dlg.returnValue = '';
    dlg.onclose = () => {
      const form = dlg.querySelector('form');
      const res = dlg.returnValue === 'ok' ? new FormData(form) : null;
      resolve(res);
      if (prev && document.contains(prev)) prev.focus();
    };
    dlg.showModal();
    const first = dlg.querySelector('.dlg-body input:checked, .dlg-body input:not([type=hidden]), .dlg-body select, .dlg-body textarea, .dlg-actions button');
    if (first) first.focus();
    if (onOpen) onOpen(dlg);
  });
}
async function confirmDlg(msg, okLabel) {
  const r = await modal({ title: t('Please confirm'), body: `<p>${esc(msg)}</p>`, ok: okLabel || t('Yes'), cancel: t('Cancel') });
  return !!r;
}
async function infoDlg(title, html) {
  await modal({ title, body: html, ok: t('Close'), cancel: '' });
}

// ---------- navigation ----------
const NAV = [
  ['dashboard', 'Today', '🏠', '1'],
  ['now', 'Now', '🕒', '2'],
  ['substitution', 'Leave & Substitution', '🔁', '3'],
  ['timetable', 'Timetable', '📅', '4'],
  ['allocation', 'Classes & Subjects', '📚', '5'],
  ['teachers', 'Teachers', '👩‍🏫', '6'],
  ['school', 'School Profile', '🏫', '7'],
  ['reports', 'Reports', '📊', '8'],
  ['data', 'Import / Export', '💾', '9'],
  ['settings', 'Settings', '⚙️', '0']
];

function renderNav() {
  const ready = !!D.school;
  $('#nav').innerHTML = `<ul>${NAV.filter(([v]) => ready || ['school', 'settings', 'data'].includes(v)).map(([v, label, ico, key]) =>
    `<li><button type="button" data-nav="${v}" ${S.view === v ? 'aria-current="page"' : ''} aria-keyshortcuts="Alt+${key}">
      <span><span class="ico" aria-hidden="true">${ico}</span>${esc(t(label))}</span><span class="key" aria-hidden="true">Alt+${key}</span></button></li>`).join('')}</ul>`;
  $('#brandSchool').textContent = D.school ? D.school.name : '';
  $('#skipLink').textContent = t('Skip to main content');
  $('#nav').setAttribute('aria-label', t('Main menu'));
}

function setView(v, opts = {}) {
  if (!D.school && !['school', 'settings', 'data'].includes(v)) v = 'school';
  S.view = v;
  if (v === 'school') S.draft = clone(D.school || PR.defaultSchool());
  if (v === 'substitution' && !S.sub.date) loadSubDate(todayStr());
  if (v === 'timetable' && opts.mode) { S.tt.mode = opts.mode; S.tt.target = opts.target; }
  render(true);
}

const FOCUSABLE = 'input, select, textarea, button, summary, [tabindex="0"]';
function render(focusHeading) {
  const active = document.activeElement;
  const prevId = active && active.id;
  const main = $('#main');
  // an element without an id is found again by its position on the page
  const prevIdx = !prevId && active && main.contains(active) ? $$(FOCUSABLE, main).indexOf(active) : -1;
  renderNav();
  let html;
  try {
    html = VIEWS[S.view]();
  } catch (err) {
    console.error(err);
    html = `<h1 tabindex="-1">Error</h1><p class="msg err">${esc(err.message)}</p>`;
  }
  main.innerHTML = html;
  const h1 = $('#main h1');
  if (h1) h1.setAttribute('tabindex', '-1');
  document.title = (h1 ? h1.textContent + ' – ' : '') + 'Samayam';
  if (focusHeading) {
    if (h1) h1.focus();
  } else if (prevId) {
    const el = document.getElementById(prevId);
    if (el) el.focus();
  } else if (prevIdx >= 0) {
    const el = $$(FOCUSABLE, main)[prevIdx];
    if (el) el.focus();
  }
}

function applySettings() {
  const st = D.settings || {};
  I18N.setLang(st.lang || 'en');
  document.documentElement.lang = st.lang === 'ml' ? 'ml' : 'en';
  if (st.theme && st.theme !== 'system') document.documentElement.setAttribute('data-theme', st.theme);
  else document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.fontSize = (st.fontScale || 100) + '%';
}

// Editable combo box: type a class / teacher name or pick it from the list.
// kind: 'class' or 'teacher'. On change, CHANGES[change] gets { value: id }.
function comboItems(kind) {
  return kind === 'teacher'
    ? sortByName(D.teachers).map((x) => ({ id: x.id, name: x.name, hint: x.short }))
    : classesSorted().map((c) => ({ id: c.id, name: c.name, hint: c.level + (c.stream ? ' ' + c.stream : '') }));
}
function combo({ id, label, kind, selectedId, change }) {
  const items = comboItems(kind);
  const sel = items.find((x) => x.id === selectedId);
  return `<label>${esc(label)}<input id="${id}" list="${id}_list" data-combo="${change}" data-kind="${kind}" value="${esc(sel ? sel.name : '')}" autocomplete="off" spellcheck="false" aria-describedby="comboHelp" style="min-width:170px"></label>
    <datalist id="${id}_list">${items.map((x) => `<option value="${esc(x.name)}">${esc(x.hint || '')}</option>`).join('')}</datalist>`;
}
function resolveCombo(el) {
  const q = el.value.trim().toLowerCase().replace(/\s+/g, '');
  if (!q) return null;
  const items = comboItems(el.dataset.kind);
  const key = (s) => s.toLowerCase().replace(/\s+/g, '');
  const exact = items.filter((x) => key(x.name) === q || key(x.hint || '') === q);
  if (exact.length === 1) return exact[0];
  const starts = items.filter((x) => key(x.name).startsWith(q));
  return starts.length === 1 ? starts[0] : null;
}

function teacherOptions(selected, subjectId, includeNone = true, noneLabel) {
  const all = sortByName(D.teachers);
  const q = subjectId ? all.filter((x) => (x.subjects || []).includes(subjectId)) : [];
  const o = all.filter((x) => !q.includes(x));
  const opt = (x) => `<option value="${x.id}" ${x.id === selected ? 'selected' : ''}>${esc(x.name)} (${esc(x.short)}) – ${teacherLoad(x.id)}/${x.maxPerWeek || '–'}</option>`;
  let h = includeNone ? `<option value="">${esc(noneLabel || '— ' + t('No teacher') + ' —')}</option>` : '';
  if (q.length) h += `<optgroup label="${esc(t('Teaches this subject'))}">${q.map(opt).join('')}</optgroup><optgroup label="${esc(t('Other teachers'))}">${o.map(opt).join('')}</optgroup>`;
  else h += all.map(opt).join('');
  return h;
}

// ======================================================================
// SCHOOL PROFILE
// ======================================================================
VIEWS.school = () => {
  const s = S.draft;
  const first = !D.school;
  const P = +s.periodsPerDay || 1;
  const lv = Object.entries(PR.LEVELS).map(([k, v]) =>
    `<label class="check"><input type="checkbox" data-draft-level="${k}" ${s.levels.includes(k) ? 'checked' : ''}> ${esc(t(v.label))}</label>`).join('');
  const days = [1, 2, 3, 4, 5, 6].map((wd) =>
    `<label class="check"><input type="checkbox" data-draft-day="${wd}" ${s.workingDays.includes(wd) ? 'checked' : ''}> ${esc(dayName(wd))}</label>`).join('');
  const num = (id, key, label, min, max) => `<label>${esc(t(label))}<input type="number" id="${id}" data-draft="${key}" min="${min}" max="${max}" value="${esc(s[key])}"></label>`;
  if (S.timeDay !== 'all' && !s.workingDays.includes(+S.timeDay)) S.timeDay = 'all';
  const tdWd = S.timeDay === 'all' ? null : +S.timeDay;
  const ownArr = tdWd != null ? (s.dayTimes || {})[tdWd] : null;
  const arr = tdWd == null ? s.periodTimes : ownArr;
  const dayPick = `<div class="row">
      <label>${esc(t('Timings for'))}<select id="sc_tday" data-draft-tday>
        <option value="all" ${tdWd == null ? 'selected' : ''}>${esc(t('Normal days'))}</option>
        ${s.workingDays.map((wd) => `<option value="${wd}" ${tdWd === wd ? 'selected' : ''}>${esc(dayName(wd))}${(s.dayTimes || {})[wd] ? ' – ' + esc(t('own timings')) : ''}</option>`).join('')}
      </select></label>
      ${tdWd != null ? `<label class="check"><input type="checkbox" id="sc_tdiff" data-draft-tdiff ${ownArr ? 'checked' : ''}> ${esc(dayName(tdWd))} ${esc(t('has different timings'))}</label>` : ''}
    </div>`;
  let times = '';
  for (let p = 0; p < P && arr; p++) {
    const pt = arr[p] || { start: '', end: '' };
    times += `<tr><th scope="row">${t('Period')} ${p + 1}</th>
      <td><input type="time" id="pt_${p}_s" data-time="${p}|start" value="${esc(pt.start)}" aria-label="${t('Period')} ${p + 1} ${t('Starts')}"></td>
      <td><input type="time" id="pt_${p}_e" data-time="${p}|end" value="${esc(pt.end)}" aria-label="${t('Period')} ${p + 1} ${t('Ends')}"></td></tr>`;
  }
  return `<h1>${esc(first ? t('Welcome! Set up your school') : t('School Profile'))}</h1>
  ${first ? `<p class="lead">${esc(t('Start by entering your school details. After saving you can add classes, teachers and subjects. Or try the app first with a ready-made demo school.'))}</p>
    <p><button type="button" class="btn" data-act="loadDemo">🎓 ${esc(t('Try with demo school'))}</button></p>` : ''}
  <nav class="card" aria-label="${esc(t('On this page'))}"><strong>${esc(t('On this page'))}:</strong>
    <ol class="row" style="margin:6px 0 0;padding-left:20px;gap:6px 26px">
      <li><button type="button" class="btn small" data-act="jump" data-target="basicH">${esc(t('Basic details'))}</button></li>
      <li><button type="button" class="btn small" data-act="jump" data-target="timesH">${esc(t('Periods and timings'))}</button></li>
      ${first ? '' : `<li><button type="button" class="btn small" data-act="jump" data-target="clsH">${esc(t('Classes and divisions'))}</button></li>
      <li><button type="button" class="btn small" data-act="jump" data-target="spH">${esc(t('Special days'))}</button></li>`}
    </ol></nav>
  <form id="schoolForm" class="card" data-submit="saveSchool">
    <h2 id="basicH" tabindex="-1">1. ${esc(t('Basic details'))}</h2>
    <div class="grid2">
      <label>${esc(t('School name'))}<input id="sc_name" data-draft="name" required value="${esc(s.name)}" autocomplete="organization"></label>
      <label>${esc(t('Place'))}<input id="sc_place" data-draft="place" value="${esc(s.place)}"></label>
    </div>
    <fieldset><legend>${esc(t('Sections in this school'))}</legend>${lv}</fieldset>
    <fieldset><legend>${esc(t('Weekly holidays'))}</legend>
      ${WEEK_PRESETS.map(([k, label, wds]) => `<label class="check"><input type="radio" name="wkpreset" id="wk_${k}" value="${k}" data-draft-week ${weekPresetOf(s.workingDays) === k ? 'checked' : ''}> ${esc(t(label))}</label>`).join('')}
      <label class="check"><input type="radio" name="wkpreset" id="wk_custom" value="custom" data-draft-week ${weekPresetOf(s.workingDays) === 'custom' ? 'checked' : ''}> ${esc(t('Other (tick the working days below)'))}</label>
    </fieldset>
    <fieldset><legend>${esc(t('Working days'))}</legend>${days}</fieldset>
    <div class="grid3">
      <label>${esc(t('Periods per day'))}<input type="number" id="sc_ppd" data-draft-periods min="1" max="12" value="${P}"></label>
      ${num('sc_lunch', 'lunchAfter', 'Lunch break after period', 1, 12)}
      ${num('sc_maxsub', 'maxSubsPerDay', 'Max substitutions per teacher per day', 0, 12)}
      ${num('sc_minfree', 'minFreePerDay', 'Minimum free periods per teacher per day', 0, 6)}
      ${num('sc_fair', 'fairnessDays', 'Fairness window (days)', 1, 365)}
      ${num('sc_defmax', 'defaultMaxWeek', 'Default max periods per week (teacher)', 1, 60)}
      ${num('sc_senmax', 'seniorMaxWeek', 'Max periods per week (senior / HM)', 0, 60)}
    </div>
    <details class="msg"><summary>${esc(t('What are the workload rules?'))}</summary>
      <ul>
        <li>${esc(t('UP and HS: one full-time teacher post is sanctioned for every 25 periods of work per week (KER Chapter XXIII; UP and HS counted separately). So 25 periods a week is the usual full load.'))}</li>
        <li>${esc(t('Higher Secondary: a teacher with 15 or more periods a week in a subject is HSST; fewer than 15 is HSST (Junior). Court cases mention 25 periods as the HSST maximum.'))}</li>
        <li>${esc(t('There is no single daily maximum in the rules; set “Max periods/day” for each teacher as your school decides.'))}</li>
        <li>${esc(t('These come from the Kerala Education Rules and High Court judgments. Orders change, so confirm with your HM or the latest government order.'))}</li>
      </ul></details>
    <h2 id="timesH" tabindex="-1">2. ${esc(t('Periods and timings'))}</h2>
    <p class="muted">${esc(t('“Periods per day” is above. Enter when each period starts and ends; the Now page and substitution messages use these times. If a day such as Friday starts earlier or has a longer lunch break, choose that day below and tick “has different timings”.'))}</p>
    ${dayPick}
    ${arr ? `<details><summary>${esc(t('Fill timings automatically'))}${tdWd != null ? ' – ' + esc(dayName(tdWd)) : ''}</summary>
      <div class="grid3">
        <label>${esc(t('First period starts at'))}<input type="time" id="ft_start" value="09:30"></label>
        <label>${esc(t('Period length (minutes)'))}<input type="number" id="ft_len" value="45" min="10" max="120"></label>
        <label>${esc(t('Short break after period'))}<input type="number" id="ft_sbafter" value="2" min="0" max="12"></label>
        <label>${esc(t('Short break (minutes)'))}<input type="number" id="ft_sb" value="15" min="0" max="60"></label>
        <label>${esc(t('Lunch break (minutes)'))}<input type="number" id="ft_lunch" value="60" min="0" max="120"></label>
      </div>
      <p><button type="button" class="btn" data-act="fillTimes">${esc(t('Fill timings automatically'))}</button></p>
    </details>
    <div class="tablewrap"><table class="data" style="max-width:520px"><caption class="sr-only">${esc(t('Period timings'))}</caption>
      <thead><tr><th scope="col">${esc(t('Period'))}</th><th scope="col">${esc(t('Starts'))}</th><th scope="col">${esc(t('Ends'))}</th></tr></thead><tbody>${times}</tbody></table></div>`
    : `<p class="msg">${esc(dayName(tdWd))} ${esc(t('uses the normal timings.'))}</p>`}
    <p><button type="submit" class="btn primary">${esc(t('Save school profile'))}</button></p>
  </form>
  ${first ? '' : classesSection() + specialDaysSection()}`;
};

function divInputId(std, stream) { return 'div_' + String(std).replace('+', 'p') + (stream ? '_' + stream : ''); }

function classesSection() {
  let gen = '';
  for (const lv of D.school.levels) {
    const L = PR.LEVELS[lv];
    gen += `<fieldset><legend>${esc(t(L.label))}</legend><div class="row">`;
    for (const std of L.standards) {
      if (lv === 'HSS') {
        for (const [st, sv] of Object.entries(PR.STREAMS)) {
          const n = D.classes.filter((c) => c.std === std && c.stream === st).length;
          gen += `<label>${esc(std)} ${esc(t(sv.label))} – ${esc(t('batches'))}<input type="number" min="0" max="20" style="width:110px" id="${divInputId(std, st)}" value="${n}"></label>`;
        }
      } else {
        const n = D.classes.filter((c) => c.std === std && c.level === lv).length;
        gen += `<label>${esc(t('Standard'))} ${esc(std)} – ${esc(t('divisions'))}<input type="number" min="0" max="26" style="width:110px" id="${divInputId(std)}" value="${n}"></label>`;
      }
    }
    gen += '</div></fieldset>';
  }
  const rows = classesSorted().map((c) => `<tr>
      <td><input id="cn_${c.id}" data-change="className" data-id="${c.id}" value="${esc(c.name)}" aria-label="${esc(t('Class name'))}" style="width:120px"></td>
      <td>${esc(c.level)}${c.stream ? ' – ' + esc(t(PR.STREAMS[c.stream].label)) : ''}</td>
      <td><select id="ct_${c.id}" data-change="classTeacher" data-id="${c.id}" aria-label="${esc(t('Class teacher'))} ${esc(c.name)}">${teacherOptions(c.classTeacherId, null, true, '— ' + t('Not set') + ' —')}</select></td>
      <td><button type="button" class="btn small danger" data-act="delClass" data-id="${c.id}" aria-label="${esc(t('Delete'))} ${esc(c.name)}">${esc(t('Delete'))}</button></td></tr>`).join('');
  return `<section class="card" aria-labelledby="clsH">
    <h2 id="clsH">${esc(t('Classes and divisions'))}</h2>
    <p class="muted">${esc(t('Enter how many divisions (or HSS batches) each standard has and press Create classes. Standard subjects are added automatically; you can change them in Classes & Subjects.'))}</p>
    ${gen}
    <p><button type="button" class="btn primary" data-act="genClasses">${esc(t('Create classes'))}</button></p>
    <h3>${esc(t('Add one class'))}</h3>
    <div class="row">
      <label>${esc(t('Class name'))}<input id="nc_name" placeholder="e.g. 8 D"></label>
      <label>${esc(t('Section'))}<select id="nc_level">${Object.keys(PR.LEVELS).map((k) => `<option value="${k}">${esc(k)}</option>`).join('')}</select></label>
      <label>${esc(t('Stream (HSS only)'))}<select id="nc_stream"><option value="">—</option>${Object.entries(PR.STREAMS).map(([k, v]) => `<option value="${k}">${esc(t(v.label))}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" id="nc_plan" checked> ${esc(t('Add standard subjects'))}</label>
      <button type="button" class="btn" data-act="addClass">${esc(t('Add'))}</button>
    </div>
    ${D.classes.length ? `<div class="tablewrap" style="margin-top:14px"><table class="data"><caption>${D.classes.length} ${esc(t('classes'))}</caption>
      <thead><tr><th scope="col">${esc(t('Class'))}</th><th scope="col">${esc(t('Section'))}</th><th scope="col">${esc(t('Class teacher'))}</th><th scope="col"><span class="sr-only">${esc(t('Actions'))}</span></th></tr></thead>
      <tbody>${rows}</tbody></table></div>` : ''}
  </section>`;
}

// ---------- weekly holidays ----------
// Most Kerala schools close on Saturday and Sunday; some close on Friday and
// Sunday and work on Saturday.
const WEEK_PRESETS = [
  ['satsun', 'Saturday and Sunday (most schools)', [1, 2, 3, 4, 5]],
  ['frisun', 'Friday and Sunday', [1, 2, 3, 4, 6]],
  ['sun', 'Sunday only (Saturday is a working day)', [1, 2, 3, 4, 5, 6]]
];
function weekPresetOf(wds) {
  const k = [...wds].sort((a, b) => a - b).join();
  const hit = WEEK_PRESETS.find((p) => p[2].join() === k);
  return hit ? hit[0] : 'custom';
}

// ---------- special days: holidays and extra working days ----------
function specialLabel(sp) {
  return sp.type === 'holiday' ? t('Holiday – no classes') : `${t('Classes, following the timetable of')} ${sDay(+sp.follow)}`;
}
function specialDaysSection() {
  const list = Object.entries(D.specialDays || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const rows = list.map(([ds, sp]) => `<tr><th scope="row">${esc(fmtDate(ds))}</th><td>${esc(specialLabel(sp))}</td><td>${esc(sp.note || '')}</td>
    <td><button type="button" class="btn small danger" data-act="delSpecial" data-date="${ds}" aria-label="${esc(t('Remove'))} ${esc(fmtDate(ds))}">${esc(t('Remove'))}</button></td></tr>`).join('');
  return `<section class="card" aria-labelledby="spH">
    <h2 id="spH">📆 ${esc(t('Special days'))}</h2>
    <p class="muted">${esc(t('For example: a Saturday with classes following Monday’s timetable (after rain holidays), or a working day declared a holiday. Substitutions, the Now page and the dashboard use this automatically.'))}</p>
    <div class="row">
      <label>${esc(t('Date'))}<input type="date" id="sd_date"></label>
      <label>${esc(t('What happens'))}<select id="sd_type"><option value="follow">${esc(t('Classes, following the timetable of'))}…</option><option value="holiday">${esc(t('Holiday – no classes'))}</option></select></label>
      <label>${esc(t('Timetable of'))}<select id="sd_follow">${[...Array(nDays()).keys()].map((d) => `<option value="${d}">${esc(sDay(d))}</option>`).join('')}</select></label>
      <label>${esc(t('Note'))}<input id="sd_note" placeholder="${esc(t('e.g. Collector’s order'))}"></label>
      <button type="button" class="btn" data-act="addSpecial">${esc(t('Add'))}</button>
    </div>
    ${rows ? `<div class="tablewrap" style="margin-top:12px"><table class="data"><thead><tr><th scope="col">${esc(t('Date'))}</th><th scope="col">${esc(t('What happens'))}</th><th scope="col">${esc(t('Note'))}</th><th scope="col"><span class="sr-only">${esc(t('Actions'))}</span></th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
  </section>`;
}
function setSpecialDay(ds, type, follow, note) {
  D.specialDays = D.specialDays || {};
  D.specialDays[ds] = { type, follow: +follow || 0, note: note || '' };
  save();
}
ACTIONS.addSpecial = () => {
  const ds = $('#sd_date').value;
  if (!ds) { announce(t('Choose a date first.')); $('#sd_date').focus(); return; }
  setSpecialDay(ds, $('#sd_type').value, $('#sd_follow').value, $('#sd_note').value.trim());
  render(false);
  announce(`${fmtDate(ds)}: ${specialLabel(D.specialDays[ds])}.`);
};
ACTIONS.delSpecial = (el) => {
  delete D.specialDays[el.dataset.date];
  save();
  render(false);
  announce(t('Removed.'));
  const h = $('#spH'); if (h) { h.tabIndex = -1; h.focus(); }
};

function resizeTimetable(oldS, newS) {
  const D0 = oldS.workingDays.length, P0 = oldS.periodsPerDay, D1 = newS.workingDays.length, P1 = newS.periodsPerDay;
  if (D0 === D1 && P0 === P1) return;
  for (const c of Object.keys(D.timetable.cells)) {
    const g = D.timetable.cells[c];
    const ng = [];
    for (let d = 0; d < D1; d++) { const row = []; for (let p = 0; p < P1; p++) row.push((g[d] && g[d][p]) || null); ng.push(row); }
    D.timetable.cells[c] = ng;
  }
  for (const k of Object.keys(D.timetable.locked)) {
    const [, d, p] = k.split('|');
    if (+d >= D1 || +p >= P1) delete D.timetable.locked[k];
  }
}

ACTIONS.saveSchool = () => {
  const s = S.draft;
  s.name = s.name.trim();
  if (!s.name) { announce(t('Please enter the school name.')); $('#sc_name').focus(); return; }
  if (!s.levels.length) { announce(t('Choose at least one section (LP, UP, HS or HSS).')); return; }
  if (!s.workingDays.length) { announce(t('Choose at least one working day.')); return; }
  s.workingDays.sort((a, b) => a - b);
  ['lunchAfter', 'maxSubsPerDay', 'fairnessDays', 'defaultMaxWeek', 'seniorMaxWeek'].forEach((k) => (s[k] = +s[k] || 0));
  s.periodTimes = s.periodTimes.slice(0, s.periodsPerDay);
  s.dayTimes = s.dayTimes || {};
  for (const wd of Object.keys(s.dayTimes)) {
    if (!s.workingDays.includes(+wd)) delete s.dayTimes[wd];
    else s.dayTimes[wd] = s.dayTimes[wd].slice(0, s.periodsPerDay);
  }
  const first = !D.school;
  if (!first) resizeTimetable(D.school, s);
  D.school = clone(s);
  save();
  announce(t('Saved.') + (first ? ' ' + t('Now add your classes below.') : ''));
  S.draft = clone(D.school);
  render(false);
  if (first) { const h = $('#clsH'); if (h) { h.tabIndex = -1; h.focus(); } }
};

ACTIONS.jump = (el) => {
  const h = document.getElementById(el.dataset.target);
  if (h) { h.tabIndex = -1; h.scrollIntoView({ block: 'start' }); h.focus(); }
};

ACTIONS.fillTimes = () => {
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const toStr = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  let cur = toMin($('#ft_start').value || '09:30');
  const len = +$('#ft_len').value || 45, sbA = +$('#ft_sbafter').value, sb = +$('#ft_sb').value || 0, lunch = +$('#ft_lunch').value || 0;
  const s = S.draft;
  const arr = [];
  for (let p = 0; p < s.periodsPerDay; p++) {
    arr.push({ start: toStr(cur), end: toStr(cur + len) });
    cur += len;
    if (p + 1 === sbA) cur += sb;
    if (p + 1 === +s.lunchAfter) cur += lunch;
  }
  if (S.timeDay === 'all') s.periodTimes = arr;
  else { s.dayTimes = s.dayTimes || {}; s.dayTimes[S.timeDay] = arr; }
  render(false);
  announce(t('Timings filled. Check them and press Save school profile.'));
};

ACTIONS.genClasses = () => {
  let created = 0;
  for (const lv of D.school.levels) {
    for (const std of PR.LEVELS[lv].standards) {
      const streams = lv === 'HSS' ? Object.keys(PR.STREAMS) : [null];
      for (const st of streams) {
        const inp = document.getElementById(divInputId(std, st));
        if (!inp) continue;
        const want = Math.max(0, +inp.value || 0);
        const have = D.classes.filter((c) => c.std === std && (lv === 'HSS' ? c.stream === st : c.level === lv)).length;
        for (let i = have; i < want; i++) {
          let name = PR.className(std, i, lv, st);
          while (D.classes.some((c) => c.name === name)) name += "'";
          const c = { id: PR.uid('c'), name, level: lv, std, stream: st, classTeacherId: null };
          D.classes.push(c);
          PR.applyPlanToClass(D, c);
          created++;
        }
      }
    }
  }
  save();
  render(false);
  announce(created ? `${created} ${t('classes created with standard subjects.')}` : t('No new classes. To remove a class use its Delete button.'));
};

ACTIONS.addClass = () => {
  const name = $('#nc_name').value.trim();
  if (!name) { announce(t('Enter a class name.')); $('#nc_name').focus(); return; }
  if (D.classes.some((c) => c.name.toLowerCase() === name.toLowerCase())) { announce(t('A class with this name already exists.')); return; }
  const level = $('#nc_level').value;
  const stream = level === 'HSS' ? ($('#nc_stream').value || 'science') : null;
  const c = { id: PR.uid('c'), name, level, std: '', stream, classTeacherId: null };
  D.classes.push(c);
  if ($('#nc_plan').checked) PR.applyPlanToClass(D, c);
  save();
  render(false);
  announce(`${name} ${t('added.')}`);
  $('#nc_name').focus();
};

ACTIONS.delClass = async (el) => {
  const c = cls(el.dataset.id);
  if (!c || !(await confirmDlg(`${t('Delete class')} ${c.name}? ${t('Its subjects and timetable will be removed.')}`, t('Delete')))) return;
  D.classes = D.classes.filter((x) => x.id !== c.id);
  D.lessons = D.lessons.filter((l) => {
    const ids = lcIds(l).filter((x) => x !== c.id);
    if (!ids.length) return false;
    if (l.classIds) { l.classIds = ids; l.classId = ids[0]; if (ids.length === 1) delete l.classIds; }
    return true;
  });
  delete D.timetable.cells[c.id];
  Object.keys(D.timetable.locked).forEach((k) => k.startsWith(c.id + '|') && delete D.timetable.locked[k]);
  save();
  render(false);
  announce(`${c.name} ${t('deleted.')}`);
};

CHANGES.className = (el) => {
  const c = cls(el.dataset.id);
  const v = el.value.trim();
  if (c && v) { c.name = v; save(); announce(t('Saved.')); }
};
CHANGES.classTeacher = (el) => {
  const c = cls(el.dataset.id);
  if (c) { c.classTeacherId = el.value || null; save(); announce(t('Saved.')); }
};

ACTIONS.loadDemo = async () => {
  if ((D.school || D.teachers.length) && !(await confirmDlg(t('Load the demo school? This replaces all current data. Make a backup first if needed.'), t('Load demo')))) return;
  const settings = D.settings;
  D = PR.demoData();
  D.settings = settings;
  save();
  S.sub = { date: null, absences: [], rows: null, stale: false };
  S.tt.target = null;
  S.alClass = null;
  setView('timetable');
  announce(t('Demo school loaded with 12 classes. Press Generate timetable to create a timetable.'));
};

// ======================================================================
// TEACHERS
// ======================================================================
function subjectChecks(name, selected, idPrefix) {
  return sortByName(D.subjects).map((s) => `<label class="check"><input type="checkbox" name="${name}" value="${s.id}" id="${idPrefix}_${s.id}" ${selected.includes(s.id) ? 'checked' : ''}> ${esc(s.name)}</label>`).join('') || `<p class="muted">${esc(t('No subjects yet. Create classes first, or add subjects in Classes & Subjects.'))}</p>`;
}

VIEWS.teachers = () => {
  const s = D.school;
  const rows = sortByName(D.teachers).map((x) => {
    const load = teacherLoad(x.id);
    const max = +x.maxPerWeek || 0;
    const over = max && load > max;
    const ctOf = D.classes.filter((c) => c.classTeacherId === x.id).map((c) => c.name).join(', ');
    return `<tr>
      <th scope="row">${esc(x.name)}${x.senior ? ` <span class="badge">${esc(t('Senior'))}</span>` : ''}</th>
      <td>${esc(x.short)}</td>
      <td>${(x.subjects || []).map((id) => `<span class="chip" style="--h:${hueOf(id)}">${esc((subj(id) || {}).short || '?')}</span>`).join(' ') || '—'}
        <span class="sr-only">${esc((x.subjects || []).map(subjName).join(', '))}</span></td>
      <td>${load} / ${max || '–'} ${over ? `<span class="badge err">${esc(t('Over limit'))}</span>` : ''}</td>
      <td>${esc(ctOf || '—')}</td>
      <td class="row" style="gap:6px">
        <button type="button" class="btn small" data-act="editTeacher" data-id="${x.id}" id="et_${x.id}" aria-label="${esc(t('Edit'))} ${esc(x.name)}">${esc(t('Edit'))}</button>
        <button type="button" class="btn small" data-act="teacherTT" data-id="${x.id}" aria-label="${esc(t('Timetable'))} ${esc(x.name)}">${esc(t('Timetable'))}</button>
        <button type="button" class="btn small danger" data-act="delTeacher" data-id="${x.id}" aria-label="${esc(t('Delete'))} ${esc(x.name)}">${esc(t('Delete'))}</button>
      </td></tr>`;
  }).join('');
  return `<h1>${esc(t('Teachers'))}</h1>
  <p class="lead">${D.teachers.length} ${esc(t('teachers'))}. ${esc(t('Add each teacher with the subjects they can teach, or import the whole list from an Excel / Google Sheets file.'))}</p>
  <div class="card">
    <h2>${esc(t('Import teachers from Excel or Google Sheets'))}</h2>
    <p class="muted">${esc(t('Download the template, share it with the HM (or open it in Google Sheets), fill one row per teacher, download it as .xlsx and import it here. Columns: Name, Short name, Senior/Junior, Subjects, Classes, Max periods per week, Available days, Phone. Only Name and Subjects are needed.'))}</p>
    <div class="toolbar">
      <button type="button" class="btn" data-act="tplTeachers">${esc(t('Download teachers template'))}</button>
      <button type="button" class="btn primary" data-act="impTeachers">${esc(t('Import teachers from Excel'))}</button>
    </div>
  </div>
  <form class="card" data-submit="addTeacher" aria-labelledby="atH">
    <h2 id="atH">${esc(t('Add teacher'))}</h2>
    <div class="grid3">
      <label>${esc(t('Name'))}<input id="nt_name" required autocomplete="off"></label>
      <label>${esc(t('Short name'))}<input id="nt_short" maxlength="6" placeholder="${esc(t('auto'))}"></label>
      <label>${esc(t('Phone'))}<input id="nt_phone" type="tel" autocomplete="off"></label>
      <label>${esc(t('Max periods/week'))}<input id="nt_max" type="number" min="0" max="60" value="${s.defaultMaxWeek || 30}"></label>
      <label>${esc(t('Max periods/day'))}<input id="nt_maxday" type="number" min="1" max="12" value="${nPer()}"></label>
      <label class="check" style="align-self:end"><input id="nt_senior" type="checkbox"> ${esc(t('Senior teacher / HM'))}</label>
    </div>
    <fieldset><legend>${esc(t('Subjects'))}</legend>${subjectChecks('nt_subj', [], 'nts')}</fieldset>
    <button type="submit" class="btn primary">${esc(t('Add teacher'))}</button>
  </form>
  ${D.teachers.length ? `<div class="tablewrap"><table class="data"><caption>${esc(t('Teachers'))}</caption>
    <thead><tr><th scope="col">${esc(t('Name'))}</th><th scope="col">${esc(t('Short name'))}</th><th scope="col">${esc(t('Subjects'))}</th><th scope="col">${esc(t('Workload'))} (${esc(t('periods/week'))})</th><th scope="col">${esc(t('Class teacher'))}</th><th scope="col">${esc(t('Actions'))}</th></tr></thead>
    <tbody>${rows}</tbody></table></div>` : ''}`;
};

function uniqueShort(short, exceptId) {
  let s = (short || 'T').toUpperCase().slice(0, 6), base = s, i = 2;
  while (D.teachers.some((x) => x.id !== exceptId && x.short === s)) s = base.slice(0, 5) + i++;
  return s;
}

ACTIONS.addTeacher = () => {
  const name = $('#nt_name').value.trim();
  if (!name) { announce(t('Enter the teacher’s name.')); $('#nt_name').focus(); return; }
  const senior = $('#nt_senior').checked;
  const x = {
    id: PR.uid('t'),
    name,
    short: uniqueShort($('#nt_short').value.trim() || PR.initials(name)),
    phone: $('#nt_phone').value.trim(),
    subjects: $$('input[name="nt_subj"]:checked').map((i) => i.value),
    maxPerWeek: senior && D.school.seniorMaxWeek ? D.school.seniorMaxWeek : +$('#nt_max').value || D.school.defaultMaxWeek || 30,
    maxPerDay: +$('#nt_maxday').value || nPer(),
    senior,
    unavailable: []
  };
  D.teachers.push(x);
  save();
  render(false);
  announce(`${name} ${t('added.')}`);
  $('#nt_name').focus();
};

ACTIONS.editTeacher = async (el) => {
  const x = tch(el.dataset.id);
  if (!x) return;
  const P = nPer(), Dn = nDays();
  let grid = `<table class="data unavail"><caption>${esc(t('Not available at these times'))}</caption><thead><tr><th scope="col">${esc(t('Day'))}</th>`;
  for (let p = 0; p < P; p++) grid += `<th scope="col">P${p + 1}</th>`;
  grid += '</tr></thead><tbody>';
  for (let d = 0; d < Dn; d++) {
    grid += `<tr><th scope="row">${esc(sDay(d))}</th>`;
    for (let p = 0; p < P; p++) grid += `<td><input type="checkbox" name="un" value="${d}-${p}" ${(x.unavailable || []).includes(d + '-' + p) ? 'checked' : ''} aria-label="${esc(sDay(d))} ${esc(t('Period'))} ${p + 1} ${esc(t('not available'))}"></td>`;
    grid += '</tr>';
  }
  grid += '</tbody></table>';
  const body = `<div class="grid2">
      <label>${esc(t('Name'))}<input name="name" required value="${esc(x.name)}"></label>
      <label>${esc(t('Short name'))}<input name="short" maxlength="6" value="${esc(x.short)}"></label>
      <label>${esc(t('Phone'))}<input name="phone" value="${esc(x.phone)}"></label>
      <label>${esc(t('Max periods/week'))}<input name="max" type="number" min="0" max="60" value="${esc(x.maxPerWeek)}"></label>
      <label>${esc(t('Max periods/day'))}<input name="maxday" type="number" min="1" max="12" value="${esc(x.maxPerDay || P)}"></label>
      <label>${esc(t('Minimum free periods per day'))}<input name="minfree" type="number" min="0" max="6" value="${esc(x.minFree ?? '')}" placeholder="${esc(t('school default'))} (${D.school.minFreePerDay || 0})"></label>
      <label class="check"><input type="checkbox" name="senior" ${x.senior ? 'checked' : ''}> ${esc(t('Senior teacher / HM'))}</label>
    </div>
    <fieldset><legend>${esc(t('Comes to this school on (for part-time or shared specialist teachers, e.g. Music, Drawing)'))}</legend>
      ${[...Array(Dn).keys()].map((d) => { const off = [...Array(P).keys()].every((p) => (x.unavailable || []).includes(d + '-' + p)); return `<label class="check"><input type="checkbox" name="wday" value="${d}" ${off ? '' : 'checked'}> ${esc(sDay(d))}</label>`; }).join('')}
    </fieldset>
    <fieldset><legend>${esc(t('Subjects'))}</legend>${subjectChecks('subj', x.subjects || [], 'ets')}</fieldset>
    <p class="muted">${esc(t('Tick periods when this teacher is never available (for example part-time days or other duties). The generator will not use them.'))}</p>
    <div class="tablewrap">${grid}</div>`;
  const wasOff = [...Array(Dn).keys()].map((d) => [...Array(P).keys()].every((p) => (x.unavailable || []).includes(d + '-' + p)));
  const fd = await modal({ title: `${t('Edit')}: ${x.name}`, body });
  if (!fd) return;
  x.name = String(fd.get('name') || x.name).trim() || x.name;
  x.short = uniqueShort(String(fd.get('short') || x.short).trim(), x.id);
  x.phone = String(fd.get('phone') || '').trim();
  x.maxPerWeek = +fd.get('max') || 0;
  x.maxPerDay = +fd.get('maxday') || P;
  x.senior = !!fd.get('senior');
  x.subjects = fd.getAll('subj');
  const mf = String(fd.get('minfree') ?? '').trim();
  x.minFree = mf === '' ? null : Math.max(0, +mf || 0);
  const days = new Set(fd.getAll('wday').map(Number));
  const un = new Set(fd.getAll('un'));
  for (let d = 0; d < Dn; d++) if (!days.has(d)) for (let p = 0; p < P; p++) un.add(d + '-' + p);
  // a day that was fully off and is ticked again becomes available again
  for (let d = 0; d < Dn; d++) if (days.has(d) && wasOff[d]) for (let p = 0; p < P; p++) un.delete(d + '-' + p);
  x.unavailable = [...un];
  save();
  render(false);
  announce(`${x.name}: ${t('Saved.')}`);
};

ACTIONS.delTeacher = async (el) => {
  const x = tch(el.dataset.id);
  if (!x || !(await confirmDlg(`${t('Delete teacher')} ${x.name}? ${t('Their periods in the timetable will lose the teacher.')}`, t('Delete')))) return;
  D.teachers = D.teachers.filter((y) => y.id !== x.id);
  D.lessons.forEach((l) => (l.teacherIds = (l.teacherIds || []).filter((id) => id !== x.id)));
  D.classes.forEach((c) => c.classTeacherId === x.id && (c.classTeacherId = null));
  save();
  render(false);
  announce(`${x.name} ${t('deleted.')}`);
};

ACTIONS.teacherTT = (el) => setView('timetable', { mode: 'teacher', target: el.dataset.id });

// ======================================================================
// CLASSES & SUBJECTS (allocation)
// ======================================================================
VIEWS.allocation = () => {
  const N = nDays() * nPer();
  const list = classesSorted();
  if (!list.length) return `<h1>${esc(t('Classes & Subjects'))}</h1><p class="msg">${esc(t('No classes yet. Add classes in School Profile.'))}</p><button class="btn primary" data-nav="school">${esc(t('School Profile'))}</button>`;
  if (!S.alClass || !cls(S.alClass)) S.alClass = list[0].id;
  const c = cls(S.alClass);
  const ls = lessonsOfClass(c.id);
  const total = ls.reduce((a, l) => a + (+l.perWeek || 0), 0);
  const summary = list.map((k) => {
    const kl = lessonsOfClass(k.id);
    const tot = kl.reduce((a, l) => a + (+l.perWeek || 0), 0);
    const miss = kl.filter((l) => !(l.teacherIds || []).filter(Boolean).length).length;
    const st = tot !== N ? `<span class="badge ${tot > N ? 'err' : 'warn'}">${tot}/${N}</span>` : `<span class="badge ok">${tot}/${N}</span>`;
    return `<tr><th scope="row"><button type="button" class="btn small" data-act="alPick" data-id="${k.id}" ${k.id === c.id ? 'aria-current="true"' : ''}>${esc(k.name)}</button></th>
      <td>${st}</td><td>${miss ? `<span class="badge warn">${miss} ${esc(t('without teacher'))}</span>` : `<span class="badge ok">${esc(t('All assigned'))}</span>`}</td></tr>`;
  }).join('');
  const rows = ls.map((l) => {
    if (isCombined(l)) {
      return `<tr>
      <th scope="row"><span class="chip" style="--h:${hueOf(l.subjectId)}" aria-hidden="true">${esc((subj(l.subjectId) || {}).short || '?')}</span> ${esc(subjName(l.subjectId))}</th>
      <td>🔗 <strong>${esc(t('Combined'))}: ${esc(groupName(lcIds(l)))}</strong><br>${esc(t('Groups taught by'))}: ${esc(tNames(l.teacherIds))}</td>
      <td><input type="number" id="lpw_${l.id}" min="0" max="40" style="width:80px" data-change="lessonPw" data-id="${l.id}" value="${l.perWeek}" aria-label="${esc(subjName(l.subjectId))} ${esc(t('Periods/week'))}"></td>
      <td><input type="number" id="lmd_${l.id}" min="1" max="12" style="width:80px" data-change="lessonMd" data-id="${l.id}" value="${l.maxPerDay}" aria-label="${esc(subjName(l.subjectId))} ${esc(t('Max/day'))}"></td>
      <td><button type="button" class="btn small" data-act="editCombined" data-id="${l.id}" id="ec_${l.id}" aria-label="${esc(t('Edit combined period'))} ${esc(subjName(l.subjectId))}">${esc(t('Edit'))}</button></td></tr>`;
    }
    const tids = (l.teacherIds || []).length ? l.teacherIds : [''];
    const tsel = tids.map((tid, i) => `<select id="lt_${l.id}_${i}" data-change="lessonTeacher" data-id="${l.id}" data-idx="${i}" aria-label="${esc(subjName(l.subjectId))} ${esc(t('teacher'))} ${i + 1}">${teacherOptions(tid, l.subjectId)}</select>`).join('<br>');
    return `<tr>
      <th scope="row"><span class="chip" style="--h:${hueOf(l.subjectId)}" aria-hidden="true">${esc((subj(l.subjectId) || {}).short || '?')}</span> ${esc(subjName(l.subjectId))}</th>
      <td>${tsel} <button type="button" class="btn small" data-act="addParallel" data-id="${l.id}" aria-label="${esc(t('Add parallel teacher for'))} ${esc(subjName(l.subjectId))}" title="${esc(t('Add a parallel teacher (e.g. Arabic / Sanskrit / Malayalam II taught at the same time)'))}">＋</button></td>
      <td><input type="number" id="lpw_${l.id}" min="0" max="40" style="width:80px" data-change="lessonPw" data-id="${l.id}" value="${l.perWeek}" aria-label="${esc(subjName(l.subjectId))} ${esc(t('Periods/week'))}"></td>
      <td><input type="number" id="lmd_${l.id}" min="1" max="12" style="width:80px" data-change="lessonMd" data-id="${l.id}" value="${l.maxPerDay}" aria-label="${esc(subjName(l.subjectId))} ${esc(t('Max/day'))}"></td>
      <td><button type="button" class="btn small danger" data-act="delLesson" data-id="${l.id}" aria-label="${esc(t('Remove'))} ${esc(subjName(l.subjectId))}">${esc(t('Remove'))}</button></td></tr>`;
  }).join('');
  const subjRows = sortByName(D.subjects).map((s) => `<tr>
      <td><input id="sn_${s.id}" data-change="subjName" data-id="${s.id}" value="${esc(s.name)}" aria-label="${esc(t('Subject name'))}"></td>
      <td><input id="ss_${s.id}" data-change="subjShort" data-id="${s.id}" value="${esc(s.short)}" maxlength="6" style="width:90px" aria-label="${esc(t('Short name'))} ${esc(s.name)}"></td>
      <td><span class="chip" style="--h:${s.hue}" aria-hidden="true">${esc(s.short)}</span>
        <input type="range" id="sh_${s.id}" min="0" max="359" value="${s.hue}" data-change="subjHue" data-id="${s.id}" aria-label="${esc(t('Colour'))} ${esc(s.name)}"></td>
      <td>${D.lessons.filter((l) => l.subjectId === s.id).length}</td>
      <td><button type="button" class="btn small danger" data-act="delSubject" data-id="${s.id}" aria-label="${esc(t('Delete'))} ${esc(s.name)}">${esc(t('Delete'))}</button></td></tr>`).join('');
  return `<h1>${esc(t('Classes & Subjects'))}</h1>
  <p class="lead">${esc(t('Decide which subjects each class has, how many periods per week, and who teaches them. Each class should fill exactly'))} ${N} ${esc(t('periods per week'))} (${nDays()} × ${nPer()}).</p>
  <div class="toolbar">
    <button type="button" class="btn primary" data-act="autoAssign">${esc(t('Auto-assign teachers'))}</button>
    <span class="muted">${esc(t('Fills only empty teacher slots, using qualified teachers with the lowest workload.'))}</span>
  </div>
  <div class="tablewrap"><table class="data" style="max-width:640px"><caption>${esc(t('All classes'))}</caption>
    <thead><tr><th scope="col">${esc(t('Class'))}</th><th scope="col">${esc(t('Periods planned'))}</th><th scope="col">${esc(t('Teachers'))}</th></tr></thead><tbody>${summary}</tbody></table></div>
  <section class="card" aria-labelledby="alH">
    <h2 id="alH">${esc(t('Subjects for'))} ${esc(c.name)}</h2>
    <div class="toolbar">
      ${combo({ id: "al_class", label: t("Class"), kind: "class", selectedId: c.id, change: "alClass" })}
      <button type="button" class="btn" data-act="copyPlan">${esc(t('Copy this plan to other divisions'))}</button>
    </div>
    <p id="alTotal" class="msg ${total === N ? 'ok' : total > N ? 'err' : 'warn'}">${total} ${esc(t('of'))} ${N} ${esc(t('periods planned'))}${total === N ? ' ✓' : total > N ? ` – ${esc(t('too many, remove'))} ${total - N}` : ` – ${N - total} ${esc(t('free periods will stay empty'))}`}</p>
    <div class="tablewrap"><table class="data"><caption class="sr-only">${esc(t('Subjects for'))} ${esc(c.name)}</caption>
      <thead><tr><th scope="col">${esc(t('Subject'))}</th><th scope="col">${esc(t('Teacher'))}</th><th scope="col">${esc(t('Periods/week'))}</th><th scope="col">${esc(t('Max/day'))}</th><th scope="col"><span class="sr-only">${esc(t('Actions'))}</span></th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <h3>${esc(t('Add subject'))}</h3>
    <div class="row">
      <label>${esc(t('Subject'))}<select id="al_newsubj">${sortByName(D.subjects).map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
      <label>${esc(t('Periods/week'))}<input type="number" id="al_newpw" min="1" max="40" value="2" style="width:90px"></label>
      <button type="button" class="btn" data-act="addLesson">${esc(t('Add'))}</button>
    </div>
  </section>
  ${stdGridSection()}
  ${combinedSection()}
  <section class="card" aria-labelledby="sbH">
    <h2 id="sbH">${esc(t('All subjects'))}</h2>
    <div class="row" style="margin-bottom:12px">
      <label>${esc(t('New subject name'))}<input id="ns_name"></label>
      <label>${esc(t('Short name'))}<input id="ns_short" maxlength="6" style="width:100px"></label>
      <button type="button" class="btn" data-act="addSubject">${esc(t('Add subject'))}</button>
    </div>
    <div class="tablewrap"><table class="data"><caption class="sr-only">${esc(t('All subjects'))}</caption>
      <thead><tr><th scope="col">${esc(t('Name'))}</th><th scope="col">${esc(t('Short name'))}</th><th scope="col">${esc(t('Colour'))}</th><th scope="col">${esc(t('Used in classes'))}</th><th scope="col"><span class="sr-only">${esc(t('Actions'))}</span></th></tr></thead>
      <tbody>${subjRows}</tbody></table></div>
  </section>`;
};

ACTIONS.alPick = (el) => { S.alClass = el.dataset.id; render(false); const h = $('#alH'); h.tabIndex = -1; h.focus(); };
CHANGES.alClass = (el) => { S.alClass = el.value; render(false); };
ACTIONS.autoAssign = () => {
  const r = PR.autoAssign(D);
  save();
  render(false);
  announce(`${r.assigned} ${t('subjects got a teacher.')}${r.missing ? ' ' + r.missing + ' ' + t('subjects have no qualified teacher – tick the subject for a teacher in Teachers.') : ''}`);
};
CHANGES.lessonTeacher = (el) => {
  const l = les(el.dataset.id);
  if (!l) return;
  const ids = (l.teacherIds || []).length ? l.teacherIds.slice() : [''];
  ids[+el.dataset.idx] = el.value;
  l.teacherIds = ids.filter(Boolean);
  save();
  render(false);
  announce(t('Saved.'));
};
ACTIONS.addParallel = (el) => {
  const l = les(el.dataset.id);
  if (!l) return;
  l.teacherIds = (l.teacherIds || []).filter(Boolean);
  if (!l.teacherIds.length) { announce(t('Choose the first teacher before adding a parallel teacher.')); return; }
  const other = D.teachers.find((x) => !l.teacherIds.includes(x.id) && (x.subjects || []).includes(l.subjectId)) || D.teachers.find((x) => !l.teacherIds.includes(x.id));
  if (!other) return;
  l.teacherIds.push(other.id);
  save();
  render(false);
  const sel = document.getElementById(`lt_${l.id}_${l.teacherIds.length - 1}`);
  if (sel) sel.focus();
  announce(t('Parallel teacher added. Change it in the new list if needed.'));
};
CHANGES.lessonPw = (el) => { const l = les(el.dataset.id); if (l) { l.perWeek = Math.max(0, +el.value || 0); save(); render(false); } };
CHANGES.lessonMd = (el) => { const l = les(el.dataset.id); if (l) { l.maxPerDay = Math.max(1, +el.value || 1); save(); render(false); } };
ACTIONS.delLesson = (el) => {
  const l = les(el.dataset.id);
  if (!l) return;
  D.lessons = D.lessons.filter((x) => x.id !== l.id);
  for (const cid of lcIds(l)) (D.timetable.cells[cid] || []).forEach((row) => row.forEach((v, i) => v === l.id && (row[i] = null)));
  save();
  render(false);
  announce(`${subjName(l.subjectId)} ${t('removed.')}`);
  const f = $('#al_newsubj'); if (f) f.focus();
};

// ---------- periods per week by standard ----------
// One column per standard (all its divisions together), one row per subject.
function stdGroups() {
  const map = new Map();
  for (const c of classesSorted()) {
    if (!c.std) continue;
    const key = c.level === 'HSS' ? `${c.std}|${c.stream}` : `${c.level}|${c.std}`;
    const label = c.level === 'HSS' ? `${c.std} ${t((PR.STREAMS[c.stream] || {}).label || '')}` : `${t('Std')} ${c.std}`;
    if (!map.has(key)) map.set(key, { key, label, classes: [] });
    map.get(key).classes.push(c);
  }
  return [...map.values()];
}
function stdGridSection() {
  const groups = stdGroups();
  if (!groups.length) return '';
  const N = nDays() * nPer();
  const used = new Set(D.lessons.map((l) => l.subjectId));
  const subjects = sortByName(D.subjects).sort((a, b) => (used.has(b.id) ? 1 : 0) - (used.has(a.id) ? 1 : 0));
  const val = (c, sid) => { const l = lessonsOfClass(c.id).find((x) => x.subjectId === sid); return l ? +l.perWeek : 0; };
  const rows = subjects.map((s) => `<tr><th scope="row"><span class="chip" style="--h:${s.hue}" aria-hidden="true">${esc(s.short)}</span> ${esc(s.name)}</th>${groups.map((g, gi) => {
    const v = val(g.classes[0], s.id);
    const differs = g.classes.some((c) => val(c, s.id) !== v);
    return `<td><input type="number" min="0" max="40" style="width:64px" id="sp_${gi}_${s.id}" data-change="stdPw" data-g="${gi}" data-s="${s.id}" value="${v}" aria-label="${esc(s.name)}, ${esc(g.label)}, ${esc(t('periods per week'))}${differs ? ', ' + esc(t('divisions differ')) : ''}">${differs ? ' <span class="badge warn" title="' + esc(t('divisions differ')) + '">≠</span>' : ''}</td>`;
  }).join('')}</tr>`).join('');
  const totals = groups.map((g) => { const tot = lessonsOfClass(g.classes[0].id).reduce((a, l) => a + (+l.perWeek || 0), 0); return `<td><span class="badge ${tot === N ? 'ok' : tot > N ? 'err' : 'warn'}">${tot}/${N}</span></td>`; }).join('');
  return `<section class="card" aria-labelledby="sgH">
    <h2 id="sgH">${esc(t('Periods per week by standard'))}</h2>
    <p class="muted">${esc(t('Subjects can have different periods in different standards, for example Social Science 4 in Std 8 and 5 in Std 9. A number here changes every division of that standard. 0 removes the subject from that standard.'))}</p>
    <div class="tablewrap"><table class="data"><caption class="sr-only">${esc(t('Periods per week by standard'))}</caption>
      <thead><tr><th scope="col">${esc(t('Subject'))}</th>${groups.map((g) => `<th scope="col">${esc(g.label)}<br><small class="muted">${esc(g.classes.map((c) => c.name).join(', '))}</small></th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><th scope="row">${esc(t('Total'))}</th>${totals}</tr></tfoot></table></div>
  </section>`;
}
CHANGES.stdPw = (el) => {
  const g = stdGroups()[+el.dataset.g];
  if (!g) return;
  const sid = el.dataset.s;
  const n = Math.max(0, Math.min(40, +el.value || 0));
  for (const c of g.classes) {
    const l = lessonsOfClass(c.id).find((x) => x.subjectId === sid);
    if (l) {
      if (n === 0 && !isCombined(l)) {
        D.lessons = D.lessons.filter((x) => x.id !== l.id);
        (D.timetable.cells[c.id] || []).forEach((row) => row.forEach((v, i) => v === l.id && (row[i] = null)));
      } else {
        l.perWeek = n;
        if (n && (+l.maxPerDay || 1) * nDays() < n) l.maxPerDay = PR.defaultMaxPerDay(n, nDays());
      }
    } else if (n > 0) {
      D.lessons.push({ id: PR.uid('l'), classId: c.id, subjectId: sid, teacherIds: [], perWeek: n, maxPerDay: PR.defaultMaxPerDay(n, nDays()) });
    }
  }
  save();
  render(false);
  const tot = lessonsOfClass(g.classes[0].id).reduce((a, l) => a + (+l.perWeek || 0), 0);
  announce(`${subjName(sid)}, ${g.label}: ${n}. ${t('Total')} ${tot} / ${nDays() * nPer()}.`);
};

// ---------- combined periods (language groups across divisions) ----------
function combinedForm(o, prefix) {
  const classBoxes = classesSorted().map((k) => `<label class="check"><input type="checkbox" name="${prefix}cls" value="${k.id}" ${o.classIds.includes(k.id) ? 'checked' : ''}> ${esc(k.name)}</label>`).join('');
  const qual = sortByName(D.teachers).sort((a, b) => ((b.subjects || []).includes(o.subjectId) ? 1 : 0) - ((a.subjects || []).includes(o.subjectId) ? 1 : 0));
  const tBoxes = qual.map((x) => `<label class="check"><input type="checkbox" name="${prefix}t" value="${x.id}" ${o.teacherIds.includes(x.id) ? 'checked' : ''}> ${esc(x.name)} <span class="muted">(${esc((x.subjects || []).map((s) => (subj(s) || {}).short).join(', '))})</span></label>`).join('');
  return `<div class="row">
      <label>${esc(t('Subject'))}<select name="${prefix}subj" id="${prefix}subj">${sortByName(D.subjects).map((s) => `<option value="${s.id}" ${s.id === o.subjectId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <label>${esc(t('Periods/week'))}<input type="number" name="${prefix}pw" id="${prefix}pw" min="1" max="40" value="${o.perWeek}" style="width:90px"></label>
      <label>${esc(t('Max/day'))}<input type="number" name="${prefix}md" id="${prefix}md" min="1" max="12" value="${o.maxPerDay}" style="width:90px"></label>
    </div>
    <fieldset><legend>${esc(t('Classes that join together'))}</legend>${classBoxes}</fieldset>
    <fieldset><legend>${esc(t('Teachers (one for each group, e.g. Malayalam, Arabic, Urdu)'))}</legend>${tBoxes}</fieldset>`;
}

function combinedSection() {
  const list = D.lessons.filter(isCombined);
  const sl = D.subjects.find((s) => /arabic|sanskrit|urdu|language/i.test(s.name));
  const rows = list.map((l) => `<tr><th scope="row">${esc(subjName(l.subjectId))}</th><td>${esc(groupName(lcIds(l)))}</td><td>${esc(tNames(l.teacherIds))}</td><td>${l.perWeek}</td>
    <td class="row" style="gap:6px"><button type="button" class="btn small" data-act="editCombined" data-id="${l.id}" aria-label="${esc(t('Edit'))} ${esc(subjName(l.subjectId))} ${esc(groupName(lcIds(l)))}">${esc(t('Edit'))}</button>
    <button type="button" class="btn small danger" data-act="delLesson" data-id="${l.id}" aria-label="${esc(t('Delete'))} ${esc(subjName(l.subjectId))} ${esc(groupName(lcIds(l)))}">${esc(t('Delete'))}</button></td></tr>`).join('');
  return `<section class="card" aria-labelledby="cbH">
    <h2 id="cbH">🔗 ${esc(t('Combined periods (language groups)'))}</h2>
    <p class="muted">${esc(t('Use this when divisions meet together and are regrouped, for example 6A, 6B and 6C have Language at the same time: Malayalam students with one teacher, Arabic with another, Urdu with a third. The period is placed at the same time in all chosen classes, and every chosen teacher is busy then.'))}</p>
    ${rows ? `<div class="tablewrap"><table class="data"><thead><tr><th scope="col">${esc(t('Subject'))}</th><th scope="col">${esc(t('Classes'))}</th><th scope="col">${esc(t('Teachers'))}</th><th scope="col">${esc(t('Periods/week'))}</th><th scope="col">${esc(t('Actions'))}</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
    <details ${list.length ? '' : 'open'}><summary><strong>${esc(t('Create a combined period'))}</strong></summary>
      ${combinedForm({ subjectId: sl ? sl.id : (D.subjects[0] || {}).id, classIds: [], teacherIds: [], perWeek: 3, maxPerDay: 1 }, 'cb_')}
      <label class="check"><input type="checkbox" id="cb_replace" checked> ${esc(t('Remove the separate period of this subject from these classes'))}</label>
      <p><button type="button" class="btn primary" data-act="addCombined">${esc(t('Create combined period'))}</button></p>
    </details>
  </section>`;
}

function readCombined(get, getAll, prefix) {
  return { subjectId: get(prefix + 'subj'), classIds: getAll(prefix + 'cls'), teacherIds: getAll(prefix + 't'), perWeek: Math.max(1, +get(prefix + 'pw') || 1), maxPerDay: Math.max(1, +get(prefix + 'md') || 1) };
}
function checkCombined(o) {
  if (o.classIds.length < 2) return t('Choose at least two classes.');
  if (!o.teacherIds.length) return t('Choose at least one teacher.');
  return null;
}

ACTIONS.addCombined = () => {
  const o = readCombined((n) => ($(`[name="${n}"]`) || {}).value, (n) => $$(`input[name="${n}"]:checked`).map((i) => i.value), 'cb_');
  const err = checkCombined(o);
  if (err) { announce(err); return; }
  o.replace = $('#cb_replace').checked;
  PR.combineLessons(D, o);
  save();
  render(false);
  announce(`${t('Combined period created for')} ${groupName(o.classIds)}: ${subjName(o.subjectId)}, ${o.perWeek} ${t('periods per week')}.`);
  const h = $('#cbH'); if (h) { h.tabIndex = -1; h.focus(); }
};

ACTIONS.editCombined = async (el) => {
  const l = les(el.dataset.id);
  if (!l) return;
  const fd = await modal({ title: `${t('Edit combined period')}: ${subjName(l.subjectId)}`, body: combinedForm({ subjectId: l.subjectId, classIds: lcIds(l), teacherIds: l.teacherIds || [], perWeek: l.perWeek, maxPerDay: l.maxPerDay }, 'ed_') });
  if (!fd) return;
  const o = readCombined((n) => fd.get(n), (n) => fd.getAll(n), 'ed_');
  const err = checkCombined(o);
  if (err) { await infoDlg(t('Not saved'), `<p>${esc(err)}</p>`); return; }
  const removed = lcIds(l).filter((c) => !o.classIds.includes(c));
  for (const c of removed) (D.timetable.cells[c] || []).forEach((row) => row.forEach((v, i) => v === l.id && (row[i] = null)));
  // classes newly added get the existing placements too
  const placed = [];
  (D.timetable.cells[lcIds(l)[0]] || []).forEach((row, d) => row.forEach((v, p) => v === l.id && placed.push([d, p])));
  for (const c of o.classIds.filter((x) => !lcIds(l).includes(x))) { const g = ensureCellsFor(c); placed.forEach(([d, p]) => (g[d][p] = l.id)); }
  Object.assign(l, { subjectId: o.subjectId, classIds: o.classIds, classId: o.classIds[0], teacherIds: o.teacherIds, perWeek: o.perWeek, maxPerDay: o.maxPerDay });
  save();
  render(false);
  announce(t('Saved.'));
};
function ensureCellsFor(classId) {
  let g = D.timetable.cells[classId];
  if (!g) g = D.timetable.cells[classId] = [];
  for (let d = 0; d < nDays(); d++) { if (!g[d]) g[d] = []; for (let p = 0; p < nPer(); p++) if (g[d][p] === undefined) g[d][p] = null; }
  return g;
}

ACTIONS.addLesson = () => {
  const sid = $('#al_newsubj').value;
  if (!sid) return;
  if (D.lessons.some((l) => lcIds(l).includes(S.alClass) && l.subjectId === sid)) { announce(t('This class already has that subject. Change its periods instead.')); return; }
  const pw = Math.max(1, +$('#al_newpw').value || 1);
  D.lessons.push({ id: PR.uid('l'), classId: S.alClass, subjectId: sid, teacherIds: [], perWeek: pw, maxPerDay: PR.defaultMaxPerDay(pw, nDays()) });
  save();
  render(false);
  announce(`${subjName(sid)} ${t('added.')}`);
};
ACTIONS.copyPlan = async () => {
  const c = cls(S.alClass);
  const targets = D.classes.filter((k) => k.id !== c.id && k.level === c.level && k.std === c.std && (k.stream || null) === (c.stream || null) && c.std);
  if (!targets.length) { announce(t('No other divisions of this standard.')); return; }
  if (!(await confirmDlg(`${t('Copy the subject plan of')} ${c.name} ${t('to')} ${targets.map((k) => k.name).join(', ')}? ${t('Their periods per week will be replaced. Teachers already chosen for the same subject are kept.')}`, t('Copy')))) return;
  const single = (l) => !isCombined(l);
  const src = D.lessons.filter((l) => l.classId === c.id && single(l));
  for (const k of targets) {
    const old = D.lessons.filter((l) => l.classId === k.id && single(l));
    const combinedSubjects = new Set(lessonsOfClass(k.id).filter(isCombined).map((l) => l.subjectId));
    D.lessons = D.lessons.filter((l) => !(l.classId === k.id && single(l)));
    for (const l of src) {
      if (combinedSubjects.has(l.subjectId)) continue;
      const prev = old.find((o) => o.subjectId === l.subjectId);
      D.lessons.push({ id: prev ? prev.id : PR.uid('l'), classId: k.id, subjectId: l.subjectId, teacherIds: prev ? prev.teacherIds : [], perWeek: l.perWeek, maxPerDay: l.maxPerDay });
    }
    const keep = new Set(lessonsOfClass(k.id).map((l) => l.id));
    (D.timetable.cells[k.id] || []).forEach((row) => row.forEach((v, i) => v && !keep.has(v) && (row[i] = null)));
  }
  save();
  render(false);
  announce(`${t('Plan copied to')} ${targets.length} ${t('classes.')}`);
};
ACTIONS.addSubject = () => {
  const name = $('#ns_name').value.trim();
  if (!name) { announce(t('Enter a subject name.')); $('#ns_name').focus(); return; }
  if (D.subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) { announce(t('This subject already exists.')); return; }
  PR.ensureSubject(D, name, $('#ns_short').value.trim() || PR.initials(name));
  save();
  render(false);
  announce(`${name} ${t('added.')}`);
  $('#ns_name').focus();
};
CHANGES.subjName = (el) => { const s = subj(el.dataset.id); if (s && el.value.trim()) { s.name = el.value.trim(); save(); announce(t('Saved.')); } };
CHANGES.subjShort = (el) => { const s = subj(el.dataset.id); if (s && el.value.trim()) { s.short = el.value.trim().toUpperCase(); save(); render(false); } };
CHANGES.subjHue = (el) => { const s = subj(el.dataset.id); if (s) { s.hue = +el.value; save(); render(false); } };
ACTIONS.delSubject = async (el) => {
  const s = subj(el.dataset.id);
  if (!s) return;
  const used = D.lessons.filter((l) => l.subjectId === s.id);
  if (used.length && !(await confirmDlg(`${s.name} ${t('is used in')} ${used.length} ${t('classes. Delete it and remove it from those classes?')}`, t('Delete')))) return;
  const ids = new Set(used.map((l) => l.id));
  D.lessons = D.lessons.filter((l) => !ids.has(l.id));
  Object.values(D.timetable.cells).forEach((g) => g.forEach((row) => row.forEach((v, i) => ids.has(v) && (row[i] = null))));
  D.subjects = D.subjects.filter((x) => x.id !== s.id);
  D.teachers.forEach((x) => (x.subjects = (x.subjects || []).filter((id) => id !== s.id)));
  save();
  render(false);
  announce(`${s.name} ${t('deleted.')}`);
};

// ======================================================================
// SETTINGS
// ======================================================================
VIEWS.settings = () => {
  const st = D.settings;
  const opt = (v, cur, label) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(label)}</option>`;
  const keys = [
    ['Alt + 1 … 9, 0', t('Go to a section of the menu')],
    ['Arrow keys', t('Move between periods in the timetable grid')],
    ['Enter', t('Change the selected period')],
    ['Space', t('Pick a period, then Space on another period to swap them')],
    ['L', t('Lock or unlock the period (generator will not move it)')],
    ['Delete', t('Clear the period')],
    ['Ctrl + Z', t('Undo the last timetable change')],
    ['Escape', t('Cancel a pick or close a dialog')],
    ['F1', t('Open the user guide')]
  ];
  return `<h1>${esc(t('Settings'))}</h1>
  <div class="card"><div class="grid3">
    <label>${esc(t('Language'))}<select id="set_lang" data-change="setLang">${opt('en', st.lang, 'English')}${opt('ml', st.lang, 'മലയാളം')}</select></label>
    <label>${esc(t('Theme'))}<select id="set_theme" data-change="setTheme">${opt('system', st.theme, t('System'))}${opt('light', st.theme, t('Light'))}${opt('dark', st.theme, t('Dark'))}${opt('contrast', st.theme, t('High contrast'))}</select></label>
    <label>${esc(t('Text size'))}<select id="set_font" data-change="setFont">${[90, 100, 115, 130, 150].map((v) => opt(v, st.fontScale || 100, v + '%')).join('')}</select></label>
  </div></div>
  <section class="card" aria-labelledby="kbH"><h2 id="kbH">${esc(t('Keyboard shortcuts'))}</h2>
    <table class="data"><thead><tr><th scope="col">${esc(t('Key'))}</th><th scope="col">${esc(t('Action'))}</th></tr></thead>
    <tbody>${keys.map(([k, v]) => `<tr><th scope="row"><kbd>${esc(k)}</kbd></th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
    <p class="muted">${esc(t('Tested with NVDA, JAWS and Windows Narrator. In the timetable grid, screen readers read the day and period headers with each cell.'))}</p>
  </section>
  <section class="card" aria-labelledby="abH"><h2 id="abH">${esc(t('About'))}</h2>
    <p>Samayam (സമയം) – ${esc(t('free and open source school timetable and substitution manager.'))}</p>
    <p id="aboutInfo" class="muted"></p>
    <button type="button" class="btn primary" data-act="openGuide">📖 ${esc(t('User guide'))} (F1)</button>
    <button type="button" class="btn" data-act="openData">${esc(t('Open data folder'))}</button>
  </section>`;
};
CHANGES.setLang = (el) => { D.settings.lang = el.value; applySettings(); save(); render(false); announce(el.value === 'ml' ? 'ഭാഷ മലയാളം ആക്കി' : 'Language set to English'); };
CHANGES.setTheme = (el) => { D.settings.theme = el.value; applySettings(); save(); announce(t('Theme changed.')); };
CHANGES.setFont = (el) => { D.settings.fontScale = +el.value; applySettings(); save(); announce(t('Text size') + ' ' + el.value + '%'); };
ACTIONS.openData = () => io.openDataFolder();
const GUIDE_URL = 'https://github.com/hamsajaisal/samayam/blob/main/docs/USER_GUIDE.md';
ACTIONS.openGuide = () => { io.openUrl(GUIDE_URL); announce(t('Opening the user guide in your web browser.')); };

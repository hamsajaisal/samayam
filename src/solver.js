/* Samayam - timetable generator.
 * Hard rules: a class has one lesson per slot; a teacher is in one place per
 * slot; teacher unavailable slots; teacher max periods per day; a subject's
 * max periods per day in a class; locked cells stay where they are.
 * Soft rule: spread each subject across the week.
 * Method: randomised greedy placement (hardest lessons first) with a
 * conflict-repair step (move up to 2 blocking lessons), repeated many times;
 * the best attempt wins.
 */
(function (root) {
  'use strict';

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A lesson normally belongs to one class. A combined lesson (for example a
  // language period where 6A, 6B and 6C are regrouped into Malayalam, Arabic
  // and Urdu groups) has classIds: [...] and happens in all of them at once.
  function lessonClassIds(l) {
    return l.classIds && l.classIds.length ? l.classIds : [l.classId];
  }

  // Minimum free (leisure) periods a teacher keeps each day: the teacher's own
  // value, otherwise the school default.
  function minFreeOf(data, t) {
    const v = t.minFree;
    return v === '' || v === null || v === undefined ? (+data.school.minFreePerDay || 0) : +v || 0;
  }
  // Most periods a teacher may teach in one day.
  function effectiveMaxDay(data, t) {
    const P = data.school.periodsPerDay;
    return Math.max(1, Math.min(+t.maxPerDay || P, P - minFreeOf(data, t)));
  }

  function buildInput(data) {
    const D = data.school.workingDays.length, P = data.school.periodsPerDay;
    const N = D * P;
    const classIds = new Set(data.classes.map((c) => c.id));
    const teacherIds = new Set(data.teachers.map((t) => t.id));
    const lessons = data.lessons
      .map((l) => ({ l, cids: lessonClassIds(l).filter((c) => classIds.has(c)) }))
      .filter(({ l, cids }) => cids.length && +l.perWeek > 0)
      .map(({ l, cids }) => ({
        id: l.id,
        classId: cids[0],
        classIds: cids,
        teacherIds: [...new Set((l.teacherIds || []).filter((t) => teacherIds.has(t)))],
        perWeek: +l.perWeek,
        maxPerDay: Math.max(1, +l.maxPerDay || P)
      }));
    const lessonIds = new Set(lessons.map((l) => l.id));
    const locked = [];
    const cells = (data.timetable && data.timetable.cells) || {};
    const lk = (data.timetable && data.timetable.locked) || {};
    for (const key of Object.keys(lk)) {
      if (!lk[key]) continue;
      const [c, d, p] = key.split('|');
      const lid = cells[c] && cells[c][+d] && cells[c][+d][+p];
      if (lid && lessonIds.has(lid) && +d < D && +p < P) locked.push({ classId: c, slot: +d * P + +p, lessonId: lid });
    }
    return {
      days: D,
      periods: P,
      classes: data.classes.map((c) => ({ id: c.id })),
      lessons,
      teachers: data.teachers.map((t) => ({
        id: t.id,
        maxPerDay: effectiveMaxDay(data, t),
        maxPerWeek: +t.maxPerWeek || N,
        unavailable: (t.unavailable || []).map((k) => {
          const [d, p] = String(k).split('-').map(Number);
          return d * P + p;
        }).filter((s) => s >= 0 && s < N)
      })),
      locked
    };
  }

  function attempt(input, rnd) {
    const D = input.days, P = input.periods, N = D * P;
    const lessons = {};
    input.lessons.forEach((l) => { if (!l.classIds) l.classIds = [l.classId]; lessons[l.id] = l; });
    const tInfo = {};
    input.teachers.forEach((t) => (tInfo[t.id] = { maxDay: t.maxPerDay || P, unav: new Set(t.unavailable || []) }));
    const grid = {}, tBusy = {}, tDay = {}, lDay = {}, placed = {};
    input.classes.forEach((c) => (grid[c.id] = new Array(N).fill(null)));
    const ensureT = (id) => {
      if (!tInfo[id]) tInfo[id] = { maxDay: P, unav: new Set() };
      if (!tBusy[id]) { tBusy[id] = new Array(N).fill(null); tDay[id] = new Array(D).fill(0); }
    };
    input.lessons.forEach((l) => { lDay[l.id] = new Array(D).fill(0); placed[l.id] = 0; l.teacherIds.forEach(ensureT); });
    const lockedSlots = new Set();
    const lockConflicts = [];

    function canPlace(l, s, ignoreLimits) {
      for (const c of l.classIds) if (grid[c][s] !== null) return false;
      const d = (s / P) | 0;
      if (!ignoreLimits && lDay[l.id][d] >= l.maxPerDay) return false;
      for (const t of l.teacherIds) {
        if (tBusy[t][s] !== null) return false;
        if (!ignoreLimits && tInfo[t].unav.has(s)) return false;
        if (!ignoreLimits && tDay[t][d] >= tInfo[t].maxDay) return false;
      }
      return true;
    }
    function place(l, s) {
      const d = (s / P) | 0;
      for (const c of l.classIds) grid[c][s] = l.id;
      lDay[l.id][d]++;
      placed[l.id]++;
      for (const t of l.teacherIds) { tBusy[t][s] = l.classId; tDay[t][d]++; }
    }
    function unplace(classId, s) {
      const lid = grid[classId][s];
      if (lid === null) return null;
      const l = lessons[lid];
      const d = (s / P) | 0;
      for (const c of l.classIds) grid[c][s] = null;
      lDay[lid][d]--;
      placed[lid]--;
      for (const t of l.teacherIds) { tBusy[t][s] = null; tDay[t][d]--; }
      return l;
    }
    function score(l, s) {
      const d = (s / P) | 0, p = s % P;
      let sc = rnd() * 4;
      const cnt = lDay[l.id][d];
      sc += cnt === 0 ? 12 : -8 * cnt;
      // a second period on the same day is nicer next to the first (double period)
      if (cnt > 0 && ((p > 0 && grid[l.classId][s - 1] === l.id) || (p < P - 1 && grid[l.classId][s + 1] === l.id))) sc += 3;
      return sc;
    }
    function bestSlot(l, except) {
      let bs = -1, bsc = -Infinity;
      for (let s = 0; s < N; s++) {
        if (s === except || !canPlace(l, s)) continue;
        const sc = score(l, s);
        if (sc > bsc) { bsc = sc; bs = s; }
      }
      return bs;
    }
    function shuffled(n) {
      const a = [...Array(n).keys()];
      for (let i = n - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    }
    function repair(l, maxConf) {
      for (const s of shuffled(N)) {
        if (l.classIds.some((c) => lockedSlots.has(c + '|' + s))) continue;
        const d = (s / P) | 0;
        if (lDay[l.id][d] >= l.maxPerDay) continue;
        let bad = false;
        const conf = [];
        const seen = new Set();
        for (const c of l.classIds) {
          const o = grid[c][s];
          if (o !== null && !seen.has(o)) { seen.add(o); conf.push([c, s]); }
        }
        for (const t of l.teacherIds) {
          if (tInfo[t].unav.has(s)) { bad = true; break; }
          const oc = tBusy[t][s];
          if (oc !== null && !seen.has(grid[oc][s])) { seen.add(grid[oc][s]); conf.push([oc, s]); }
        }
        if (bad || !conf.length || conf.length > maxConf) continue;
        if (conf.some((c) => lockedSlots.has(c[0] + '|' + c[1]))) continue;
        const removed = conf.map((c) => unplace(c[0], c[1]));
        if (!canPlace(l, s)) { removed.forEach((rl, i) => place(rl, conf[i][1])); continue; }
        place(l, s);
        const moved = [];
        let ok = true;
        for (const rl of removed) {
          const bs = bestSlot(rl, s);
          if (bs < 0) { ok = false; break; }
          place(rl, bs);
          moved.push([rl, bs]);
        }
        if (ok) return true;
        for (const [rl, bs] of moved) unplace(rl.classId, bs);
        unplace(l.classId, s);
        removed.forEach((rl, i) => place(rl, conf[i][1]));
      }
      return false;
    }

    for (const lk of input.locked || []) {
      const l = lessons[lk.lessonId];
      if (!l || !grid[lk.classId]) continue;
      if (grid[lk.classId][lk.slot] === l.id) continue; // combined lesson already placed via another class
      if (canPlace(l, lk.slot, true)) { place(l, lk.slot); l.classIds.forEach((c) => lockedSlots.add(c + '|' + lk.slot)); }
      else lockConflicts.push(lk);
    }

    const demand = {};
    input.lessons.forEach((l) => l.teacherIds.forEach((t) => (demand[t] = (demand[t] || 0) + l.perWeek)));
    const units = [];
    for (const l of input.lessons) {
      let k = l.teacherIds.length * 0.5 + l.perWeek / (D * l.maxPerDay);
      for (const t of l.teacherIds) k += (demand[t] || 0) / Math.max(1, N - tInfo[t].unav.size);
      for (let i = placed[l.id]; i < l.perWeek; i++) units.push({ l, k: k + rnd() * 0.3 });
    }
    units.sort((a, b) => b.k - a.k);

    const unplaced = [];
    for (const { l } of units) {
      const bs = bestSlot(l, -1);
      if (bs >= 0) place(l, bs);
      else if (!repair(l, 2)) unplaced.push(l);
    }
    for (let round = 0; round < 3 && unplaced.length; round++) {
      for (let i = unplaced.length - 1; i >= 0; i--) {
        const l = unplaced[i];
        const bs = bestSlot(l, -1);
        if (bs >= 0) { place(l, bs); unplaced.splice(i, 1); } else if (repair(l, 3)) unplaced.splice(i, 1);
      }
    }

    let penalty = 0;
    input.lessons.forEach((l) => {
      for (let d = 0; d < D; d++) {
        const c = lDay[l.id][d];
        if (c > 1) penalty += (c - 1) * (l.perWeek <= D ? 3 : 1);
      }
    });

    const cells = {};
    for (const c of input.classes) {
      cells[c.id] = [];
      for (let d = 0; d < D; d++) cells[c.id].push(grid[c.id].slice(d * P, d * P + P));
    }
    const miss = {};
    unplaced.forEach((l) => (miss[l.id] = (miss[l.id] || 0) + 1));
    return {
      cells,
      unplaced: Object.keys(miss).map((id) => ({ lessonId: id, count: miss[id] })),
      unplacedCount: unplaced.length,
      penalty,
      lockConflicts
    };
  }

  function generateTimetable(input, opts) {
    opts = opts || {};
    const start = Date.now();
    const timeLimit = opts.timeLimitMs || 6000;
    const maxAttempts = opts.attempts || 300;
    let best = null, tries = 0;
    for (let a = 0; a < maxAttempts; a++) {
      tries++;
      const r = attempt(input, rng((opts.seed || 1) + a * 7919));
      if (!best || r.unplacedCount < best.unplacedCount || (r.unplacedCount === best.unplacedCount && r.penalty < best.penalty)) best = r;
      const elapsed = Date.now() - start;
      if (best.unplacedCount === 0 && (a >= 5 || elapsed > timeLimit / 3)) break;
      if (elapsed > timeLimit) break;
    }
    best.attempts = tries;
    best.ms = Date.now() - start;
    return best;
  }

  // Teacher clashes (one teacher in two classes at once) and unavailable slots.
  function findClashes(data) {
    const P = data.school.periodsPerDay, D = data.school.workingDays.length;
    const lessons = {};
    data.lessons.forEach((l) => (lessons[l.id] = l));
    const at = {};
    const cells = data.timetable.cells || {};
    for (const c of data.classes) {
      const g = cells[c.id] || [];
      for (let d = 0; d < D; d++) for (let p = 0; p < P; p++) {
        const lid = g[d] && g[d][p];
        const l = lid && lessons[lid];
        if (!l) continue;
        for (const t of l.teacherIds || []) {
          const k = t + '|' + d + '|' + p;
          (at[k] = at[k] || {})[l.id] = true;
        }
      }
    }
    const classesOf = (k) => [...new Set(Object.keys(at[k]).flatMap((lid) => lessonClassIds(lessons[lid])))];
    const cellKeys = new Set();
    const list = [];
    for (const k of Object.keys(at)) {
      const [t, d, p] = k.split('|');
      if (Object.keys(at[k]).length > 1) {
        const cs = classesOf(k);
        cs.forEach((c) => cellKeys.add(c + '|' + d + '|' + p));
        list.push({ teacherId: t, d: +d, p: +p, classIds: cs });
      }
    }
    const unavailable = [];
    for (const t of data.teachers) {
      for (const u of t.unavailable || []) {
        const [d, p] = String(u).split('-');
        const k = t.id + '|' + d + '|' + p;
        if (at[k]) {
          const cs = classesOf(k);
          cs.forEach((c) => cellKeys.add(c + '|' + d + '|' + p));
          unavailable.push({ teacherId: t.id, d: +d, p: +p, classIds: cs });
        }
      }
    }
    return { cellKeys, list, unavailable };
  }

  // Checks before generating: returns [{level:'error'|'warn', text, ...}]
  function precheck(data) {
    const out = [];
    const D = data.school.workingDays.length, P = data.school.periodsPerDay, N = D * P;
    const tName = (id) => (data.teachers.find((t) => t.id === id) || {}).name || '?';
    for (const c of data.classes) {
      const ls = data.lessons.filter((l) => lessonClassIds(l).includes(c.id));
      const total = ls.reduce((s, l) => s + (+l.perWeek || 0), 0);
      if (total > N) out.push({ level: 'error', key: 'classOver', cls: c.name, total, N });
      else if (total < N) out.push({ level: 'warn', key: 'classUnder', cls: c.name, total, N });
      for (const l of ls) {
        if (!(l.teacherIds || []).filter(Boolean).length) {
          const s = data.subjects.find((x) => x.id === l.subjectId);
          out.push({ level: 'warn', key: 'noTeacher', cls: c.name, subject: s ? s.name : '?' });
        }
        if ((+l.maxPerDay || P) * D < +l.perWeek) {
          const s = data.subjects.find((x) => x.id === l.subjectId);
          out.push({ level: 'error', key: 'maxDayTooLow', cls: c.name, subject: s ? s.name : '?' });
        }
      }
    }
    for (const t of data.teachers) {
      const load = data.lessons.reduce((s, l) => s + ((l.teacherIds || []).includes(t.id) ? +l.perWeek || 0 : 0), 0);
      const avail = Math.min(N - (t.unavailable || []).length, effectiveMaxDay(data, t) * D);
      if (load > avail) out.push({ level: 'error', key: 'teacherImpossible', teacher: tName(t.id), load, avail });
      else if (load > (+t.maxPerWeek || N)) out.push({ level: 'warn', key: 'teacherOver', teacher: tName(t.id), load, max: +t.maxPerWeek });
    }
    return out;
  }

  const api = { buildInput, generateTimetable, findClashes, precheck, lessonClassIds, minFreeOf, effectiveMaxDay };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SamayamSolver = api;
})(typeof self !== 'undefined' ? self : this);

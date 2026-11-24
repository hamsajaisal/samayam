/* Samayam - substitution planner.
 * For each period an absent teacher would teach, pick a free teacher.
 * Ranking: teaches this class (+30), same subject (+20), class teacher (+10),
 * fewer periods today (-5 each), fewer recent substitutions (-3 each),
 * not sandwiched between two busy periods (-10), daily substitution limit.
 */
(function (root) {
  'use strict';

  function pad(n) { return String(n).padStart(2, '0'); }
  const classIdsOf = (l) => (l.classIds && l.classIds.length ? l.classIds : [l.classId]);
  function parseDate(ds) { const [y, m, d] = ds.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(ds, n) { const dt = parseDate(ds); dt.setDate(dt.getDate() + n); return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; }

  // Which timetable day a date uses (-1 = no classes). Special days can make a
  // working day a holiday, or make a Saturday follow, say, Monday's timetable.
  function dayIndexFor(school, ds, specialDays) {
    const sp = specialDays && specialDays[ds];
    if (sp && sp.type === 'holiday') return -1;
    if (sp && sp.type === 'follow' && +sp.follow >= 0 && +sp.follow < school.workingDays.length) return +sp.follow;
    return school.workingDays.indexOf(parseDate(ds).getDay());
  }

  function absentPeriods(abs, school) {
    const P = school.periodsPerDay;
    const L = Math.min(P, Math.max(1, +school.lunchAfter || Math.ceil(P / 2)));
    const range = (a, b) => { const r = []; for (let i = a; i < b; i++) r.push(i); return r; };
    if (abs.session === 'am') return range(0, L);
    if (abs.session === 'pm') return range(L, P);
    if (abs.session === 'custom') return (abs.periods || []).map(Number).filter((p) => p >= 0 && p < P);
    return range(0, P);
  }

  function createContext(data, ds, absences) {
    const school = data.school;
    const P = school.periodsPerDay;
    const d = dayIndexFor(school, ds, data.specialDays);
    const minFreeOf = (t) => (t.minFree === '' || t.minFree === null || t.minFree === undefined ? (+school.minFreePerDay || 0) : +t.minFree || 0);
    const lessons = {};
    data.lessons.forEach((l) => (lessons[l.id] = l));
    const absentAt = {};
    const noteOf = {};
    for (const a of absences) {
      absentAt[a.teacherId] = new Set(absentPeriods(a, school));
      noteOf[a.teacherId] = a.note || '';
    }
    // what every teacher teaches today, per period
    const busy = {};
    data.teachers.forEach((t) => (busy[t.id] = new Array(P).fill(null)));
    const cells = data.timetable.cells || {};
    if (d >= 0) {
      for (const c of data.classes) {
        const row = (cells[c.id] || [])[d] || [];
        for (let p = 0; p < P; p++) {
          const l = row[p] && lessons[row[p]];
          if (!l) continue;
          for (const t of l.teacherIds || []) if (busy[t]) busy[t][p] = { classId: c.id, lessonId: l.id };
        }
      }
    }
    const teachClass = new Set();
    data.lessons.forEach((l) => (l.teacherIds || []).forEach((t) => classIdsOf(l).forEach((c) => teachClass.add(t + '|' + c))));
    const since = addDays(ds, -(+school.fairnessDays || 30));
    const recent = {};
    for (const dt of Object.keys(data.substitutions || {})) {
      if (dt < since || dt >= ds) continue;
      for (const r of data.substitutions[dt] || []) if (r.subTeacherId) recent[r.subTeacherId] = (recent[r.subTeacherId] || 0) + 1;
    }
    const unavailable = (t, p) => (t.unavailable || []).includes(d + '-' + p);

    function initialRows() {
      const rows = [];
      if (d < 0) return rows;
      const seen = new Set();
      for (let p = 0; p < P; p++) {
        for (const c of data.classes) {
          const lid = ((cells[c.id] || [])[d] || [])[p];
          const l = lid && lessons[lid];
          if (!l) continue;
          for (const t of l.teacherIds || []) {
            const key = l.id + '|' + p + '|' + t;
            if (absentAt[t] && absentAt[t].has(p) && !seen.has(key)) {
              seen.add(key);
              const cids = classIdsOf(l);
              rows.push({ period: p, classId: cids[0], classIds: cids, lessonId: l.id, subjectId: l.subjectId, absentTeacherId: t, subTeacherId: null, note: noteOf[t] || '' });
            }
          }
        }
      }
      return rows;
    }

    // Ranked candidates for rows[idx], given the other rows' choices.
    function evaluate(rows, idx) {
      const row = rows[idx];
      const p = row.period;
      const subAt = {}, subsToday = {};
      rows.forEach((r, i) => {
        if (i === idx || !r.subTeacherId) return;
        (subAt[r.subTeacherId] = subAt[r.subTeacherId] || new Set()).add(r.period);
        subsToday[r.subTeacherId] = (subsToday[r.subTeacherId] || 0) + 1;
      });
      const rowClasses = row.classIds || [row.classId];
      const isClassTeacher = (tid) => data.classes.some((c) => rowClasses.includes(c.id) && c.classTeacherId === tid);
      const limit = +school.maxSubsPerDay || 99;
      const out = [];
      for (const t of data.teachers) {
        if (absentAt[t.id] && absentAt[t.id].has(p)) continue;
        const own = busy[t.id] ? busy[t.id][p] : null;
        const subBusy = subAt[t.id] && subAt[t.id].has(p);
        const free = !own && !subBusy && !unavailable(t, p);
        const reasons = [];
        let s = 100;
        if (rowClasses.some((c) => teachClass.has(t.id + '|' + c))) { s += 30; reasons.push('teachesClass'); }
        if ((t.subjects || []).includes(row.subjectId)) { s += 20; reasons.push('sameSubject'); }
        if (isClassTeacher(t.id)) { s += 10; reasons.push('classTeacher'); }
        const isBusy = (q) => q >= 0 && q < P && ((busy[t.id] && busy[t.id][q] && !(absentAt[t.id] && absentAt[t.id].has(q))) || (subAt[t.id] && subAt[t.id].has(q)));
        let load = 0;
        for (let q = 0; q < P; q++) if (isBusy(q)) load++;
        s -= load * 5;
        const rec = recent[t.id] || 0;
        s -= rec * 3;
        if (isBusy(p - 1) && isBusy(p + 1)) { s -= 10; reasons.push('backToBack'); }
        const today = subsToday[t.id] || 0;
        const overLimit = today >= limit;
        if (overLimit) { s -= 200; reasons.push('overLimit'); }
        // taking this period would leave fewer free periods than the minimum
        const noFree = free && load + 1 > P - minFreeOf(t);
        if (noFree) { s -= 300; reasons.push('noFreeLeft'); }
        out.push({ teacherId: t.id, free, score: s, reasons, loadToday: load, subsToday: today, recent: rec, busyWith: own ? own.classId : (subBusy ? 'sub' : null), overLimit, noFree });
      }
      out.sort((a, b) => (b.free - a.free) || (b.score - a.score));
      return out;
    }

    function autoAssign(rows) {
      // hardest rows first (fewest free candidates)
      const order = rows.map((r, i) => i);
      const freeCount = order.map((i) => evaluate(rows, i).filter((c) => c.free && !c.overLimit && !c.noFree).length);
      order.sort((a, b) => freeCount[a] - freeCount[b] || rows[a].period - rows[b].period);
      for (const i of order) {
        if (rows[i].manual) continue;
        rows[i].subTeacherId = null;
        const cands = evaluate(rows, i).filter((c) => c.free);
        // best: within the daily limit and keeps a free period; then keeps a free period; then anyone free
        const pick = cands.find((c) => !c.overLimit && !c.noFree) || cands.find((c) => !c.noFree) || cands[0];
        rows[i].subTeacherId = pick ? pick.teacherId : null;
        rows[i].overLimit = pick ? !!(pick.overLimit || pick.noFree) : false;
      }
      return rows;
    }

    return { dayIndex: d, initialRows, evaluate, autoAssign, absentAt };
  }

  function plan(data, ds, absences) {
    const ctx = createContext(data, ds, absences);
    const rows = ctx.autoAssign(ctx.initialRows());
    return { dayIndex: ctx.dayIndex, rows, ctx };
  }

  const api = { plan, createContext, dayIndexFor, absentPeriods, addDays, parseDate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SamayamSub = api;
})(typeof self !== 'undefined' ? self : this);

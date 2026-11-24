'use strict';
// Run with: npm test
const assert = require('assert');
const P = require('../src/presets.js');
const Solver = require('../src/solver.js');
const Sub = require('../src/substitution.js');

let failed = 0;
function test(name, fn) {
  try { fn(); console.log('ok   -', name); } catch (e) { failed++; console.log('FAIL -', name, '\n      ', e.message); }
}

function checkHard(data) {
  const { list } = Solver.findClashes(data);
  assert.strictEqual(list.length, 0, 'teacher clashes: ' + list.length);
  const D = data.school.workingDays.length, Pp = data.school.periodsPerDay;
  for (const l of data.lessons) {
    let n = 0;
    for (let d = 0; d < D; d++) {
      let day = 0;
      for (let p = 0; p < Pp; p++) if (data.timetable.cells[l.classId][d][p] === l.id) { n++; day++; }
      assert.ok(day <= l.maxPerDay, 'max per day broken');
    }
    assert.strictEqual(n, l.perWeek, 'lesson count wrong');
    // a combined lesson must sit in the same periods in every member class
    for (const c of l.classIds || []) {
      for (let d = 0; d < D; d++) for (let p = 0; p < Pp; p++) {
        assert.strictEqual(data.timetable.cells[c][d][p] === l.id, data.timetable.cells[l.classId][d][p] === l.id, 'combined lesson not aligned');
      }
    }
  }
}

test('demo has combined language groups and they line up', () => {
  const data = P.demoData();
  const combined = data.lessons.filter((l) => (l.classIds || []).length > 1);
  assert.strictEqual(combined.length, 6, 'one group per standard');
  assert.ok(combined.every((l) => l.teacherIds.length === 3));
  const r = Solver.generateTimetable(Solver.buildInput(data), { seed: 9, timeLimitMs: 15000 });
  assert.strictEqual(r.unplacedCount, 0);
  data.timetable.cells = r.cells;
  checkHard(data);
});

test('absent teacher in a combined group gives one substitution row', () => {
  const data = P.demoData();
  data.timetable.cells = Solver.generateTimetable(Solver.buildInput(data), { seed: 4 }).cells;
  const urdu = data.teachers.find((t) => t.short === 'AR');
  const { rows } = Sub.plan(data, '2026-11-24', [{ teacherId: urdu.id, session: 'full' }]);
  const per = new Set(rows.map((r) => r.lessonId + '|' + r.period));
  assert.strictEqual(per.size, rows.length, 'duplicate rows');
  assert.ok(rows.every((r) => r.classIds.length === 2));
});

test('presets fill the week exactly', () => {
  for (const k of Object.keys(P.PLANS)) {
    for (const slots of [30, 35, 36, 40, 42]) {
      const s = P.scalePlan(P.PLANS[k], slots).reduce((a, p) => a + p[2], 0);
      assert.strictEqual(s, slots, `${k} @ ${slots}`);
    }
  }
});

test('demo school generates a full clash-free timetable', () => {
  const data = P.demoData();
  const input = Solver.buildInput(data);
  const r = Solver.generateTimetable(input, { seed: 7, timeLimitMs: 15000 });
  console.log(`       ${data.classes.length} classes, ${data.teachers.length} teachers, ${r.attempts} attempts, ${r.ms} ms, unplaced ${r.unplacedCount}, penalty ${r.penalty}`);
  assert.strictEqual(r.unplacedCount, 0);
  data.timetable.cells = r.cells;
  checkHard(data);
});

test('higher secondary + LP school (6 days, 6 periods) generates', () => {
  const data = P.emptyData();
  data.school = Object.assign(P.defaultSchool(), { name: 'HSS', levels: ['LP', 'HSS'], workingDays: [1, 2, 3, 4, 5, 6], periodsPerDay: 6, lunchAfter: 3 });
  for (const std of ['1', '2', '3', '4']) {
    const c = { id: P.uid('c'), name: std + 'A', level: 'LP', std, stream: null };
    data.classes.push(c); P.applyPlanToClass(data, c);
  }
  for (const std of ['+1', '+2']) for (const st of ['science', 'commerce', 'humanities']) {
    const c = { id: P.uid('c'), name: P.className(std, 0, 'HSS', st), level: 'HSS', std, stream: st };
    data.classes.push(c); P.applyPlanToClass(data, c);
  }
  const demand = {};
  data.lessons.forEach((l) => (demand[l.subjectId] = (demand[l.subjectId] || 0) + l.perWeek));
  for (const s of data.subjects) {
    for (let i = 0; i < Math.ceil(demand[s.id] / 25); i++) data.teachers.push({ id: P.uid('t'), name: s.short + i, short: s.short + i, subjects: [s.id], maxPerWeek: 30, maxPerDay: 6, unavailable: [] });
  }
  P.autoAssign(data);
  assert.ok(data.lessons.every((l) => l.teacherIds.length));
  const r = Solver.generateTimetable(Solver.buildInput(data), { seed: 3, timeLimitMs: 15000 });
  console.log(`       ${data.classes.length} classes (${data.classes.map((c) => c.name).join(', ')}), unplaced ${r.unplacedCount}`);
  assert.strictEqual(r.unplacedCount, 0);
  data.timetable.cells = r.cells;
  checkHard(data);
});

test('locked cells stay in place', () => {
  const data = P.demoData();
  const c = data.classes[0];
  const l = data.lessons.find((x) => x.classId === c.id);
  data.timetable.cells = { [c.id]: [[l.id]] };
  data.timetable.locked = { [c.id + '|0|0']: true };
  const r = Solver.generateTimetable(Solver.buildInput(data), { seed: 11 });
  assert.strictEqual(r.cells[c.id][0][0], l.id);
});

test('substitutions: every absent period covered by a free teacher', () => {
  const data = P.demoData();
  data.timetable.cells = Solver.generateTimetable(Solver.buildInput(data), { seed: 5 }).cells;
  const abs = data.teachers.slice(0, 3).map((t, i) => ({ teacherId: t.id, session: i === 2 ? 'am' : 'full', note: '' }));
  const ds = '2026-11-24'; // a Tuesday
  const { rows, ctx } = Sub.plan(data, ds, abs);
  assert.ok(rows.length > 0, 'no rows');
  const d = ctx.dayIndex;
  const seen = new Set();
  for (const r of rows) {
    assert.ok(r.subTeacherId, 'uncovered row');
    assert.ok(!abs.some((a) => a.teacherId === r.subTeacherId && Sub.absentPeriods(a, data.school).includes(r.period)), 'absent teacher used');
    const key = r.subTeacherId + '|' + r.period;
    assert.ok(!seen.has(key), 'teacher double booked');
    seen.add(key);
    const own = data.classes.some((c) => {
      const lid = data.timetable.cells[c.id][d][r.period];
      const l = data.lessons.find((x) => x.id === lid);
      return l && l.teacherIds.includes(r.subTeacherId);
    });
    assert.ok(!own, 'substitute has own class then');
  }
  console.log(`       ${rows.length} periods covered`);
});

test('half-day leave only covers afternoon', () => {
  const school = P.defaultSchool();
  assert.deepStrictEqual(Sub.absentPeriods({ session: 'pm' }, school), [4, 5, 6]);
  assert.deepStrictEqual(Sub.absentPeriods({ session: 'am' }, school), [0, 1, 2, 3]);
});

test('every teacher keeps at least one free period each day', () => {
  const data = P.demoData();
  const r = Solver.generateTimetable(Solver.buildInput(data), { seed: 21 });
  assert.strictEqual(r.unplacedCount, 0);
  data.timetable.cells = r.cells;
  const Pp = data.school.periodsPerDay;
  for (const t of data.teachers) for (let d = 0; d < 5; d++) {
    let n = 0;
    for (let p = 0; p < Pp; p++) if (data.classes.some((c) => { const l = data.lessons.find((x) => x.id === r.cells[c.id][d][p]); return l && l.teacherIds.includes(t.id); })) n++;
    assert.ok(n <= Pp - 1, `${t.name} has no free period on day ${d}`);
  }
});

test('special days: a Saturday can follow Monday, a weekday can be a holiday', () => {
  const s = P.defaultSchool();
  const sp = { '2026-11-28': { type: 'follow', follow: 0 }, '2026-11-25': { type: 'holiday' } };
  assert.strictEqual(Sub.dayIndexFor(s, '2026-11-28', sp), 0);
  assert.strictEqual(Sub.dayIndexFor(s, '2026-11-25', sp), -1);
  assert.strictEqual(Sub.dayIndexFor(s, '2026-11-26', sp), 3);
});

test('school with Friday and Sunday holiday: Saturday has classes, Friday has none', () => {
  const data = P.demoData();
  data.school.workingDays = [1, 2, 3, 4, 6];
  const r = Solver.generateTimetable(Solver.buildInput(data), { seed: 13 });
  assert.strictEqual(r.unplacedCount, 0);
  data.timetable.cells = r.cells;
  checkHard(data);
  assert.strictEqual(Sub.dayIndexFor(data.school, '2026-11-27'), -1, 'Friday must be a holiday');
  assert.strictEqual(Sub.dayIndexFor(data.school, '2026-11-28'), 4, 'Saturday uses the 5th timetable day');
  const { rows } = Sub.plan(data, '2026-11-28', [{ teacherId: data.teachers[0].id, session: 'full' }]);
  assert.ok(rows.length > 0 && rows.every((x) => x.subTeacherId), 'Saturday leave gets substitutes');
  assert.strictEqual(Sub.plan(data, '2026-11-27', [{ teacherId: data.teachers[0].id, session: 'full' }]).rows.length, 0);
});

test('built-in guides: every contents link points to a real heading', () => {
  const MD = require('../src/md.js');
  const fs = require('fs');
  const path = require('path');
  for (const f of ['USER_GUIDE.md', 'USER_GUIDE_EN.md']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'docs', f), 'utf8');
    const ids = new Set(MD.render(src).headings.map((h) => h.id));
    const missing = [...src.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]).filter((a) => !ids.has(a));
    assert.deepStrictEqual(missing, [], f + ' has broken links');
  }
});

test('sunday is not a working day', () => {
  assert.strictEqual(Sub.dayIndexFor(P.defaultSchool(), '2026-11-22'), -1);
});

console.log(failed ? `\n${failed} test(s) failed` : '\nAll tests passed');
process.exit(failed ? 1 : 0);

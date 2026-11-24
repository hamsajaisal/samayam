/* Samayam - school levels, Kerala-style subject plans and demo data.
 *
 * IMPORTANT: The periods-per-week numbers below are EDITABLE STARTING POINTS
 * so that a new school gets a complete week at once. They are NOT copied from
 * a government order. Check them against the current Kerala Education Rules /
 * SCERT / DGE (DHSE for HSS) orders and correct them in "Classes & Subjects".
 */
(function (root) {
  'use strict';

  const LEVELS = {
    LP: { label: 'Lower Primary (LP)', standards: ['1', '2', '3', '4'] },
    UP: { label: 'Upper Primary (UP)', standards: ['5', '6', '7'] },
    HS: { label: 'High School (HS)', standards: ['8', '9', '10'] },
    HSS: { label: 'Higher Secondary (HSS)', standards: ['+1', '+2'] }
  };

  const STREAMS = {
    science: { label: 'Science', code: 'S' },
    commerce: { label: 'Commerce', code: 'C' },
    humanities: { label: 'Humanities', code: 'H' }
  };

  // [subject name, short code, periods per week in a 35-period week]
  const PLANS = {
    LP: [
      ['Malayalam', 'MAL', 8], ['English', 'ENG', 6], ['Mathematics', 'MAT', 7],
      ['Environmental Studies', 'EVS', 6], ['Arts Education', 'ART', 2],
      ['Work Experience', 'WE', 2], ['Health & Physical Education', 'PE', 2],
      ['Library / Activity', 'LIB', 2]
    ],
    UP: [
      ['Malayalam I', 'MAL1', 4], ['Malayalam II / Arabic / Sanskrit', 'SL', 3],
      ['English', 'ENG', 5], ['Hindi', 'HIN', 3], ['Mathematics', 'MAT', 5],
      ['Basic Science', 'BSC', 5], ['Social Science', 'SS', 4],
      ['Information Technology', 'IT', 1], ['Arts Education', 'ART', 1],
      ['Work Experience', 'WE', 1], ['Health & Physical Education', 'PE', 2],
      ['Library / Activity', 'LIB', 1]
    ],
    HS: [
      ['Malayalam I', 'MAL1', 3], ['Malayalam II / Arabic / Sanskrit', 'SL', 2],
      ['English', 'ENG', 5], ['Hindi', 'HIN', 3], ['Mathematics', 'MAT', 5],
      ['Physics', 'PHY', 3], ['Chemistry', 'CHE', 3], ['Biology', 'BIO', 3],
      ['Social Science', 'SS', 5], ['Information Technology', 'IT', 2],
      ['Health & Physical Education', 'PE', 1]
    ],
    HSS_science: [
      ['English', 'ENG', 5], ['Second Language', 'SL2', 4], ['Physics', 'PHY', 6],
      ['Chemistry', 'CHE', 6], ['Biology / Computer Science', 'BIOCS', 6],
      ['Mathematics', 'MAT', 6], ['Activity / GK', 'ACT', 2]
    ],
    HSS_commerce: [
      ['English', 'ENG', 5], ['Second Language', 'SL2', 4], ['Business Studies', 'BST', 6],
      ['Accountancy', 'ACC', 6], ['Economics', 'ECO', 6],
      ['Computer Applications / Mathematics', 'CA', 6], ['Activity / GK', 'ACT', 2]
    ],
    HSS_humanities: [
      ['English', 'ENG', 5], ['Second Language', 'SL2', 4], ['History', 'HIS', 6],
      ['Economics', 'ECO', 6], ['Political Science', 'POL', 6],
      ['Sociology / Geography', 'SOC', 6], ['Activity / GK', 'ACT', 2]
    ]
  };

  function planFor(level, stream) {
    if (level === 'HSS') return PLANS['HSS_' + (stream || 'science')] || PLANS.HSS_science;
    return PLANS[level] || PLANS.UP;
  }

  // Scale a 35-period plan to the school's real number of weekly slots.
  function scalePlan(plan, slots) {
    const total = plan.reduce((s, p) => s + p[2], 0);
    const out = plan.map((p) => [p[0], p[1], Math.max(1, Math.round((p[2] * slots) / total))]);
    let diff = slots - out.reduce((s, p) => s + p[2], 0);
    // fix rounding on the biggest subjects first
    const order = out.map((p, i) => i).sort((a, b) => out[b][2] - out[a][2]);
    let k = 0;
    while (diff !== 0 && k < 1000) {
      const i = order[k % order.length];
      if (diff > 0) { out[i][2]++; diff--; } else if (out[i][2] > 1) { out[i][2]--; diff++; }
      k++;
    }
    return out;
  }

  function defaultMaxPerDay(perWeek, days) {
    if (perWeek <= 3) return 1;
    return Math.ceil(perWeek / days) + 1;
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 10);
  }

  function initials(name) {
    const parts = String(name).replace(/[^A-Za-zഀ-ൿ ]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'T';
    if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
    return parts.map((p) => p[0]).join('').slice(0, 3).toUpperCase();
  }

  function defaultSchool() {
    return {
      name: '',
      place: '',
      levels: ['UP'],
      workingDays: [1, 2, 3, 4, 5],
      periodsPerDay: 7,
      lunchAfter: 4,
      periodTimes: [
        { start: '09:30', end: '10:15' }, { start: '10:15', end: '11:00' },
        { start: '11:15', end: '12:00' }, { start: '12:00', end: '12:45' },
        { start: '13:45', end: '14:30' }, { start: '14:30', end: '15:15' },
        { start: '15:15', end: '16:00' }
      ],
      maxSubsPerDay: 2,
      minFreePerDay: 1,
      fairnessDays: 30,
      defaultMaxWeek: 25,
      seniorMaxWeek: 0
    };
  }

  function emptyData() {
    return {
      version: 1,
      school: null,
      subjects: [],
      teachers: [],
      classes: [],
      lessons: [],
      timetable: { cells: {}, locked: {}, generatedAt: null },
      versions: [],
      leaves: [],
      substitutions: {},
      specialDays: {},
      settings: { lang: 'en', theme: 'system', fontScale: 100 }
    };
  }

  const HUES = [210, 0, 130, 35, 275, 180, 330, 60, 250, 15, 160, 300, 95, 195, 345, 50];

  function ensureSubject(data, name, short) {
    let s = data.subjects.find((x) => x.name.toLowerCase() === String(name).toLowerCase());
    if (!s) {
      s = { id: uid('s'), name: String(name), short: String(short || initials(name)).toUpperCase(), hue: HUES[data.subjects.length % HUES.length] };
      data.subjects.push(s);
    }
    return s;
  }

  // Adds the preset subjects of a class as lessons (without teachers).
  function applyPlanToClass(data, cls) {
    const days = data.school.workingDays.length;
    const slots = days * data.school.periodsPerDay;
    const plan = scalePlan(planFor(cls.level, cls.stream), slots);
    for (const [name, short, pw] of plan) {
      const s = ensureSubject(data, name, short);
      if (data.lessons.some((l) => (l.classIds || [l.classId]).includes(cls.id) && l.subjectId === s.id)) continue;
      data.lessons.push({ id: uid('l'), classId: cls.id, subjectId: s.id, teacherIds: [], perWeek: pw, maxPerDay: defaultMaxPerDay(pw, days) });
    }
  }

  function className(std, idx, level, stream) {
    if (level === 'HSS') return `${std} ${STREAMS[stream].code}${idx + 1}`;
    return `${std}${String.fromCharCode(65 + idx)}`;
  }

  function teacherLoad(data, teacherId) {
    return data.lessons.reduce((s, l) => s + ((l.teacherIds || []).includes(teacherId) ? +l.perWeek || 0 : 0), 0);
  }

  // Give every lesson without a teacher the least-loaded qualified teacher.
  function autoAssign(data) {
    let assigned = 0, missing = 0;
    const load = {};
    data.teachers.forEach((t) => (load[t.id] = teacherLoad(data, t.id)));
    const lessons = data.lessons.filter((l) => !(l.teacherIds || []).filter(Boolean).length)
      .sort((a, b) => b.perWeek - a.perWeek);
    for (const l of lessons) {
      const cls = data.classes.find((c) => c.id === l.classId);
      const qualified = data.teachers.filter((t) => (t.subjects || []).includes(l.subjectId));
      if (!qualified.length) { missing++; continue; }
      const cap = (t) => (+t.maxPerWeek || 30) - load[t.id];
      let pick = null;
      const ct = cls && qualified.find((t) => t.id === cls.classTeacherId);
      if (ct && cap(ct) >= l.perWeek) pick = ct;
      if (!pick) {
        // prefer a teacher who already teaches this class, then the least loaded
        const sorted = qualified.slice().sort((a, b) => {
          const fa = cap(a) >= l.perWeek ? 0 : 1, fb = cap(b) >= l.perWeek ? 0 : 1;
          if (fa !== fb) return fa - fb;
          const ia = data.lessons.some((x) => x.classId === l.classId && (x.teacherIds || []).includes(a.id)) ? 0 : 1;
          const ib = data.lessons.some((x) => x.classId === l.classId && (x.teacherIds || []).includes(b.id)) ? 0 : 1;
          if (ia !== ib && fa === 0) return ia - ib;
          return load[a.id] / (+a.maxPerWeek || 30) - load[b.id] / (+b.maxPerWeek || 30);
        });
        pick = sorted[0];
      }
      l.teacherIds = [pick.id];
      load[pick.id] += l.perWeek;
      assigned++;
    }
    return { assigned, missing };
  }

  const lessonClassIds = (l) => (l.classIds && l.classIds.length ? l.classIds : [l.classId]);

  // Create a combined lesson: several classes have this period at the same
  // time, taught by several teachers (e.g. Malayalam / Arabic / Urdu groups).
  // replace: remove the separate lesson of the same subject from those classes.
  function combineLessons(data, o) {
    const cids = [...new Set(o.classIds)];
    if (o.replace) {
      const gone = new Set();
      data.lessons = data.lessons.filter((l) => {
        if (l.subjectId === o.subjectId && lessonClassIds(l).length === 1 && cids.includes(l.classId)) { gone.add(l.id); return false; }
        return true;
      });
      const cells = (data.timetable && data.timetable.cells) || {};
      for (const c of cids) (cells[c] || []).forEach((row) => row.forEach((v, i) => gone.has(v) && (row[i] = null)));
    }
    const l = { id: uid('l'), classId: cids[0], classIds: cids, subjectId: o.subjectId, teacherIds: [...new Set(o.teacherIds)], perWeek: +o.perWeek || 1, maxPerDay: +o.maxPerDay || 1 };
    data.lessons.push(l);
    return l;
  }

  const DEMO_NAMES = ['Sreeja K', 'Anil Kumar P', 'Bindu Mol', 'Rajesh M', 'Sajitha V', 'Fathima Beevi', 'Joseph Thomas',
    'Deepa Nair', 'Haris C', 'Lekha R', 'Manoj Kumar', 'Nisha Jose', 'Prakash T', 'Rekha S', 'Shibu Varghese', 'Suma Devi',
    'Vinod K', 'Jaseela P', 'Ramesh Babu', 'Asha Latha', 'Biju George', 'Divya Mohan', 'Gopakumar N', 'Hima Krishna',
    'Jayan P', 'Kavitha S', 'Latha Kumari', 'Muhammed Ali', 'Nandini A', 'Pradeep Kumar', 'Remya R', 'Sunil Dev'];

  function demoData() {
    const data = emptyData();
    data.school = Object.assign(defaultSchool(), { name: 'Govt. Model School (Demo)', place: 'Thiruvananthapuram', levels: ['UP', 'HS'] });
    for (const lv of ['UP', 'HS']) {
      for (const std of LEVELS[lv].standards) {
        for (let i = 0; i < 2; i++) {
          const c = { id: uid('c'), name: className(std, i, lv), level: lv, std, stream: null, classTeacherId: null };
          data.classes.push(c);
          applyPlanToClass(data, c);
        }
      }
    }
    // Create enough teachers for each subject (about 26 periods each).
    const demand = {};
    data.lessons.forEach((l) => (demand[l.subjectId] = (demand[l.subjectId] || 0) + l.perWeek));
    let n = 0;
    for (const s of data.subjects) {
      const count = Math.max(1, Math.ceil(demand[s.id] / 24));
      for (let i = 0; i < count; i++) {
        const name = DEMO_NAMES[n % DEMO_NAMES.length] + (n >= DEMO_NAMES.length ? ' ' + (Math.floor(n / DEMO_NAMES.length) + 1) : '');
        n++;
        data.teachers.push({ id: uid('t'), name, short: initials(name), phone: '', subjects: [s.id], maxPerWeek: 25, maxPerDay: 7, senior: false, unavailable: [] });
      }
    }
    // Language periods: the divisions of a standard meet together and split
    // into Malayalam II / Arabic / Urdu groups, each with its own teacher.
    const sl = data.subjects.find((s) => s.short === 'SL');
    if (sl) {
      const slT = data.teachers.filter((t) => t.subjects.includes(sl.id));
      const extra = { id: uid('t'), name: 'Abdul Rasheed (Urdu)', short: 'AR', phone: '', subjects: [sl.id], maxPerWeek: 25, maxPerDay: 7, senior: false, unavailable: [] };
      data.teachers.push(extra);
      const tids = slT.slice(0, 2).map((t) => t.id).concat(extra.id);
      for (const lv of ['UP', 'HS']) for (const std of LEVELS[lv].standards) {
        const cids = data.classes.filter((c) => c.std === std).map((c) => c.id);
        const l0 = data.lessons.find((l) => l.classId === cids[0] && l.subjectId === sl.id);
        combineLessons(data, { subjectId: sl.id, classIds: cids, teacherIds: tids, perWeek: l0.perWeek, maxPerDay: l0.maxPerDay, replace: true });
      }
    }
    autoAssign(data);
    data.classes.forEach((c) => {
      const counts = {};
      data.lessons.filter((l) => l.classId === c.id && lessonClassIds(l).length === 1).forEach((l) => (l.teacherIds || []).forEach((t) => (counts[t] = (counts[t] || 0) + l.perWeek)));
      const used = new Set(data.classes.map((x) => x.classTeacherId).filter(Boolean));
      const best = Object.keys(counts).filter((t) => !used.has(t)).sort((a, b) => counts[b] - counts[a])[0];
      c.classTeacherId = best || null;
    });
    return data;
  }

  const api = { LEVELS, STREAMS, PLANS, planFor, scalePlan, defaultMaxPerDay, uid, initials, defaultSchool, emptyData, ensureSubject, applyPlanToClass, className, teacherLoad, autoAssign, demoData, combineLessons, lessonClassIds };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SamayamPresets = api;
})(typeof self !== 'undefined' ? self : this);

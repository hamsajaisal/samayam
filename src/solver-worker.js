/* Runs the timetable generator off the UI thread so the app stays responsive. */
/* global SamayamSolver */
importScripts('solver.js');
self.onmessage = function (e) {
  try {
    const result = SamayamSolver.generateTimetable(e.data.input, e.data.opts);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err && err.stack || err) });
  }
};

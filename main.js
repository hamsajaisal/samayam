'use strict';
// Samayam - main (Electron) process: window, file storage, PDF, Excel, sharing.
const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const SMOKE = process.argv.includes('--smoke');
let win = null;

const dataFile = () => path.join(app.getPath('userData'), 'samayam-data.json');

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 860,
    minHeight: 560,
    title: 'Samayam',
    backgroundColor: '#f5f6fa',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => {
    if (!SMOKE) win.maximize();
    else win.setSize(1400, 900);
    win.show();
  });
  // Open external links in the user's browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  // Developer tools on F12 / Ctrl+Shift+I, reload on Ctrl+R.
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) win.webContents.toggleDevTools();
  });

  if (SMOKE) runSmoke();
}

function runSmoke() {
  const errors = [];
  win.webContents.on('console-message', (_e, level, message, line, source) => {
    if (level >= 2) errors.push(`${message} (${source}:${line})`);
  });
  win.webContents.on('did-finish-load', async () => {
    try {
      const result = await win.webContents.executeJavaScript('window.__smoke ? window.__smoke() : "no smoke hook"');
      console.log('SMOKE RESULT:', JSON.stringify(result, null, 2));
    } catch (err) {
      errors.push(String(err));
    }
    const shotArg = process.argv.find((a) => a.startsWith('--shots='));
    if (shotArg) {
      const dir = shotArg.slice(8);
      fs.mkdirSync(dir, { recursive: true });
      await win.webContents.executeJavaScript('D.settings.lang="en"; applySettings(); 1');
      for (const v of ['dashboard', 'timetable', 'substitution', 'now', 'allocation', 'reports', 'guide']) {
        await win.webContents.executeJavaScript(`setView(${JSON.stringify(v)}); 1`);
        await new Promise((r) => setTimeout(r, 400));
        const img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(dir, v + '.png'), img.toPNG());
      }
      await win.webContents.executeJavaScript('D.settings.theme="dark"; applySettings(); setView("timetable"); 1');
      await new Promise((r) => setTimeout(r, 400));
      fs.writeFileSync(path.join(dir, 'timetable-dark.png'), (await win.webContents.capturePage()).toPNG());
    }
    console.log(errors.length ? 'SMOKE ERRORS:\n' + errors.join('\n') : 'SMOKE: no console errors');
    app.exit(errors.length ? 1 : 0);
  });
}

// ---------- storage ----------
ipcMain.handle('data:load', async () => {
  const file = SMOKE ? path.join(os.tmpdir(), 'samayam-smoke.json') : dataFile();
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
});

ipcMain.handle('data:save', async (_e, json) => {
  if (SMOKE) return true;
  const file = dataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, json, 'utf8');
  if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak');
  fs.renameSync(tmp, file);
  return true;
});

ipcMain.handle('app:info', async () => ({
  version: app.getVersion(),
  dataFile: dataFile()
}));

ipcMain.handle('app:openDataFolder', async () => shell.openPath(path.dirname(dataFile())));

// The user guides ship inside the app, so they work without internet.
ipcMain.handle('guide:read', async (_e, lang) => {
  const name = lang === 'ml' ? 'USER_GUIDE.md' : 'USER_GUIDE_EN.md';
  return fs.readFileSync(path.join(__dirname, 'docs', name), 'utf8');
});

// ---------- sharing ----------
ipcMain.handle('clip:write', async (_e, text) => {
  clipboard.writeText(String(text));
  return true;
});

ipcMain.handle('share:whatsapp', async (_e, text) => {
  const enc = encodeURIComponent(String(text));
  try {
    await shell.openExternal('whatsapp://send?text=' + enc);
    return 'app';
  } catch {
    await shell.openExternal('https://web.whatsapp.com/send?text=' + enc);
    return 'web';
  }
});

ipcMain.handle('open:url', async (_e, url) => {
  if (/^https:\/\/(github\.com|wa\.me|web\.whatsapp\.com)\//.test(url)) await shell.openExternal(url);
});

// ---------- PDF ----------
ipcMain.handle('pdf:save', async (_e, { html, fileName, landscape }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save PDF',
    defaultPath: path.join(app.getPath('documents'), fileName || 'Samayam.pdf'),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) return null;
  const tmpHtml = path.join(os.tmpdir(), `samayam-print-${Date.now()}.html`);
  fs.writeFileSync(tmpHtml, html, 'utf8');
  const pw = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
  try {
    await pw.loadFile(tmpHtml);
    const pdf = await pw.webContents.printToPDF({
      pageSize: 'A4',
      landscape: !!landscape,
      printBackground: true,
      margins: { marginType: 'custom', top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
    });
    fs.writeFileSync(filePath, pdf);
  } finally {
    pw.destroy();
    fs.rmSync(tmpHtml, { force: true });
  }
  const { response } = await dialog.showMessageBox(win, {
    type: 'info',
    buttons: ['Open PDF', 'Close'],
    defaultId: 0,
    cancelId: 1,
    title: 'PDF saved',
    message: 'PDF saved:\n' + filePath
  });
  if (response === 0) shell.openPath(filePath);
  return filePath;
});

// ---------- Excel ----------
function safeSheetName(name, used) {
  let n = String(name || 'Sheet').replace(/[\[\]:*?/\\]/g, '-').slice(0, 31) || 'Sheet';
  let base = n, i = 2;
  while (used.has(n.toLowerCase())) n = (base.slice(0, 28) + ' ' + i++);
  used.add(n.toLowerCase());
  return n;
}

ipcMain.handle('excel:export', async (_e, { fileName, sheets }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save Excel file',
    defaultPath: path.join(app.getPath('documents'), fileName || 'Samayam.xlsx'),
    filters: [{ name: 'Excel workbook', extensions: ['xlsx'] }]
  });
  if (canceled || !filePath) return null;
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Samayam';
  const used = new Set();
  for (const sh of sheets) {
    const ws = wb.addWorksheet(safeSheetName(sh.name, used));
    (sh.rows || []).forEach((r) => ws.addRow(r));
    const cols = Math.max(1, ...(sh.rows || [[]]).map((r) => r.length));
    for (let c = 1; c <= cols; c++) ws.getColumn(c).width = c === 1 ? (sh.firstColWidth || 16) : (sh.colWidth || 20);
    ws.eachRow((row, rn) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { wrapText: true, vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (rn === 1 && sh.header !== false) {
          cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F5' } };
        }
      });
    });
    if (sh.header !== false) ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }];
  }
  await wb.xlsx.writeFile(filePath);
  return filePath;
});

ipcMain.handle('excel:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Choose an Excel or CSV file',
    properties: ['openFile'],
    filters: [{ name: 'Excel or CSV', extensions: ['xlsx', 'csv'] }]
  });
  if (canceled || !filePaths[0]) return null;
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  const file = filePaths[0];
  if (/\.csv$/i.test(file)) await wb.csv.readFile(file);
  else await wb.xlsx.readFile(file);
  const out = [];
  wb.eachSheet((ws) => {
    const rows = [];
    const cc = ws.columnCount;
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const vals = [];
      for (let c = 1; c <= cc; c++) vals.push(String(row.getCell(c).text || '').trim());
      rows.push(vals);
    }
    out.push({ name: /\.csv$/i.test(file) ? path.basename(file, path.extname(file)) : ws.name, rows });
  });
  return { file: path.basename(file), sheets: out };
});

// ---------- backup ----------
ipcMain.handle('backup:export', async (_e, { json, fileName }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save backup',
    defaultPath: path.join(app.getPath('documents'), fileName),
    filters: [{ name: 'Samayam backup', extensions: ['json'] }]
  });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, json, 'utf8');
  return filePath;
});

ipcMain.handle('backup:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Choose a Samayam backup',
    properties: ['openFile'],
    filters: [{ name: 'Samayam backup', extensions: ['json'] }]
  });
  if (canceled || !filePaths[0]) return null;
  return fs.readFileSync(filePaths[0], 'utf8');
});

// ---------- updates (from GitHub releases) ----------
// Installed copy (Setup): electron-updater downloads the new installer and
// installs it silently on restart. Portable copy: it cannot replace itself
// while running, so the new Portable .exe is downloaded next to it.
const REPO = { owner: 'hamsajaisal', repo: 'samayam' };
const UA = { 'User-Agent': 'Samayam-updater', Accept: 'application/vnd.github+json' };

function appKind() {
  if (process.env.PORTABLE_EXECUTABLE_FILE) return 'portable';
  return app.isPackaged ? 'installed' : 'dev';
}
function isNewer(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}
let updater = null;
function getUpdater() {
  if (!updater) {
    updater = require('electron-updater').autoUpdater;
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.logger = null;
  }
  return updater;
}
async function latestRelease() {
  const res = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/releases/latest`, { headers: UA });
  if (!res.ok) throw new Error('GitHub answered ' + res.status);
  const j = await res.json();
  return {
    version: String(j.tag_name || '').replace(/^v/, ''),
    notes: String(j.body || ''),
    url: j.html_url,
    portable: (j.assets || []).find((a) => /Portable.*\.exe$/i.test(a.name)) || null
  };
}
let latest = null;
async function checkUpdate() {
  const kind = appKind();
  latest = await latestRelease();
  const available = isNewer(latest.version, app.getVersion());
  let canInstall = false;
  if (available && kind === 'installed') {
    try {
      const r = await getUpdater().checkForUpdates();
      canInstall = !!(r && r.updateInfo && isNewer(r.updateInfo.version, app.getVersion()));
    } catch { canInstall = false; } // e.g. the release has no latest.yml: offer the download page instead
  }
  if (available && kind === 'portable') canInstall = !!latest.portable;
  return { kind, current: app.getVersion(), available, version: latest.version, notes: latest.notes.slice(0, 2000), url: latest.url, canInstall };
}
async function downloadTo(url, dest, size, onPct) {
  const res = await fetch(url, { headers: { 'User-Agent': UA['User-Agent'] } });
  if (!res.ok || !res.body) throw new Error('Download failed: ' + res.status);
  const total = size || +res.headers.get('content-length') || 0;
  const tmp = dest + '.part';
  const out = fs.createWriteStream(tmp);
  let got = 0, last = -1;
  for await (const chunk of res.body) {
    if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
    got += chunk.length;
    const pct = total ? Math.floor((got * 100) / total) : 0;
    if (pct !== last) { last = pct; onPct(pct); }
  }
  await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
  fs.renameSync(tmp, dest);
}
async function downloadUpdate(onPct) {
  const kind = appKind();
  if (kind === 'installed') {
    const u = getUpdater();
    const listener = (p) => onPct(Math.floor(p.percent));
    u.on('download-progress', listener);
    try { await u.downloadUpdate(); } finally { u.removeListener('download-progress', listener); }
    return { ready: true };
  }
  if (kind === 'portable' && latest && latest.portable) {
    const dir = process.env.PORTABLE_EXECUTABLE_DIR || app.getPath('downloads');
    const dest = path.join(dir, latest.portable.name);
    await downloadTo(latest.portable.browser_download_url, dest, latest.portable.size, onPct);
    return { path: dest };
  }
  throw new Error('No update to download');
}

ipcMain.handle('upd:info', async () => ({ version: app.getVersion(), kind: appKind(), noAutoCheck: SMOKE }));
ipcMain.handle('upd:check', async () => {
  try { return await checkUpdate(); } catch (e) { return { error: String((e && e.message) || e) }; }
});
ipcMain.handle('upd:download', async () => {
  try {
    return await downloadUpdate((p) => win && !win.isDestroyed() && win.webContents.send('upd:progress', p));
  } catch (e) { return { error: String((e && e.message) || e) }; }
});
ipcMain.handle('upd:install', async () => {
  // silent install, then start Samayam again; the data folder is not touched
  setImmediate(() => getUpdater().quitAndInstall(true, true));
  return true;
});
ipcMain.handle('upd:showFile', async (_e, p) => { if (p && fs.existsSync(p)) shell.showItemInFolder(p); });

// `Samayam.exe --update-selftest [--as-portable=<dir>]`: checks GitHub and
// downloads (never installs), printing what happens. Used to test updates.
async function updateSelfTest() {
  const portableArg = process.argv.find((a) => a.startsWith('--as-portable='));
  if (portableArg) { process.env.PORTABLE_EXECUTABLE_DIR = portableArg.slice(14); process.env.PORTABLE_EXECUTABLE_FILE = path.join(portableArg.slice(14), 'Samayam-Portable-test.exe'); }
  const log = (...a) => console.log('UPDATE-SELFTEST:', ...a);
  try {
    const r = await checkUpdate();
    log(JSON.stringify({ ...r, notes: r.notes.slice(0, 60) + '…' }));
    if (r.available && r.canInstall) {
      const marks = new Set();
      const res = await downloadUpdate((p) => { const m = Math.floor(p / 25) * 25; if (!marks.has(m)) { marks.add(m); log('progress', m + '%'); } });
      log('download result', JSON.stringify(res));
      if (res.path) log('file size', fs.statSync(res.path).size);
      // --and-install: exactly what "Restart and install now" does
      if (res.ready && process.argv.includes('--and-install')) { log('installing'); getUpdater().quitAndInstall(true, true); return; }
    }
  } catch (e) { log('ERROR', e && e.stack || e); }
  app.exit(0);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  if (process.argv.includes('--update-selftest')) { updateSelfTest(); return; }
  createWindow();
});
app.on('window-all-closed', () => app.quit());

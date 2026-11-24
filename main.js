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

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});
app.on('window-all-closed', () => app.quit());

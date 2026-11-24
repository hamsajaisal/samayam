// Renders build/icon.png (512x512) for the installer. Run: npx electron scripts/make-icon.js
'use strict';
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const html = `<!doctype html><html><body style="margin:0;width:512px;height:512px;overflow:hidden;background:transparent">
<div style="width:512px;height:512px;border-radius:112px;background:linear-gradient(135deg,#1f5fbf,#17233b);display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:'Segoe UI','Nirmala UI',sans-serif">
  <div style="font-size:250px;line-height:1">⏰</div>
  <div style="color:#fff;font-size:92px;font-weight:700;margin-top:6px">സമയം</div>
</div></body></html>`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 512, height: 512, show: false, frame: false, transparent: true, useContentSize: true });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 500));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
  const out = path.join(__dirname, '..', 'build', 'icon.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, img.resize({ width: 512, height: 512 }).toPNG());
  console.log('wrote', out);
  app.quit();
});

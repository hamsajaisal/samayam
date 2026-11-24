'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (json) => ipcRenderer.invoke('data:save', json),
  info: () => ipcRenderer.invoke('app:info'),
  openDataFolder: () => ipcRenderer.invoke('app:openDataFolder'),
  readGuide: (lang) => ipcRenderer.invoke('guide:read', lang),
  updInfo: () => ipcRenderer.invoke('upd:info'),
  updCheck: () => ipcRenderer.invoke('upd:check'),
  updDownload: () => ipcRenderer.invoke('upd:download'),
  updInstall: () => ipcRenderer.invoke('upd:install'),
  updShowFile: (p) => ipcRenderer.invoke('upd:showFile', p),
  onUpdProgress: (cb) => ipcRenderer.on('upd:progress', (_e, p) => cb(p)),
  copyText: (text) => ipcRenderer.invoke('clip:write', text),
  shareWhatsApp: (text) => ipcRenderer.invoke('share:whatsapp', text),
  openUrl: (url) => ipcRenderer.invoke('open:url', url),
  savePdf: (opts) => ipcRenderer.invoke('pdf:save', opts),
  exportExcel: (opts) => ipcRenderer.invoke('excel:export', opts),
  importExcel: () => ipcRenderer.invoke('excel:import'),
  exportBackup: (opts) => ipcRenderer.invoke('backup:export', opts),
  importBackup: () => ipcRenderer.invoke('backup:import')
});

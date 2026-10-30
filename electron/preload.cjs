const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lifeOsSecureStorage', {
  encrypt: (value) => ipcRenderer.invoke('lifeos:encrypt-ai-key', value),
  decrypt: (value) => ipcRenderer.invoke('lifeos:decrypt-ai-key', value),
});

contextBridge.exposeInMainWorld('lifeOsActivity', {
  status: () => ipcRenderer.invoke('lifeos:activity-status'),
  setAllowed: allowed => ipcRenderer.invoke('lifeos:activity-set', allowed),
  data: (date, range) => ipcRenderer.invoke('lifeos:activity-data', { date, range }),
});

contextBridge.exposeInMainWorld('lifeOsDuckies', {
  getSettings: () => ipcRenderer.invoke('lifeos:duckies-settings'),
  setSettings: settings => ipcRenderer.invoke('lifeos:duckies-set-settings', settings),
  resize: (height, width) => ipcRenderer.send('lifeos:duckies-resize', { height, width }),
  setShape: rect => ipcRenderer.send('lifeos:duckies-shape', rect),
  showNotification: input => ipcRenderer.send('lifeos:notify', { title: input.title, body: input.body || '', tone: input.tone }),
  onSettings: (listener) => {
    const handler = (_event, settings) => listener(settings);
    ipcRenderer.on('lifeos:duckies-settings-changed', handler);
    return () => ipcRenderer.removeListener('lifeos:duckies-settings-changed', handler);
  },
  onToast: (listener) => {
    const handler = (_event, toast) => listener(toast);
    ipcRenderer.on('lifeos:duckies-toast', handler);
    return () => ipcRenderer.removeListener('lifeos:duckies-toast', handler);
  },
});
// Page code calling `new Notification()` lands in the island (main falls back to an OS toast when Duckies is off).
contextBridge.exposeInMainWorld('lifeOsNotify', (title, body) => ipcRenderer.send('lifeos:notify', { title: String(title), body: String(body || '') }));
contextBridge.executeInMainWorld({
  func: () => {
    const Native = window.Notification;
    if (!Native || !window.lifeOsNotify) return;
    function LifeOsNotification(title, options) {
      window.lifeOsNotify(title, options && options.body);
      return new EventTarget();
    }
    LifeOsNotification.permission = 'granted';
    LifeOsNotification.requestPermission = () => Promise.resolve('granted');
    window.Notification = LifeOsNotification;
  },
});

contextBridge.exposeInMainWorld('lifeOsUpdater', {
  getVersion: () => ipcRenderer.invoke('lifeos:get-version'),
  getStatus: () => ipcRenderer.invoke('lifeos:update-status'),
  checkForUpdates: () => ipcRenderer.invoke('lifeos:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('lifeos:download-update'),
  installUpdate: () => ipcRenderer.invoke('lifeos:install-update'),
  onStatus: (listener) => {
    const handler = (_event, state) => listener(state);
    ipcRenderer.on('lifeos:update-state', handler);
    return () => ipcRenderer.removeListener('lifeos:update-state', handler);
  },
});

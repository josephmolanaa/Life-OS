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
  onSettings: (listener) => {
    const handler = (_event, settings) => listener(settings);
    ipcRenderer.on('lifeos:duckies-settings-changed', handler);
    return () => ipcRenderer.removeListener('lifeos:duckies-settings-changed', handler);
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

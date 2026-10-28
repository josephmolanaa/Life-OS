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

contextBridge.exposeInMainWorld('lifeOsUpdater', {
  getVersion: () => ipcRenderer.invoke('lifeos:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('lifeos:check-for-updates'),
});

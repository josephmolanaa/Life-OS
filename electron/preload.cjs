const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lifeOsSecureStorage', {
  encrypt: (value) => ipcRenderer.invoke('lifeos:encrypt-ai-key', value),
  decrypt: (value) => ipcRenderer.invoke('lifeos:decrypt-ai-key', value),
});

contextBridge.exposeInMainWorld('lifeOsUpdater', {
  getVersion: () => ipcRenderer.invoke('lifeos:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('lifeos:check-for-updates'),
});

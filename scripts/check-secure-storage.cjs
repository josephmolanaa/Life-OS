const { app, safeStorage } = require('electron');

app.whenReady().then(() => {
  if (!safeStorage.isEncryptionAvailable() || (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')) throw new Error('Secure storage unavailable');
  const [action, value] = process.argv.slice(2);
  if (action === 'encrypt') console.log(safeStorage.encryptString('life-os-secure-storage-check').toString('base64'));
  else if (action === 'decrypt' && value) console.log(safeStorage.decryptString(Buffer.from(value, 'base64')));
  else throw new Error('Invalid secure storage check');
  app.quit();
}).catch((error) => { console.error(error); app.exit(1); });

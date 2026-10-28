const { app, BrowserWindow, dialog, ipcMain, Menu, Notification, safeStorage, Tray } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

let mainWindow;
let serverProcess;
let autoUpdater;
let tray;
let quitting = false;
let initialized = false;
let startHidden = process.argv.includes('--hidden');

const port = Number(process.env.PORT || 63027);
const loginItemOptions = { path: process.execPath, args: ['--hidden'] };

function showWindow() {
  startHidden = false;
  if (!initialized) return;
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow().catch(console.error);
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function configureStartup() {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  try {
    const userData = app.getPath('userData');
    const marker = path.join(userData, 'desktop-startup-configured');
    fs.mkdirSync(userData, { recursive: true });
    // The registry holds the choice; this marker prevents resetting a user's opt-out.
    if (fs.existsSync(marker)) return;
    app.setLoginItemSettings({ ...loginItemOptions, openAtLogin: true });
    fs.writeFileSync(marker, '1');
  } catch (error) {
    if (error.code !== 'EEXIST') console.error('Startup configuration failed:', error);
  }
}

function updateTrayMenu() {
  const supportsStartup = process.platform === 'win32' && app.isPackaged;
  const settings = supportsStartup ? app.getLoginItemSettings(loginItemOptions) : null;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Buka Life OS', click: showWindow },
    ...(supportsStartup ? [{
      label: 'Mulai bersama Windows',
      type: 'checkbox',
      checked: settings.openAtLogin && settings.executableWillLaunchAtLogin,
      click: (item) => {
        try {
          app.setLoginItemSettings({ ...loginItemOptions, openAtLogin: item.checked, enabled: item.checked });
        } catch (error) {
          console.error('Startup configuration failed:', error);
          dialog.showErrorBox('Life OS', 'Pengaturan startup gagal disimpan. Coba lagi.');
        }
        updateTrayMenu();
      },
    }] : []),
    { type: 'separator' },
    { label: 'Keluar', click: () => app.quit() },
  ]));
}

async function createTray() {
  try {
    tray = new Tray(await app.getFileIcon(process.execPath));
    tray.setToolTip('Life OS');
    tray.on('click', showWindow);
    tray.on('right-click', updateTrayMenu);
    updateTrayMenu();
  } catch (error) {
    console.error('Tray unavailable:', error);
    tray?.destroy();
    tray = undefined;
    startHidden = false;
  }
}

function stopServer() {
  serverProcess?.kill();
  serverProcess = undefined;
}

function assertLocalSender(event) {
  assertLocalWindow(event);
  if (!safeStorage.isEncryptionAvailable() || (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')) throw new Error('Secure storage unavailable');
}

function assertLocalWindow(event) {
  if (event.sender !== mainWindow?.webContents || event.senderFrame !== event.sender.mainFrame) throw new Error('Untrusted frame');
  const origin = new URL(event.senderFrame.url).origin;
  if (origin !== `http://127.0.0.1:${port}` && origin !== `http://localhost:${port}`) {
    throw new Error('Untrusted window');
  }
}

ipcMain.handle('lifeos:get-version', (event) => {
  assertLocalWindow(event);
  return app.getVersion();
});

ipcMain.handle('lifeos:check-for-updates', async (event) => {
  assertLocalWindow(event);
  const updater = configureAutoUpdater();
  if (!updater) return { status: 'unsupported', version: app.getVersion() };
  try {
    const result = await updater.checkForUpdates();
    const latest = result?.updateInfo?.version;
    return latest && latest !== app.getVersion()
      ? { status: 'available', version: latest }
      : { status: 'current', version: app.getVersion() };
  } catch (error) {
    console.error('Manual update check failed:', error);
    return { status: 'error', version: app.getVersion() };
  }
});

ipcMain.handle('lifeos:encrypt-ai-key', (event, value) => {
  assertLocalSender(event);
  if (typeof value !== 'string' || value.length > 512) throw new Error('Invalid API key');
  return safeStorage.encryptString(value).toString('base64');
});

ipcMain.handle('lifeos:decrypt-ai-key', (event, value) => {
  assertLocalSender(event);
  if (typeof value !== 'string' || value.length > 4096) throw new Error('Invalid encrypted key');
  return safeStorage.decryptString(Buffer.from(value, 'base64'));
});

function waitForServer() {
  return new Promise((resolve, reject) => {
    serverProcess.once('error', reject);
    const deadline = Date.now() + 30_000;

    function check() {
      const request = http.get(`http://127.0.0.1:${port}`, (response) => {
        response.resume();
        resolve();
      });
      request.setTimeout(1000, () => request.destroy());

      request.on('error', () => {
        if (Date.now() >= deadline) {
          reject(new Error('The bundled Next.js server did not start in time.'));
          return;
        }

        setTimeout(check, 250);
      });
    }

    check();
  });
}

async function startProductionServer() {
  const serverDir = path.join(process.resourcesPath, 'app-server');
  let activityWatchOwner = {};
  try {
    activityWatchOwner = JSON.parse(fs.readFileSync(path.join(serverDir, 'activitywatch-owner.json'), 'utf8'));
  } catch {}
  serverProcess = spawn(process.execPath, [path.join(serverDir, 'server.js')], {
    cwd: serverDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      LIFE_OS_LOCAL_AI: '1',
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      PORT: String(port),
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vvwmtfzatvwcedxqmxtk.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2d210ZnphdHZ3Y2VkeHFteHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Njc2NzAsImV4cCI6MjA5NTE0MzY3MH0.KaBcN-VqOzoEUc5_HxgQ9U-qMhEAhBT0xeBJ9HxJWnM',
      ...(typeof activityWatchOwner.id === 'string' && activityWatchOwner.id.length <= 128 ? { ACTIVITYWATCH_OWNER_ID: activityWatchOwner.id } : {}),
      ...(typeof activityWatchOwner.email === 'string' && activityWatchOwner.email.length <= 320 ? { ACTIVITYWATCH_OWNER_EMAIL: activityWatchOwner.email } : {}),
    },
    stdio: 'ignore',
    windowsHide: true,
  });

  await waitForServer();
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  mainWindow.on('close', (event) => {
    if (!quitting && tray) {
      event.preventDefault();
      startHidden = true;
      mainWindow.hide();
    }
  });
  mainWindow.on('closed', () => { mainWindow = undefined; });
  mainWindow.on('session-end', stopServer);

  if (app.isPackaged) {
    try {
      if (!serverProcess) await startProductionServer();
      await mainWindow.loadURL(`http://127.0.0.1:${port}`);
    } catch (error) {
      console.error(error);
      const html = '<h1>Life OS failed to start</h1><p>Please reinstall the app and try again.</p>';
      await mainWindow.loadURL(`data:text/html,${encodeURIComponent(html)}`);
    }
  } else {
    await mainWindow.loadURL(`http://localhost:${port}`);
    if (!startHidden) mainWindow.webContents.openDevTools();
  }
  if (!startHidden) showWindow();
}

function configureAutoUpdater() {
  if (!app.isPackaged) return;
  if (autoUpdater) return autoUpdater;

  ({ autoUpdater } = require('electron-updater'));
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.on('error', (error) => console.error('Auto-update failed:', error));
  autoUpdater.on('update-available', (info) => {
    const version = info?.version || '';
    console.log('Update available:', version);
    if (Notification.isSupported()) {
      new Notification({
        title: 'Life OS Update',
        body: version ? `Versi baru v${version} tersedia dan sedang diunduh di latar belakang.` : 'Versi baru tersedia dan sedang diunduh di latar belakang.',
      }).show();
    }
  });
  autoUpdater.on('update-downloaded', (info) => {
    const version = info?.version || '';
    console.log('Update downloaded:', version);
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Life OS Siap Diperbarui',
        body: version ? `Versi v${version} selesai diunduh. Klik di sini untuk me-restart dan memasang pembaruan sekarang.` : 'Pembaruan selesai diunduh. Klik di sini untuk me-restart dan memasang pembaruan sekarang.',
      });
      notification.on('click', () => {
        autoUpdater.quitAndInstall(false, true);
      });
      notification.show();
    }
    // Jika tidak diklik segera, pembaruan tetap terpasang otomatis saat aplikasi ditutup
  });
  autoUpdater.checkForUpdatesAndNotify().catch((error) => console.error('Update check failed:', error));
  return autoUpdater;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (!argv.includes('--hidden')) showWindow();
  });
  app.whenReady().then(async () => {
    if (process.platform === 'win32') app.setAppUserModelId('com.lifeos.app');
    Menu.setApplicationMenu(null);
    configureStartup();
    await createTray();
    initialized = true;
    await createWindow();
    configureAutoUpdater();
  }).catch(console.error);
  app.on('activate', showWindow);
}

app.on('window-all-closed', () => {
  if (!tray && process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  quitting = true;
  stopServer();
});

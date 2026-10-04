const { app, BrowserWindow, Menu } = require('electron');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

let mainWindow;
let serverProcess;
let autoUpdater;

const port = Number(process.env.PORT || 63027);

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
  serverProcess = spawn(process.execPath, [path.join(serverDir, 'server.js')], {
    cwd: serverDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      PORT: String(port),
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

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
    mainWindow.webContents.openDevTools();
  }
}

function configureAutoUpdater() {
  if (!app.isPackaged) return;

  ({ autoUpdater } = require('electron-updater'));
  autoUpdater.on('error', (error) => console.error('Auto-update failed:', error));
  autoUpdater.on('update-available', () => console.log('Update available'));
  autoUpdater.on('update-downloaded', () => autoUpdater.quitAndInstall());
  autoUpdater.checkForUpdatesAndNotify().catch((error) => console.error('Update check failed:', error));
}

app.whenReady().then(() => {
  createWindow().catch(console.error);
  configureAutoUpdater();
  Menu.setApplicationMenu(null);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch(console.error);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  serverProcess?.kill();
});

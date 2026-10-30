const { app, BrowserWindow, dialog, ipcMain, Menu, Notification, safeStorage, Tray } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { randomBytes } = require('node:crypto');
const activitySecret = randomBytes(32).toString('hex');
let activityEpoch = 0;

async function activityRequest(event, operation, input) {
  assertLocalWindow(event);
  if (!app.isPackaged) throw new Error('Activity permissions require the packaged desktop app');
  const origin = `http://127.0.0.1:${port}`;
  const cookies = async () => (await event.sender.session.cookies.get({ url: origin })).map(c => `${c.name}=${c.value}`).sort().join('; ');
  const cookie = await cookies();
  const epoch = ++activityEpoch;
  let route = '/api/activitywatch-permission';
  const options = { method: 'GET', redirect: 'error', headers: { Cookie: cookie, 'x-lifeos-activity': activitySecret, 'Content-Type': 'application/json' } };
  if (operation === 'set') {
    if (typeof input !== 'boolean') throw new Error('Invalid permission');
    options.method = 'POST';
    options.body = JSON.stringify({ allowed: input });
  } else if (operation === 'data') {
    if (!input || !['4h', '1d', '1w', '1m'].includes(input.range) || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Invalid activity range');
    route = `/api/activitywatch-data?${new URLSearchParams({ date: input.date, range: input.range })}`;
  }
  const response = await fetch(origin + route, { ...options, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(response.status === 401 ? 'Sign in required' : 'Activity access unavailable');
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 8 * 1024 * 1024) { await reader.cancel(); throw new Error('Activity response too large'); }
    chunks.push(Buffer.from(value));
  }
  assertLocalWindow(event);
  if (cookie !== await cookies() || epoch !== activityEpoch) throw new Error('Account or permission changed; retry');
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

ipcMain.handle('lifeos:activity-status', event => activityRequest(event, 'status'));
ipcMain.handle('lifeos:activity-set', (event, allowed) => activityRequest(event, 'set', allowed));
ipcMain.handle('lifeos:activity-data', (event, input) => activityRequest(event, 'data', input));

let mainWindow;
let duckiesWindow;
let serverProcess;
let autoUpdater;
let tray;
let quitting = false;
let initialized = false;
let startHidden = process.argv.includes('--hidden');
let duckiesSettings;
const duckiesSettingsPath = () => path.join(app.getPath('userData'), 'duckies-settings.json');
const defaultDuckiesSettings = { enabled: false, notifications: false, sound: false };
function readDuckiesSettings() {
  if (duckiesSettings) return duckiesSettings;
  try {
    const parsed = JSON.parse(fs.readFileSync(duckiesSettingsPath(), 'utf8'));
    duckiesSettings = { ...defaultDuckiesSettings, ...parsed };
  } catch { duckiesSettings = { ...defaultDuckiesSettings }; }
  return duckiesSettings;
}
function writeDuckiesSettings(next) {
  duckiesSettings = { ...defaultDuckiesSettings, ...next };
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(duckiesSettingsPath(), JSON.stringify(duckiesSettings), { mode: 0o600 });
  return duckiesSettings;
}
function assertDuckiesRenderer(event) {
  if (![mainWindow?.webContents, duckiesWindow?.webContents].includes(event.sender) || event.senderFrame !== event.sender.mainFrame) throw new Error('Untrusted frame');
  const origin = new URL(event.senderFrame.url).origin;
  if (origin !== `http://127.0.0.1:${port}` && origin !== `http://localhost:${port}`) throw new Error('Untrusted window');
}
function assertDuckiesWindow(event) {
  if (event.sender !== duckiesWindow?.webContents || event.senderFrame !== event.sender.mainFrame) throw new Error('Untrusted frame');
  assertDuckiesRenderer(event);
}

function assertSettingsRenderer(event) {
  assertDuckiesRenderer(event);
}

function openDuckiesIfEnabled() {
  if (readDuckiesSettings().enabled) createDuckiesWindow();
}

ipcMain.handle('lifeos:duckies-settings', event => { assertSettingsRenderer(event); return readDuckiesSettings(); });
ipcMain.handle('lifeos:duckies-set-settings', (event, input) => {
  assertSettingsRenderer(event);
  if (!input || typeof input !== 'object' || typeof input.enabled !== 'boolean' || typeof input.notifications !== 'boolean' || typeof input.sound !== 'boolean') throw new Error('Invalid Duckies settings');
  const next = writeDuckiesSettings(input);
  if (next.enabled) createDuckiesWindow(); else closeDuckiesWindow();
  if (duckiesWindow && !duckiesWindow.isDestroyed()) duckiesWindow.webContents.send('lifeos:duckies-settings-changed', next);
  return next;
});
// ipcMain.on listeners have no caller to reject to: a throw there is an uncaught main-process exception
// (crash dialog). Drop untrusted or malformed fire-and-forget messages instead of throwing.
const safeListener = handler => (...args) => { try { handler(...args); } catch (error) { console.warn('Ignored Duckies IPC:', error.message); } };
ipcMain.on('lifeos:duckies-resize', safeListener((event, bounds) => { assertDuckiesWindow(event); resizeDuckies(bounds?.height, bounds?.width); }));
// The window never resizes (a resized transparent window repaints blank on Windows = blink). Instead the
// renderer reports the pill rect and the OS clips the window to it: outside is invisible and click-through.
const duckiesCanvas = { width: 600, height: 260 };
ipcMain.on('lifeos:duckies-shape', safeListener((event, rect) => {
  assertDuckiesWindow(event);
  const values = [rect?.x, rect?.y, rect?.width, rect?.height];
  if (!values.every(Number.isInteger) || rect.x < 0 || rect.y < 0 || rect.width < 1 || rect.height < 1 || rect.x + rect.width > duckiesCanvas.width || rect.y + rect.height > duckiesCanvas.height) throw new Error('Invalid Duckies shape');
  if (duckiesWindow && !duckiesWindow.isDestroyed()) duckiesWindow.setShape([{ x: rect.x, y: rect.y, width: rect.width, height: rect.height }]);
}));

// Every Life OS desktop notification drops into the island when Duckies is on; the OS toast is the fallback.
function showDesktopNotification(title, body, tone = 'green', onClick) {
  const toast = { title: String(title || 'Life OS').slice(0, 80), body: String(body || '').slice(0, 160), tone: ['green', 'blue', 'amber'].includes(tone) ? tone : 'green' };
  if (duckiesWindow && !duckiesWindow.isDestroyed() && readDuckiesSettings().notifications) {
    duckiesWindow.webContents.send('lifeos:duckies-toast', toast);
    return;
  }
  if (!Notification.isSupported()) return;
  const notification = new Notification({ title: toast.title, body: toast.body });
  if (onClick) notification.on('click', onClick);
  notification.show();
}
// Shelf paste: the island window rarely takes OS keyboard focus (it is clipped with setShape), so the
// renderer asks main for the clipboard on click / Ctrl+V. Returns names and sizes only, never file contents.
// This Electron build's clipboard only reads text, so Windows' own clipboard (via PowerShell) supplies
// copied files and images.
ipcMain.handle('lifeos:duckies-clipboard', async event => {
  assertDuckiesWindow(event);
  const script = path.join(app.getPath('userData'), 'read-clipboard.ps1');
  fs.writeFileSync(script, fs.readFileSync(path.join(__dirname, 'read-clipboard.ps1')));
  const output = await new Promise(resolve => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-File', script], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let text = '';
    const timer = setTimeout(() => child.kill(), 8000);
    child.stdout.on('data', chunk => { text += chunk; });
    child.on('error', () => { clearTimeout(timer); resolve(''); });
    child.on('exit', () => { clearTimeout(timer); resolve(text); });
  });
  let clip;
  try { clip = JSON.parse(output || '{}'); } catch { return {}; }
  const files = (Array.isArray(clip.files) ? clip.files : clip.files ? [clip.files] : []).filter(file => typeof file?.name === 'string' && Number.isFinite(file.size)).map(file => ({ name: file.name.slice(0, 200), size: file.size }));
  if (files.length) return { files };
  if (typeof clip.image?.preview === 'string' && clip.image.preview.startsWith('data:image/png;base64,') && clip.image.preview.length < 400000) return { image: { size: Number(clip.image.size) || 0, preview: clip.image.preview } };
  return typeof clip.text === 'string' && clip.text.trim() ? { text: clip.text.slice(0, 2000) } : {};
});
ipcMain.on('lifeos:notify', safeListener((event, input) => {
  assertDuckiesRenderer(event);
  if (!input || typeof input.title !== 'string') throw new Error('Invalid notification');
  showDesktopNotification(input.title, typeof input.body === 'string' ? input.body : '', input.tone);
}));
// Mirrors every Windows toast (any app) into the island via the built-in WinRT notification listener.
// The OS still shows its own corner toast: Windows has no public API to suppress other apps' toasts.
let windowsNotifications;
// WinRT hides toast images, but Windows keeps each toast's XML in its notification database. Discord
// writes the sender's avatar to %TEMP% and references it there, so look up the newest toast for this sender.
function discordAvatar(username) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Notifications', 'wpndatabase.db'), { readOnly: true });
    try {
      const rows = db.prepare("SELECT n.Payload FROM Notification n JOIN NotificationHandler h ON h.RecordId = n.HandlerId WHERE h.PrimaryId LIKE '%Discord%' AND n.Type = 'toast' AND n.Payload IS NOT NULL ORDER BY n.ArrivalTime DESC LIMIT 20").all();
      const escaped = username.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const xml = rows.map(row => Buffer.from(row.Payload).toString('utf8')).find(text => text.includes(`<text>${escaped}</text>`));
      const src = xml?.match(/<image[^>]*\ssrc="([^"]+)"/)?.[1];
      if (!src) return undefined;
      // Only read PNGs Discord dropped in the user's temp folder; never follow arbitrary paths from a payload.
      const file = path.resolve(src);
      const temp = path.resolve(app.getPath('temp'));
      if (path.dirname(file).toLowerCase() !== temp.toLowerCase() || path.extname(file).toLowerCase() !== '.png') return undefined;
      const data = fs.readFileSync(file);
      return data.length <= 512 * 1024 ? `data:image/png;base64,${data.toString('base64')}` : undefined;
    } finally { db.close(); }
  } catch { return undefined; }
}
function startWindowsNotifications() {
  if (process.platform !== 'win32' || windowsNotifications) return;
  try {
    // PowerShell can't read files inside app.asar, so stage the script in userData first.
    const script = path.join(app.getPath('userData'), 'windows-notifications.ps1');
    fs.writeFileSync(script, fs.readFileSync(path.join(__dirname, 'windows-notifications.ps1')));
    windowsNotifications = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-File', script], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (error) { console.error('Windows notification listener unavailable:', error); return; }
  let buffer = '';
  windowsNotifications.stdout.on('data', chunk => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      let item;
      try { item = JSON.parse(line); } catch { continue; }
      if (item?.type !== 'toast' || !duckiesWindow || duckiesWindow.isDestroyed() || !readDuckiesSettings().notifications) continue;
      const title = String(item.title || item.app || 'Windows').slice(0, 80);
      if (item.app === 'Discord') {
        // Discord: avatar + username + "N New Messages", like its own toast.
        duckiesWindow.webContents.send('lifeos:duckies-toast', { title, body: String(item.body || '').slice(0, 160), tone: 'discord', image: discordAvatar(title) });
        continue;
      }
      const body = [item.app && item.app !== title ? item.app : '', String(item.body || '')].filter(Boolean).join(' · ').slice(0, 160);
      duckiesWindow.webContents.send('lifeos:duckies-toast', { title, body, tone: 'blue' });
    }
  });
  windowsNotifications.on('exit', () => { windowsNotifications = undefined; });
}
function stopWindowsNotifications() {
  windowsNotifications?.kill();
  windowsNotifications = undefined;
}
function closeDuckiesWindow() {
  if (duckiesWindow && !duckiesWindow.isDestroyed()) duckiesWindow.close();
  duckiesWindow = undefined;
  stopWindowsNotifications();
}
function resizeDuckies(height, width) {
  if (!duckiesWindow || duckiesWindow.isDestroyed()) return;
  if (!Number.isInteger(height) || !Number.isInteger(width) || height < 32 || height > 480 || width < 60 || width > 900) throw new Error('Invalid Duckies bounds');
  const { width: screenWidth } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  duckiesWindow.setBounds({ x: Math.round((screenWidth - width) / 2), y: 8, width, height });
}
function createDuckiesWindow() {
  if (!app.isPackaged || !readDuckiesSettings().enabled || (duckiesWindow && !duckiesWindow.isDestroyed())) return;
  const { screen } = require('electron');
  const { width, height } = duckiesCanvas;
  const screenWidth = screen.getPrimaryDisplay().workAreaSize.width;
  // Fixed canvas clipped to the pill with setShape (see lifeos:duckies-shape).
  duckiesWindow = new BrowserWindow({ width, height, x: Math.round((screenWidth - width) / 2), y: 8, frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, resizable: false, movable: false, focusable: true, hasShadow: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  duckiesWindow.setShape([{ x: (width - 160) / 2, y: 0, width: 160, height: 36 }]);
  duckiesWindow.setAlwaysOnTop(true, 'floating');
  duckiesWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  duckiesWindow.on('closed', () => { duckiesWindow = undefined; stopWindowsNotifications(); });
  duckiesWindow.loadURL(`http://127.0.0.1:${port}/duckies`).catch(console.error);
  startWindowsNotifications();
}

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

let updateState = { status: 'idle' };
let updateCheck;
let updateDownload;
function setUpdateState(state) {
  updateState = state;
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('lifeos:update-state', state);
}
function updateError(error) {
  console.error('Auto-update failed:', error);
  const message = String(error?.message || error);
  const code = /404|latest\.yml|ERR_UPDATER_(CHANNEL_FILE_NOT_FOUND|NO_PUBLISHED_VERSIONS|INVALID_RELEASE_FEED)/i.test(message)
    ? 'release' : /ENOTFOUND|ETIMEDOUT|ECONN|ERR_INTERNET|ERR_NETWORK/i.test(message) ? 'network' : 'update';
  setUpdateState({ status: 'error', code });
}
function checkUpdates(updater) {
  if (['downloading', 'downloaded'].includes(updateState.status)) return Promise.resolve(updateState);
  if (!updateCheck) {
    updateCheck = updater.checkForUpdates().then(result => {
      result?.downloadPromise?.catch(updateError);
      return updateState;
    }).catch(error => {
      updateError(error);
      return updateState;
    }).finally(() => { updateCheck = undefined; });
  }
  return updateCheck;
}
ipcMain.handle('lifeos:update-status', event => {
  assertLocalWindow(event);
  return app.isPackaged ? updateState : { status: 'unsupported' };
});
ipcMain.handle('lifeos:check-for-updates', async event => {
  assertLocalWindow(event);
  const updater = configureAutoUpdater();
  return updater ? checkUpdates(updater) : { status: 'unsupported', version: app.getVersion() };
});
ipcMain.handle('lifeos:download-update', async event => {
  assertLocalWindow(event);
  const updater = configureAutoUpdater();
  if (!updater || updateState.status !== 'available') return updateState;
  if (!updateDownload) {
    setUpdateState({ ...updateState, status: 'downloading', percent: 0 });
    updateDownload = updater.downloadUpdate().catch(updateError).finally(() => { updateDownload = undefined; });
  }
  await updateDownload;
  return updateState;
});
ipcMain.handle('lifeos:install-update', event => {
  assertLocalWindow(event);
  if (updateState.status !== 'downloaded') throw new Error('Update is not ready');
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
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
      LIFE_OS_DESKTOP_ACTIVITY: '1',
      LIFE_OS_ACTIVITY_SECRET: activitySecret,
      LIFE_OS_ACTIVITY_PERMISSIONS: path.join(app.getPath('userData'), 'activitywatch-permissions.json'),
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
  openDuckiesIfEnabled();
}

function configureAutoUpdater() {
  if (!app.isPackaged) return;
  if (autoUpdater) return autoUpdater;

  ({ autoUpdater } = require('electron-updater'));
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.on('error', updateError);
  autoUpdater.on('checking-for-update', () => setUpdateState({ status: 'checking' }));
  autoUpdater.on('update-not-available', () => setUpdateState({ status: 'current', version: app.getVersion() }));
  autoUpdater.on('download-progress', info => setUpdateState({ ...updateState, status: 'downloading', percent: Math.min(100, Math.max(0, info.percent || 0)) }));
  autoUpdater.on('update-available', (info) => {
    const version = info?.version || '';
    setUpdateState({ status: autoUpdater.autoDownload ? 'downloading' : 'available', version, percent: 0 });
    console.log('Update available:', version);
    showDesktopNotification('Life OS Update', version ? `Versi baru v${version} tersedia dan sedang diunduh di latar belakang.` : 'Versi baru tersedia dan sedang diunduh di latar belakang.', 'blue');
  });
  autoUpdater.on('update-downloaded', (info) => {
    const version = info?.version || '';
    setUpdateState({ status: 'downloaded', version, percent: 100 });
    console.log('Update downloaded:', version);
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Life OS Siap Diperbarui',
        body: version ? `Versi v${version} selesai diunduh. Klik di sini untuk me-restart dan memasang pembaruan sekarang.` : 'Pembaruan selesai diunduh. Klik di sini untuk me-restart dan memasang pembaruan sekarang.',
      });
      showDesktopNotification('Life OS Siap Diperbarui', version ? `Versi v${version} selesai diunduh. Klik di sini untuk me-restart dan memasang pembaruan sekarang.` : 'Pembaruan selesai diunduh. Klik di sini untuk me-restart dan memasang pembaruan sekarang.', 'blue', () => autoUpdater.quitAndInstall(false, true));
    }
    // Jika tidak diklik segera, pembaruan tetap terpasang otomatis saat aplikasi ditutup
  });
  void checkUpdates(autoUpdater);
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
  stopWindowsNotifications();
  stopServer();
});

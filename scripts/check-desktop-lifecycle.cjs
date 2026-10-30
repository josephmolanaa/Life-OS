const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawn, spawnSync } = require('node:child_process');

const source = fs.readFileSync(path.join(__dirname, '..', 'electron', 'main.cjs'), 'utf8');
const tempDirs = [];
let lastNotification;
function tempDirectory(prefix) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(directory);
  return directory;
}

function launch({ args = [], packaged = true, userData = tempDirectory('lifeos-tray-'), lock = true, trayFailure = false, startupFailure = false, login = { openAtLogin: false, executableWillLaunchAtLogin: true } } = {}) {
  const app = new EventEmitter();
  const windows = [];
  const settingsCalls = [];
  const spawned = [];
  const errors = [];
  let quits = 0;
  let loginSettings = { ...login };
  let readyCalls = 0;

  Object.assign(app, {
    isPackaged: packaged,
    isReady: () => true,
    requestSingleInstanceLock: () => lock,
    whenReady: () => { readyCalls++; return Promise.resolve(); },
    getPath: () => userData,
    getVersion: () => '1.0.9',
    setAppUserModelId: () => {},
    setLoginItemSettings: (value) => {
      settingsCalls.push(value);
      if (startupFailure) { startupFailure = false; throw new Error('registry denied'); }
      loginSettings = { openAtLogin: value.openAtLogin, executableWillLaunchAtLogin: value.openAtLogin };
    },
    getLoginItemSettings: (options) => {
      assert.equal(JSON.stringify(options), JSON.stringify({ path: 'Life OS.exe', args: ['--hidden'] }));
      return loginSettings;
    },
    getFileIcon: async () => ({}),
    quit: () => { quits++; app.emit('before-quit'); },
  });

  class BrowserWindow extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.visible = options.show;
      this.destroyed = false;
      this.webContents = {
        openDevTools: () => {},
        mainFrame: { url: 'http://127.0.0.1:63027' },
        send: (channel, state) => messages.push({ channel, state: JSON.parse(JSON.stringify(state)) }),
      };
      windows.push(this);
    }
    async loadURL() {}
    show() { this.visible = true; }
    hide() { this.visible = false; }
    focus() { this.focused = true; }
    restore() { this.minimized = false; }
    isMinimized() { return this.minimized; }
    isDestroyed() { return this.destroyed; }
    close() { this.destroyed = true; this.emit('closed'); }
    setBounds(bounds) { this.bounds = bounds; }
    setAlwaysOnTop() {}
    setVisibleOnAllWorkspaces() {}
  }
  class Tray extends EventEmitter {
    constructor() { super(); if (trayFailure) throw new Error('tray unavailable'); Tray.instance = this; }
    setToolTip(value) { this.tooltip = value; }
    setContextMenu(value) { this.contextMenu = value; }
    destroy() {}
  }

  const Menu = { setApplicationMenu() {}, buildFromTemplate: (template) => ({ template }) };
  const handlers = new Map();
  const listeners = new Map();
  const messages = [];
  const ipcMain = {
    handle: (channel, handler) => handlers.set(channel, handler),
    on: (channel, listener) => listeners.set(channel, listener),
  };
  class NotificationMock extends EventEmitter {
    constructor(options) { super(); this.options = options; lastNotification = this; }
    static isSupported() { return true; }
    show() {}
  }
  const electron = {
    app, BrowserWindow, Tray, Menu, ipcMain, Notification: NotificationMock, dialog: { showErrorBox() {} }, safeStorage: { isEncryptionAvailable: () => true },
    screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1920, height: 1080 } }) },
  };
  const updater = new EventEmitter();
  updater.checkCalls = 0;
  updater.downloadCalls = 0;
  updater.installCalls = [];
  updater.checkForUpdates = () => { updater.checkCalls++; updater.emit('checking-for-update'); return Promise.resolve(); };
  updater.checkForUpdatesAndNotify = updater.checkForUpdates;
  updater.downloadUpdate = () => { updater.downloadCalls++; return Promise.resolve(); };
  updater.quitAndInstall = (...args) => { updater.installCalls.push(args); app.quit(); };
  const modules = {
    'node:crypto': require('node:crypto'),
    electron,
    'electron-updater': { autoUpdater: updater },
    'node:child_process': { spawn: () => { const child = new EventEmitter(); child.kill = () => { child.killed = true; }; spawned.push(child); return child; } },
    'node:fs': fs,
    'node:http': { get: (_url, callback) => { queueMicrotask(() => callback({ resume() {} })); return { setTimeout() {}, on() {} }; } },
    'node:path': path,
  };

  vm.runInNewContext(source, {
    require: (name) => modules[name],
    __dirname: path.join(__dirname, '..', 'electron'),
    process: { platform: 'win32', execPath: 'Life OS.exe', resourcesPath: 'resources', argv: ['Life OS.exe', ...args], env: {} },
    console: { error: (...values) => errors.push(values), log() {} },
    Buffer, URL, setTimeout, setImmediate, Date,
  }, { filename: 'electron/main.cjs' });

  return { app, windows, settingsCalls, spawned, errors, updater, handlers, listeners, messages, get quits() { return quits; }, get readyCalls() { return readyCalls; }, userData, get tray() { return Tray.instance; } };
}

async function settle() { await new Promise((resolve) => setTimeout(resolve, 10)); }
function menuItem(tray, label) { return tray.contextMenu.template.find((item) => item.label === label); }

async function checkUpdater() {
  const desktop = launch();
  await settle();
  const { updater, handlers, messages } = desktop;
  const sender = desktop.windows[0].webContents;
  const event = { sender, senderFrame: sender.mainFrame };
  const invoke = (channel, input = event) => Promise.resolve().then(() => handlers.get(`lifeos:${channel}`)(input));
  const status = () => invoke('update-status');
  const expectState = async expected => {
    assert.deepEqual(JSON.parse(JSON.stringify(await status())), expected);
    assert.deepEqual(messages.at(-1), { channel: 'lifeos:update-state', state: expected });
  };
  assert.equal(updater.checkCalls, 1, 'startup must check once');
  await expectState({ status: 'checking' });
  assert.equal(updater.autoDownload, true);
  assert.equal(updater.autoInstallOnAppQuit, true);
  assert.equal(updater.allowPrerelease, false);
  assert.equal(await invoke('get-version'), '1.0.9');

  for (const channel of ['get-version', 'update-status', 'check-for-updates', 'download-update', 'install-update']) {
    await assert.rejects(invoke(channel, { sender: {}, senderFrame: sender.mainFrame }), /Untrusted frame/, channel);
    await assert.rejects(invoke(channel, { sender, senderFrame: { url: sender.mainFrame.url } }), /Untrusted frame/, channel);
    sender.mainFrame.url = 'https://evil.example';
    await assert.rejects(invoke(channel), /Untrusted window/, channel);
    sender.mainFrame.url = 'http://127.0.0.1:63028';
    await assert.rejects(invoke(channel), /Untrusted window/, channel);
    sender.mainFrame.url = 'http://127.0.0.1:63027';
  }
  assert.equal(updater.checkCalls, 1, 'untrusted requests must have no updater side effects');
  assert.equal(updater.downloadCalls, 0);
  await assert.rejects(invoke('install-update'), /not ready/);
  assert.equal(updater.installCalls.length, 0);
  updater.emit('update-not-available');
  await expectState({ status: 'current', version: '1.0.9' });
  await invoke('download-update');
  assert.equal(updater.downloadCalls, 0, 'no download without an available update');

  let finishCheck;
  updater.checkForUpdates = () => {
    updater.checkCalls++;
    updater.emit('checking-for-update');
    return new Promise(resolve => { finishCheck = resolve; });
  };
  const check1 = invoke('check-for-updates');
  const check2 = invoke('check-for-updates');
  await settle();
  assert.equal(updater.checkCalls, 2, 'concurrent manual checks must share one request');
  await expectState({ status: 'checking' });
  updater.emit('update-available', { version: '1.1.0' });
  await expectState({ status: 'downloading', version: '1.1.0', percent: 0 });
  await invoke('download-update');
  assert.equal(updater.downloadCalls, 0, 'auto-download must not be duplicated before the first progress event');
  finishCheck();
  await Promise.all([check1, check2]);
  await invoke('check-for-updates');
  assert.equal(updater.checkCalls, 2, 'checking must not interrupt a download');
  for (const [percent, expected] of [[42.5, 42.5], [-10, 0], [150, 100]]) {
    updater.emit('download-progress', { percent, bytesPerSecond: 999 });
    await expectState({ status: 'downloading', version: '1.1.0', percent: expected });
  }
  await assert.rejects(invoke('install-update'), /not ready/);

  updater.autoDownload = false;
  updater.emit('update-available', { version: '1.1.0' });
  await expectState({ status: 'available', version: '1.1.0', percent: 0 });
  let finishDownload;
  updater.downloadUpdate = () => { updater.downloadCalls++; return new Promise(resolve => { finishDownload = resolve; }); };
  const download1 = invoke('download-update');
  const download2 = invoke('download-update');
  await settle();
  assert.equal(updater.downloadCalls, 1, 'concurrent manual downloads must share one request');
  await expectState({ status: 'downloading', version: '1.1.0', percent: 0 });
  updater.emit('update-downloaded', { version: '1.1.0' });
  finishDownload();
  await Promise.all([download1, download2]);
  await expectState({ status: 'downloaded', version: '1.1.0', percent: 100 });
  await invoke('download-update');
  await invoke('check-for-updates');
  assert.equal(updater.downloadCalls, 1, 'downloaded updates must not download again');
  assert.equal(updater.checkCalls, 2);
  await invoke('install-update');
  await settle();
  assert.deepEqual(updater.installCalls, [[false, true]]);
  assert.equal(desktop.spawned[0].killed, true);

  for (const [message, code] of [
    ['404 latest.yml https://private.example/token', 'release'],
    ['ERR_UPDATER_NO_PUBLISHED_VERSIONS', 'release'],
    ['ENOTFOUND private.example', 'network'],
    ['ETIMEDOUT private.example', 'network'],
    ['signature failed C:\\private\\secret', 'update'],
  ]) {
    updater.emit('error', new Error(message));
    await expectState({ status: 'error', code });
  }
  updater.checkForUpdates = () => Promise.reject(new Error('ECONNRESET private detail'));
  assert.equal((await invoke('check-for-updates')).code, 'network');
  updater.checkForUpdates = () => Promise.resolve({ downloadPromise: Promise.reject(new Error('404 latest.yml')) });
  await invoke('check-for-updates');
  await settle();
  await expectState({ status: 'error', code: 'release' });
  updater.emit('update-available', { version: '1.1.0' });
  updater.downloadUpdate = () => Promise.reject(new Error('signature mismatch private detail'));
  await invoke('download-update');
  await expectState({ status: 'error', code: 'update' });
  updater.checkForUpdates = () => { updater.emit('update-not-available'); return Promise.resolve(); };
  await invoke('check-for-updates');
  await expectState({ status: 'current', version: '1.0.9' });
  assert.equal(updater.listenerCount('error'), 1, 'repeated IPC must not register duplicate listeners');
  desktop.windows[0].destroyed = true;
  const count = messages.length;
  updater.emit('checking-for-update');
  assert.equal(messages.length, count, 'destroyed windows must not receive events');

  const dev = launch({ packaged: false });
  await settle();
  const devSender = dev.windows[0].webContents;
  const devEvent = { sender: devSender, senderFrame: devSender.mainFrame };
  for (const channel of ['update-status', 'check-for-updates']) {
    assert.equal((await dev.handlers.get(`lifeos:${channel}`)(devEvent)).status, 'unsupported');
  }
  assert.equal(dev.updater.checkCalls, 0);

  const exposed = {};
  const renderer = new EventEmitter();
  const calls = [];
  renderer.invoke = channel => { calls.push(channel); return Promise.resolve(channel); };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'electron', 'preload.cjs'), 'utf8'), {
    require: () => ({ ipcRenderer: renderer, contextBridge: { exposeInMainWorld: (name, api) => { exposed[name] = api; } } }),
  });
  const duckiesApi = exposed.lifeOsDuckies;
  assert.ok(duckiesApi && typeof duckiesApi.getSettings === 'function');
  assert.ok(typeof duckiesApi.setSettings === 'function');
  assert.ok(typeof duckiesApi.resize === 'function');

  const duckiesDesktop = launch();
  await settle();
  const duckiesEvent = { sender: duckiesDesktop.windows[0].webContents, senderFrame: duckiesDesktop.windows[0].webContents.mainFrame };
  const duckiesInvoke = (channel, payload) => duckiesDesktop.handlers.get(`lifeos:${channel}`)(duckiesEvent, payload);
  assert.deepEqual(JSON.parse(JSON.stringify(await duckiesInvoke('duckies-settings'))), { enabled: false, notifications: false, sound: false });
  assert.equal(duckiesDesktop.windows.length, 1);
  const updatedSettings = await duckiesInvoke('duckies-set-settings', { enabled: true, notifications: true, sound: false });
  assert.deepEqual(JSON.parse(JSON.stringify(updatedSettings)), { enabled: true, notifications: true, sound: false });
  assert.equal(duckiesDesktop.windows.length, 2);
  const notch = duckiesDesktop.windows[1];
  const notchEvent = { sender: notch.webContents, senderFrame: notch.webContents.mainFrame };
  duckiesDesktop.listeners.get('lifeos:duckies-resize')(notchEvent, { height: 190, width: 640 });
  assert.deepEqual(JSON.parse(JSON.stringify(notch.bounds)), { x: 640, y: 0, width: 640, height: 190 });
  assert.throws(() => duckiesDesktop.handlers.get('lifeos:duckies-set-settings')(duckiesEvent, { enabled: 'yes' }), /Invalid Duckies settings/);
  assert.throws(() => duckiesDesktop.handlers.get('lifeos:duckies-set-settings')({ sender: {}, senderFrame: {} }, { enabled: false, notifications: false, sound: false }), /Untrusted frame/);
  assert.throws(() => duckiesDesktop.listeners.get('lifeos:duckies-resize')(notchEvent, { height: 10, width: 640 }), /Invalid Duckies bounds/);
  await duckiesInvoke('duckies-set-settings', { enabled: false, notifications: false, sound: false });
  assert.equal(notch.destroyed, true);
  console.log('Desktop Duckies OK: settings persistence, window creation/destroy, bounds validation, sender trust.');

  const api = exposed.lifeOsUpdater;
  for (const method of ['getVersion', 'getStatus', 'checkForUpdates', 'downloadUpdate', 'installUpdate']) await api[method]();
  assert.deepEqual(calls, ['lifeos:get-version', 'lifeos:update-status', 'lifeos:check-for-updates', 'lifeos:download-update', 'lifeos:install-update']);
  const received = [];
  let otherCalls = 0;
  const unsubscribe = api.onStatus((...args) => received.push(args));
  const unsubscribeOther = api.onStatus(() => { otherCalls++; });
  renderer.emit('lifeos:update-state', { secret: 'must not leak IPC event' }, { status: 'checking' });
  assert.deepEqual(received, [[{ status: 'checking' }]]);
  unsubscribe();
  unsubscribe();
  renderer.emit('lifeos:update-state', {}, { status: 'current' });
  assert.equal(received.length, 1);
  assert.equal(otherCalls, 2, 'unsubscribe must preserve other subscribers');
  unsubscribeOther();
  assert.equal(renderer.listenerCount('lifeos:update-state'), 0);
  console.log('Desktop updater OK: sender trust, states, duplicate guards, safe errors, install gating, preload cleanup.');
}

async function checkNative() {
  const { app, BrowserWindow } = require('electron');
  app.setPath('userData', process.env.LIFEOS_TEST_PROFILE);
  if (process.argv.includes('--second-launch')) {
    require('../electron/main.cjs');
    return;
  }
  const timeout = setTimeout(() => { console.error('Native tray check timed out'); app.exit(1); }, 20000);
  const server = require('node:http').createServer((_request, response) => response.end('Life OS tray check'));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.PORT = String(server.address().port);
  require('../electron/main.cjs');
  await app.whenReady();
  let window;
  while (!(window = BrowserWindow.getAllWindows()[0]) || window.webContents.isLoading() || !window.webContents.getURL()) {
    await settle();
  }
  assert.equal(window.isVisible(), false, 'native hidden launch');
  assert.equal(window.webContents.getBackgroundThrottling(), false);
  window.show();
  window.close();
  assert.equal(window.isDestroyed(), false, 'native close must preserve the window');
  assert.equal(window.isVisible(), false, 'native close must hide the window');
  async function secondLaunch(args) {
    const child = spawn(process.execPath, [__filename, '--second-launch', ...args], { env: process.env, stdio: 'ignore', windowsHide: true });
    await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Second launch exited ${code}`)));
    });
    await settle();
  }
  await secondLaunch([]);
  assert.equal(window.isVisible(), true, 'native second launch must reopen the existing window');
  assert.equal(BrowserWindow.getAllWindows().length, 1);
  window.close();
  await secondLaunch(['--hidden']);
  assert.equal(window.isVisible(), false, 'native background launch must preserve hidden state');
  app.once('will-quit', () => {
    clearTimeout(timeout);
    server.close();
    console.log('Native Electron tray OK: hidden start, close-to-tray, single-instance reopen, background launch, quit.');
  });
  app.quit();
}

if (process.versions.electron) {
  checkNative().catch((error) => { console.error(error); require('electron').app.exit(1); });
} else (async () => {
  const first = launch();
  await settle();
  assert.equal(first.windows.length, 1, first.errors.flat().map((error) => error.stack ?? error).join('\n'));
  assert.equal(first.windows[0].visible, true);
  assert.equal(first.spawned.length, 1);
  assert.equal(first.settingsCalls[0].openAtLogin, true);
  assert.deepEqual(Array.from(first.settingsCalls[0].args), ['--hidden']);
  assert.equal(first.errors.length, 0);
  assert.ok(fs.existsSync(path.join(first.userData, 'desktop-startup-configured')));

  const window = first.windows[0];
  let prevented = false;
  window.emit('close', { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(window.visible, false);
  assert.equal(first.quits, 0);
  first.tray.emit('click');
  assert.equal(window.visible, true);
  assert.equal(window.focused, true);
  first.tray.emit('right-click');
  menuItem(first.tray, 'Mulai bersama Windows').click({ checked: false });
  assert.equal(first.settingsCalls.at(-1).openAtLogin, false);

  const second = launch({ userData: first.userData, login: { openAtLogin: false, executableWillLaunchAtLogin: true } });
  await settle();
  assert.equal(second.settingsCalls.length, 0, 'disabled startup must not be re-enabled on next launch');
  assert.equal(menuItem(second.tray, 'Mulai bersama Windows').checked, false);
  const blockedByWindows = launch({ userData: first.userData, login: { openAtLogin: true, executableWillLaunchAtLogin: false } });
  await settle();
  assert.equal(menuItem(blockedByWindows.tray, 'Mulai bersama Windows').checked, false, 'Task Manager opt-out should be reflected');
  second.app.emit('second-instance', {}, ['Life OS.exe']);
  assert.equal(second.windows.length, 1);
  assert.equal(second.windows[0].visible, true);
  second.app.emit('second-instance', {}, ['Life OS.exe', '--hidden']);
  assert.equal(second.windows[0].visible, true);
  second.windows[0].emit('close', { preventDefault() {} });
  second.app.emit('second-instance', {}, ['Life OS.exe', '--hidden']);
  assert.equal(second.windows[0].visible, false, 'background second launch must not show a hidden window');
  second.windows[0].minimized = true;
  second.app.emit('second-instance', {}, ['Life OS.exe']);
  assert.equal(second.windows[0].minimized, false);
  assert.equal(second.windows[0].visible, true);
  assert.equal(second.spawned.length, 1);
  menuItem(second.tray, 'Keluar').click();
  assert.equal(second.quits, 1);
  assert.equal(second.spawned[0].killed, true);
  second.windows[0].emit('close', { preventDefault() { assert.fail('Quit must allow the window to close'); } });

  const retryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeos-startup-retry-'));
  tempDirs.push(retryDir);
  const failed = launch({ userData: retryDir, startupFailure: true });
  await settle();
  assert.equal(failed.settingsCalls.length, 1);
  assert.equal(fs.existsSync(path.join(retryDir, 'desktop-startup-configured')), false);
  const retried = launch({ userData: retryDir });
  await settle();
  assert.equal(retried.settingsCalls[0].openAtLogin, true);

  const duplicate = launch({ lock: false });
  assert.equal(duplicate.readyCalls, 0);
  assert.equal(duplicate.windows.length, 0);
  assert.equal(duplicate.quits, 1);

  const earlySecond = launch({ packaged: false, args: ['--hidden'] });
  earlySecond.app.emit('second-instance', {}, ['Life OS.exe']);
  await settle();
  assert.equal(earlySecond.windows.length, 1);
  assert.equal(earlySecond.windows[0].visible, true, 'early second launch should show the first window');

  const autoStart = launch({ args: ['--hidden'] });
  await settle();
  assert.equal(autoStart.windows[0].visible, false, 'Windows startup should create a hidden window');
  autoStart.windows[0].emit('session-end');
  assert.equal(autoStart.spawned[0].killed, true, 'Windows shutdown should stop the bundled server');
  first.updater.emit('update-downloaded', { version: '1.0.8' });
  lastNotification?.emit('click');
  assert.equal(first.quits, 1);
  assert.equal(first.spawned[0].killed, true, 'update quit should stop the bundled server');

  const failedTray = launch({ packaged: false, trayFailure: true, args: ['--hidden'] });
  await settle();
  assert.equal(failedTray.windows[0].visible, true, 'tray failure must keep the app accessible');
  failedTray.app.emit('window-all-closed');
  assert.equal(failedTray.quits, 1);

  await checkUpdater();
  console.log('Desktop lifecycle OK: tray hide/reopen, startup opt-out/retry, single instance, quit and tray-failure fallback.');
  if (process.argv.includes('--vm-only')) return;
  const native = spawnSync(require('electron'), [__filename, '--hidden'], {
    env: { ...process.env, LIFEOS_TEST_PROFILE: tempDirectory('lifeos-native-tray-') },
    encoding: 'utf8', windowsHide: true, timeout: 25000,
  });
  assert.equal(native.status, 0, native.error?.message || native.stderr || native.stdout);
  assert.ok(native.stdout.includes('Native Electron tray OK'), native.stdout);
  console.log(native.stdout.trim());
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  for (const directory of tempDirs) fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

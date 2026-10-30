# Spesifikasi Implementasi: Floating Notch (Nusa Concept) ke Life-OS

Dokumen panduan implementasi fitur **Living Notch** (diadopsi dari arsitektur *Nusa* / `nusa.exe`) ke dalam aplikasi desktop **Life-OS** (`Scaramouche/life-os`).

---

## 1. Ringkasan Eksekutif & Tujuan

Fitur ini menambahkan jendela overlay mengambang (*floating notch widget*) di bagian tengah-atas layar monitor pengguna yang terhubung langsung ke state dan database Life-OS (Daily Quests, Focus Timer, Water Tracker, Scaramouche Pet, dan File Shelf).

### Tech Stack Life-OS
- **Runtime:** Electron 44.7.0 (`electron/main.cjs`, `electron/preload.cjs`)
- **Frontend:** Next.js 16.4.3 (App Router), React 19.3.0, TypeScript 5.8.2
- **Styling:** Tailwind CSS 4 (`@tailwindcss/postcss`)
- **Backend / Database:** Supabase (`@supabase/supabase-js`, route `/api/todos`)

---

## 2. Arsitektur Window (Electron Main Process)

### File Target: `electron/main.cjs`

Tambahkan inisialisasi `notchWindow` sebagai secondary window di samping `mainWindow`.

```js
let notchWindow;

function createNotchWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const NOTCH_WIDTH = 640;
  const NOTCH_COMPACT_HEIGHT = 38;

  notchWindow = new BrowserWindow({
    width: NOTCH_WIDTH,
    height: NOTCH_COMPACT_HEIGHT,
    x: Math.round((screenWidth - NOTCH_WIDTH) / 2),
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false, // Meniru WS_EX_NOACTIVATE: klik tidak merebut fokus ketik
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Tingkat z-index tertinggi agar selalu di atas fullscreen app
  notchWindow.setAlwaysOnTop(true, 'screen-saver');
  notchWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const notchUrl = `http://127.0.0.1:${port}/notch`;
  notchWindow.loadURL(notchUrl).catch(console.error);

  notchWindow.on('closed', () => {
    notchWindow = null;
  });
}
```

### Handler IPC untuk Resize & State (Tambahkan ke `main.cjs`)
```js
ipcMain.on('lifeos:notch-resize', (event, { height, width }) => {
  if (!notchWindow || notchWindow.isDestroyed()) return;
  const { screen } = require('electron');
  const screenWidth = screen.getPrimaryDisplay().workAreaSize.width;
  const targetWidth = width || 640;
  const targetX = Math.round((screenWidth - targetWidth) / 2);

  notchWindow.setBounds({
    x: targetX,
    y: 0,
    width: targetWidth,
    height: height || 38,
  });
});
```

---

## 3. IPC Preload Bridge

### File Target: `electron/preload.cjs`

Ekspos namespace `lifeOsNotch` ke dalam `window`:

```js
contextBridge.exposeInMainWorld('lifeOsNotch', {
  setHeight: (height, width) => ipcRenderer.send('lifeos:notch-resize', { height, width }),
});
```

---

## 4. Layout Khusus Notch (Tanpa Sidebar/Navbar Global)

### File Target Baru: `src/app/notch/layout.tsx`

Halaman notch harus bersih dari sidebar dashboard biasa.

```tsx
export default function NotchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full bg-transparent overflow-hidden select-none">
      {children}
    </div>
  );
}
```

---

## 5. Implementasi Komponen Notch

### File Target Baru: `src/app/notch/page.tsx`

Komponen utama yang menangani status *compact* vs *expanded*, interaksi hover, dan tab widget:

```tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, Clock, Droplets, Cat, FolderDown } from 'lucide-react';

export default function NotchPage() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'quests' | 'timer' | 'water' | 'pet' | 'shelf'>('quests');
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [waterCount, setWaterCount] = useState(0);

  // Resize window Electron saat state berubah
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).lifeOsNotch) {
      if (isExpanded) {
        (window as any).lifeOsNotch.setHeight(190, 640);
      } else {
        (window as any).lifeOsNotch.setHeight(38, 240);
      }
    }
  }, [isExpanded]);

  // Focus Timer countdown
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className="mx-auto transition-all duration-300 ease-out"
      style={{ width: isExpanded ? '640px' : '240px' }}
    >
      {/* Kontainer Notch Utama */}
      <div className="bg-black/90 backdrop-blur-xl border-x border-b border-white/10 rounded-b-2xl text-white shadow-2xl p-2">
        {!isExpanded ? (
          // Compact Mode (Standby Pill)
          <div className="flex items-center justify-between px-3 h-[22px] text-xs">
            <span className="font-semibold text-emerald-400">⚡ Focus</span>
            <span className="font-mono text-zinc-300">{formatTimer(timerSeconds)}</span>
            <span className="text-[10px] text-zinc-400">💧 {waterCount} ml</span>
          </div>
        ) : (
          // Expanded Mode (Dashboard Panel)
          <div className="h-[170px] flex flex-col justify-between">
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 px-2">
              <span className="text-xs font-bold tracking-wide text-zinc-300">LIFE-OS NOTCH</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('quests')}
                  className={`p-1 rounded ${activeTab === 'quests' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  title="Daily Quests"
                >
                  <CheckSquare size={14} />
                </button>
                <button
                  onClick={() => setActiveTab('timer')}
                  className={`p-1 rounded ${activeTab === 'timer' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  title="Focus Timer"
                >
                  <Clock size={14} />
                </button>
                <button
                  onClick={() => setActiveTab('water')}
                  className={`p-1 rounded ${activeTab === 'water' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  title="Water Tracker"
                >
                  <Droplets size={14} />
                </button>
                <button
                  onClick={() => setActiveTab('pet')}
                  className={`p-1 rounded ${activeTab === 'pet' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  title="Scaramouche Pet"
                >
                  <Cat size={14} />
                </button>
                <button
                  onClick={() => setActiveTab('shelf')}
                  className={`p-1 rounded ${activeTab === 'shelf' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  title="File Drop Shelf"
                >
                  <FolderDown size={14} />
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 py-2 px-2 overflow-y-auto text-xs">
              {activeTab === 'quests' && (
                <div className="space-y-1">
                  <p className="text-[11px] text-zinc-400">Top Quests Hari Ini:</p>
                  <div className="bg-white/5 p-1.5 rounded flex items-center justify-between">
                    <span>Scaramouche Project Coding</span>
                    <span className="text-emerald-400 font-mono">+50 XP</span>
                  </div>
                  <div className="bg-white/5 p-1.5 rounded flex items-center justify-between">
                    <span>Roblox Developing Task</span>
                    <span className="text-emerald-400 font-mono">+30 XP</span>
                  </div>
                </div>
              )}

              {activeTab === 'timer' && (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <span className="font-mono text-2xl font-bold tracking-wider">{formatTimer(timerSeconds)}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="px-3 py-1 bg-emerald-600 rounded text-xs font-medium hover:bg-emerald-500"
                    >
                      {isTimerRunning ? 'Pause' : 'Start'}
                    </button>
                    <button
                      onClick={() => { setIsTimerRunning(false); setTimerSeconds(25 * 60); }}
                      className="px-3 py-1 bg-zinc-700 rounded text-xs font-medium hover:bg-zinc-600"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'water' && (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <span className="text-sm font-semibold">{waterCount} / 2000 ml</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setWaterCount(c => c + 250)}
                      className="px-3 py-1 bg-blue-600 rounded text-xs hover:bg-blue-500"
                    >
                      +250 ml (Gelas)
                    </button>
                    <button
                      onClick={() => setWaterCount(0)}
                      className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'pet' && (
                <div className="flex items-center gap-3 h-full px-4">
                  <div className="text-3xl animate-bounce">🧙‍♂️</div>
                  <div>
                    <p className="font-bold text-indigo-300">Mini Scaramouche</p>
                    <p className="text-[11px] text-zinc-400">"Selesaikan quest-mu sebelum hari berganti!"</p>
                  </div>
                </div>
              )}

              {activeTab === 'shelf' && (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    alert(`File diterima: ${e.dataTransfer.files[0]?.name}`);
                  }}
                  className="border border-dashed border-zinc-600 rounded h-full flex flex-col items-center justify-center text-zinc-400 hover:border-emerald-400 transition"
                >
                  <FolderDown size={20} className="mb-1 text-zinc-500" />
                  <span className="text-[11px]">Seret & lepas berkas ke sini (Quick Shelf)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 6. Checklist Verifikasi & Menjalankan

1. Jalankan aplikasi Life-OS versi desktop development:
   ```bash
   npm run desktop:dev
   ```
2. Pastikan notch muncul persis di tengah atas layar.
3. Dekatkan mouse (hover): ukuran harus menganimasi membesar dari 240px ke 640px lebar dan 38px ke 190px tinggi.
4. Klik tombol di dalam notch saat aplikasi lain (misal VS Code atau Browser) sedang fokus: pastikan kursor ketik di aplikasi lain **tidak hilang** (`focusable: false`).

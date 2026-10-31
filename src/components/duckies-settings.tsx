'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { defaultDuckiesDisplay, duckiesDisplayKey, readDuckiesDisplay, type DuckiesDisplay } from '@/lib/duckies-display';

// allowedApps absent = every app's notifications reach the island; a list = only those apps.
type Settings = { enabled: boolean; notifications: boolean; sound: boolean; allowedApps?: string[] };
const defaults: Settings = { enabled: false, notifications: false, sound: false };
const storageKey = 'lifeos-duckies-settings';

export function DuckiesSettings({ lang }: { lang: 'id' | 'en' }) {
  const id = lang === 'id';
  const [settings, setSettings] = useState<Settings>(defaults);
  const [desktop, setDesktop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [display, setDisplay] = useState<DuckiesDisplay>(defaultDuckiesDisplay);
  const [knownApps, setKnownApps] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const picker = useRef<HTMLDetailsElement>(null);
  const saveDisplay = (patch: Partial<DuckiesDisplay>) => {
    const next = { ...display, ...patch };
    setDisplay(next);
    localStorage.setItem(duckiesDisplayKey, JSON.stringify(next));
  };
  useEffect(() => {
    setDisplay(readDuckiesDisplay(localStorage.getItem(duckiesDisplayKey)));
    const bridge = window.lifeOsDuckies;
    setDesktop(Boolean(bridge));
    if (bridge) {
      bridge.getSettings().then(setSettings).catch(() => setSettings(defaults));
      bridge.getKnownApps?.().then(setKnownApps).catch(() => {});
    } else try { setSettings({ ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }); } catch {}
    const close = (event: PointerEvent) => { if (picker.current?.open && !picker.current.contains(event.target as Node)) picker.current.open = false; };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  async function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    if (!next.allowedApps) delete next.allowedApps;
    setSettings(next); setBusy(true);
    try {
      if (window.lifeOsDuckies) setSettings(await window.lifeOsDuckies.setSettings(next));
      else localStorage.setItem(storageKey, JSON.stringify(next));
    } finally { setBusy(false); }
  }
  const toggle = (key: 'enabled' | 'notifications' | 'sound', label: string, hint: string) => (
    <label className="duckiesToggle">
      <span className="toggle">
        <input type="checkbox" checked={settings[key]} disabled={busy || !desktop} onChange={event => void update({ [key]: event.target.checked })} />
        <span className="slider" aria-hidden="true"></span>
      </span>
      <span><b>{label}</b><small>{hint}</small></span>
    </label>
  );
  const allowed = settings.allowedApps;
  const apps = [...new Set([...knownApps, ...(allowed || [])])].sort((a, b) => a.localeCompare(b));
  const matches = apps.filter(app => app.toLowerCase().includes(query.trim().toLowerCase()));
  const custom = query.trim();
  const canAdd = custom.length > 0 && custom.length <= 80 && !apps.some(app => app.toLowerCase() === custom.toLowerCase());
  const isOn = (app: string) => !allowed || allowed.includes(app);
  // First pick narrows "all apps" down to an explicit list; emptying the list goes back to "all".
  const flip = (app: string) => {
    const base = allowed ?? apps;
    const next = base.includes(app) ? base.filter(item => item !== app) : [...base, app];
    void update({ allowedApps: next.length ? next : undefined });
  };
  const summary = !allowed ? (id ? 'Semua aplikasi' : 'All apps') : `${allowed.length} ${id ? 'aplikasi dipilih' : 'apps selected'}`;
  const filterDisabled = busy || !desktop || !settings.notifications;

  return <section className="card duckiesSettings">
    <div className="settingsSectionHeader"><div><span className="pill">Duckies</span><h2>Floating widget</h2><p className="muted noMargin">{desktop ? (id ? 'Widget desktop di atas layar.' : 'Desktop overlay above your screen.') : (id ? 'Aktifkan dari aplikasi desktop.' : 'Enable it from the desktop app.')}</p></div></div>
    <div className="settingsStack">
      {toggle('enabled', id ? 'Aktifkan Duckies' : 'Enable Duckies', id ? 'Tampilkan widget floating saat desktop dibuka.' : 'Show the floating widget when desktop starts.')}
      {toggle('notifications', id ? 'Notifikasi Duckies' : 'Duckies notifications', id ? 'Island membesar sebentar saat fokus selesai, tugas beres, atau target air tercapai.' : 'The island expands briefly when focus ends, a task is done, or the water goal is hit.')}
      <div className="duckiesAppFilter">
        <div><b>{id ? 'Notifikasi aplikasi' : 'App notifications'}</b><small>{id ? 'Pilih aplikasi Windows yang notifikasinya muncul di island.' : 'Choose which Windows apps can show notifications in the island.'}</small></div>
        <details ref={picker} className="duckiesPicker" onToggle={event => { if (!event.currentTarget.open) setQuery(''); }}>
          <summary aria-disabled={filterDisabled} onClick={event => { if (filterDisabled) event.preventDefault(); }}>{summary}<ChevronDown size={14} aria-hidden="true" /></summary>
          <div className="duckiesPickerMenu">
            <label className="duckiesPickerSearch"><Search size={14} aria-hidden="true" /><input autoFocus type="search" value={query} placeholder={id ? 'Cari aplikasi…' : 'Search apps…'} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && canAdd) { event.preventDefault(); flip(custom); setQuery(''); } }} aria-label={id ? 'Cari aplikasi' : 'Search apps'} /></label>
            <button type="button" className="duckiesPickerAll" disabled={!allowed} onClick={() => void update({ allowedApps: undefined })}>{id ? 'Izinkan semua aplikasi' : 'Allow all apps'}</button>
            <ul role="listbox" aria-multiselectable="true" aria-label={id ? 'Aplikasi' : 'Apps'}>
              {matches.map(app => <li key={app}><label><input type="checkbox" checked={isOn(app)} onChange={() => flip(app)} />{app}</label></li>)}
              {canAdd && <li><button type="button" className="duckiesPickerAdd" onClick={() => { flip(custom); setQuery(''); }}>{id ? `Tambah "${custom}"` : `Add "${custom}"`}</button></li>}
              {!matches.length && !canAdd && <li className="duckiesPickerEmpty">{id ? 'Tidak ada aplikasi.' : 'No apps found.'}</li>}
            </ul>
          </div>
        </details>
        {allowed && <div className="duckiesChips">{allowed.map(app => <button type="button" key={app} disabled={filterDisabled} onClick={() => flip(app)} aria-label={`${id ? 'Hapus' : 'Remove'} ${app}`}>{app}<X size={12} aria-hidden="true" /></button>)}</div>}
      </div>
      {toggle('sound', id ? 'Suara Duckies' : 'Duckies sound', id ? 'Bunyi chime pendek bersama notifikasi Duckies.' : 'Play a short chime with Duckies alerts.')}
      <fieldset className="duckiesDisplay">
        <legend><b>{id ? 'Tampilan tengah island' : 'Island center display'}</b><small>{id ? 'Yang tampil di tengah saat Duckies idle.' : 'What shows in the middle while Duckies is idle.'}</small></legend>
        <div className="duckiesDisplayOptions" role="radiogroup">
          {(['clock', 'countdown'] as const).map(mode => <label key={mode}><input type="radio" name="duckies-display" checked={display.mode === mode} onChange={() => saveDisplay({ mode })} />{mode === 'clock' ? (id ? 'Jam desktop' : 'Desktop clock') : 'Countdown'}</label>)}
        </div>
        {display.mode === 'countdown' && <label className="duckiesDisplayTarget">{id ? 'Hitung mundur ke' : 'Count down to'}
          <input type="datetime-local" value={display.target} onChange={event => { if (event.target.value) saveDisplay({ target: event.target.value }); }} />
        </label>}
      </fieldset>
    </div>
  </section>;
}

declare global {
  interface Window { lifeOsDuckies?: { getSettings: () => Promise<Settings>; setSettings: (settings: Settings) => Promise<Settings>; getKnownApps?: () => Promise<string[]>; resize: (height: number, width: number) => void; setShape?: (rect: { x: number; y: number; width: number; height: number }) => void; readClipboard?: () => Promise<{ files?: { name: string; size: number }[]; image?: { size: number; preview: string }; text?: string; error?: string; output?: string }>; showNotification?: (input: { title: string; body?: string; tone?: string }) => void; onToast?: (listener: (toast: { title: string; body: string; tone: string; image?: string }) => void) => () => void; onSettings?: (listener: (settings: Settings) => void) => () => void } }
}

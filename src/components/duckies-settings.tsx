'use client';

import { useEffect, useState } from 'react';

type Settings = { enabled: boolean; notifications: boolean; sound: boolean };
const defaults: Settings = { enabled: false, notifications: false, sound: false };
const storageKey = 'lifeos-duckies-settings';

export function DuckiesSettings({ lang }: { lang: 'id' | 'en' }) {
  const id = lang === 'id';
  const [settings, setSettings] = useState<Settings>(defaults);
  const [desktop, setDesktop] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const bridge = window.lifeOsDuckies;
    setDesktop(Boolean(bridge));
    if (bridge) bridge.getSettings().then(setSettings).catch(() => setSettings(defaults));
    else try { setSettings({ ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }); } catch {}
  }, []);
  async function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next); setBusy(true);
    try {
      if (window.lifeOsDuckies) setSettings(await window.lifeOsDuckies.setSettings(next));
      else localStorage.setItem(storageKey, JSON.stringify(next));
    } finally { setBusy(false); }
  }
  const toggle = (key: keyof Settings, label: string, hint: string) => (
    <label className="duckiesToggle">
      <span className="toggle">
        <input type="checkbox" checked={settings[key]} disabled={busy || !desktop} onChange={event => void update({ [key]: event.target.checked })} />
        <span className="slider" aria-hidden="true"></span>
      </span>
      <span><b>{label}</b><small>{hint}</small></span>
    </label>
  );
  return <section className="card duckiesSettings">
    <div className="settingsSectionHeader"><div><span className="pill">Duckies</span><h2>Floating widget</h2><p className="muted noMargin">{desktop ? (id ? 'Widget desktop di atas layar.' : 'Desktop overlay above your screen.') : (id ? 'Aktifkan dari aplikasi desktop.' : 'Enable it from the desktop app.')}</p></div></div>
    <div className="settingsStack">
      {toggle('enabled', id ? 'Aktifkan Duckies' : 'Enable Duckies', id ? 'Tampilkan widget floating saat desktop dibuka.' : 'Show the floating widget when desktop starts.')}
      {toggle('notifications', id ? 'Notifikasi Duckies' : 'Duckies notifications', id ? 'Island membesar sebentar saat fokus selesai, quest beres, atau target air tercapai.' : 'The island expands briefly when focus ends, a quest is done, or the water goal is hit.')}
      {toggle('sound', id ? 'Suara Duckies' : 'Duckies sound', id ? 'Bunyi chime pendek bersama notifikasi Duckies.' : 'Play a short chime with Duckies alerts.')}
    </div>
  </section>;
}

declare global {
  interface Window { lifeOsDuckies?: { getSettings: () => Promise<Settings>; setSettings: (settings: Settings) => Promise<Settings>; resize: (height: number, width: number) => void; setShape?: (rect: { x: number; y: number; width: number; height: number }) => void; readClipboard?: () => Promise<{ files?: { name: string; size: number }[]; image?: { size: number; preview: string }; text?: string; error?: string; output?: string }>; showNotification?: (input: { title: string; body?: string; tone?: string }) => void; onToast?: (listener: (toast: { title: string; body: string; tone: string; image?: string }) => void) => () => void; onSettings?: (listener: (settings: Settings) => void) => () => void } }
}

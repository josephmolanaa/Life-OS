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
  return <section className="card duckiesSettings">
    <div className="settingsSectionHeader"><div><span className="pill">Duckies</span><h2>Floating widget</h2><p className="muted noMargin">{desktop ? (id ? 'Widget desktop di atas layar.' : 'Desktop overlay above your screen.') : (id ? 'Aktifkan dari aplikasi desktop.' : 'Enable it from the desktop app.')}</p></div></div>
    <div className="settingsStack">
      <label className="duckiesToggle"><input type="checkbox" checked={settings.enabled} disabled={busy || !desktop} onChange={event => void update({ enabled: event.target.checked })} /><span><b>{id ? 'Aktifkan Duckies' : 'Enable Duckies'}</b><small>{id ? 'Tampilkan widget floating saat desktop dibuka.' : 'Show the floating widget when desktop starts.'}</small></span></label>
      <label className="duckiesToggle"><input type="checkbox" checked={settings.notifications} disabled={busy || !desktop} onChange={event => void update({ notifications: event.target.checked })} /><span><b>{id ? 'Notifikasi Duckies' : 'Duckies notifications'}</b><small>{id ? 'Island membesar sebentar saat fokus selesai, quest beres, atau target air tercapai.' : 'The island expands briefly when focus ends, a quest is done, or the water goal is hit.'}</small></span></label>
      <label className="duckiesToggle"><input type="checkbox" checked={settings.sound} disabled={busy || !desktop} onChange={event => void update({ sound: event.target.checked })} /><span><b>{id ? 'Suara Duckies' : 'Duckies sound'}</b><small>{id ? 'Bunyi chime pendek bersama notifikasi Duckies.' : 'Play a short chime with Duckies alerts.'}</small></span></label>
    </div>
  </section>;
}

declare global {
  interface Window { lifeOsDuckies?: { getSettings: () => Promise<Settings>; setSettings: (settings: Settings) => Promise<Settings>; resize: (height: number, width: number) => void; setInteractive?: (interactive: boolean) => void; onSettings?: (listener: (settings: Settings) => void) => () => void } }
}

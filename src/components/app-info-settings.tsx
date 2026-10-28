'use client';

import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    lifeOsUpdater?: {
      getVersion(): Promise<string>;
      checkForUpdates(): Promise<{ status: 'available' | 'current' | 'unsupported' | 'error'; version: string }>;
    };
  }
}

export function AppInfoSettings({ lang }: { lang: 'en' | 'id' }) {
  const [version, setVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');

  useEffect(() => {
    window.lifeOsUpdater?.getVersion().then(setVersion).catch(() => setVersion(''));
  }, []);

  async function checkUpdate() {
    setChecking(true);
    setUpdateStatus('');
    try {
      if (!window.lifeOsUpdater) {
        setUpdateStatus(lang === 'id' ? 'Cek update tersedia di aplikasi desktop.' : 'Update checks are available in the desktop app.');
        return;
      }
      const data = await window.lifeOsUpdater.checkForUpdates();
      if (data.status === 'available') setUpdateStatus(lang === 'id' ? `Update tersedia: v${data.version}. Akan diunduh otomatis.` : `Update available: v${data.version}. It will download automatically.`);
      else if (data.status === 'current') setUpdateStatus(lang === 'id' ? 'Aplikasi sudah versi terbaru' : 'App is up to date');
      else if (data.status === 'unsupported') setUpdateStatus(lang === 'id' ? 'Cek update hanya tersedia di aplikasi desktop.' : 'Update checks are available in the desktop app.');
      else setUpdateStatus(lang === 'id' ? 'Tidak dapat memeriksa update. Pastikan internet tersedia.' : 'Could not check for updates. Check your internet connection.');
    } catch {
      setUpdateStatus(lang === 'id' ? 'Tidak dapat memeriksa update' : 'Could not check for updates');
    } finally {
      setChecking(false);
    }
  }

  const id = lang === 'id';

  return <section className="card appInfoCard" aria-labelledby="app-info-title">
    <div className="settingsSectionHeader">
      <div><span className="pill">{id ? 'Informasi' : 'Info'}</span><h2 id="app-info-title">{id ? 'Informasi Aplikasi' : 'App Information'}</h2><p className="muted noMargin">{id ? 'Detail versi dan pembaruan aplikasi.' : 'Version details and app updates.'}</p></div>
      <Info size={21} aria-hidden="true" />
    </div>

    <div className="appInfoRow">
      <div>
        <strong>{id ? 'Versi' : 'Version'}</strong>
        <p className="muted noMargin" style={{ fontSize: '12px' }}>{version ? `Life OS v${version}` : (id ? 'Versi desktop belum tersedia' : 'Desktop version unavailable')}</p>
      </div>
      <button type="button" className="btn ghost" disabled={checking} onClick={() => void checkUpdate()}>{checking ? (id ? 'Memeriksa…' : 'Checking…') : (id ? 'Cek Update' : 'Check Update')}</button>
    </div>

    {updateStatus && <p className="muted" style={{ fontSize: '12px', padding: '8px 10px', background: 'var(--surface2)', borderRadius: '8px', margin: '6px 0 0' }}>{updateStatus}</p>}

  </section>;
}

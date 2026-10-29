'use client';

import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';

type UpdateState = {
  status: 'idle' | 'checking' | 'available' | 'current' | 'downloading' | 'downloaded' | 'unsupported' | 'error';
  version?: string;
  percent?: number;
  code?: string;
};

declare global {
  interface Window {
    lifeOsUpdater?: {
      getVersion(): Promise<string>;
      checkForUpdates(): Promise<UpdateState>;
      getStatus?(): Promise<UpdateState>;
      downloadUpdate?(): Promise<UpdateState>;
      installUpdate?(): Promise<void>;
      onStatus?(listener: (state: UpdateState) => void): () => void;
    };
  }
}

export function AppInfoSettings({ lang }: { lang: 'en' | 'id' }) {
  const [version, setVersion] = useState<string | null>(null);
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const [busy, setBusy] = useState(false);
  const id = lang === 'id';

  useEffect(() => {
    const updater = window.lifeOsUpdater;
    if (!updater) { setState({ status: 'unsupported' }); return; }
    let active = true;
    let receivedEvent = false;
    const apply = (value: UpdateState) => { if (active) setState(value); };
    const unsubscribe = updater.onStatus?.(value => { receivedEvent = true; apply(value); });
    updater.getVersion().then(value => { if (active) setVersion(value); }).catch(() => {});
    // ponytail: older desktop bridges require a shell update before install actions are available.
    if (!updater.getStatus) apply({ status: 'error', code: 'bridge' });
    else updater.getStatus().then(value => {
      if (!active || receivedEvent) return;
      apply(value);
      if (value.status === 'idle') void updater.checkForUpdates().then(apply).catch(() => apply({ status: 'error' }));
    }).catch(() => apply({ status: 'error' }));
    return () => { active = false; unsubscribe?.(); };
  }, []);

  async function update() {
    const updater = window.lifeOsUpdater;
    if (!updater || busy) return;
    setBusy(true);
    try {
      if (state.status === 'downloaded' && updater.installUpdate) await updater.installUpdate();
      else if (state.status === 'available' && updater.downloadUpdate) setState(await updater.downloadUpdate());
      else setState(await updater.checkForUpdates());
    } catch { setState({ status: 'error' }); }
    finally { setBusy(false); }
  }

  const downloading = state.status === 'downloading';
  const checking = state.status === 'checking';
  const label = downloading ? (id ? 'Mengunduh…' : 'Downloading…')
    : checking ? (id ? 'Memeriksa…' : 'Checking…')
    : state.status === 'downloaded' ? (id ? 'Restart untuk memasang' : 'Restart to install')
    : state.status === 'available' ? 'Update'
    : state.status === 'error' ? (id ? 'Coba lagi' : 'Retry')
    : (id ? 'Cek Update' : 'Check Update');
  const message = state.status === 'error'
    ? state.code === 'release' ? (id ? 'Paket rilis belum lengkap. Installer atau metadata update tidak tersedia.' : 'Release package incomplete. Installer or update metadata is unavailable.')
      : state.code === 'network' ? (id ? 'Server update tidak dapat dijangkau. Periksa koneksi lalu coba lagi.' : 'Update server unreachable. Check your connection and retry.')
      : state.code === 'bridge' ? (id ? 'Komponen updater desktop lama. Pasang installer rilis lengkap untuk memperbaruinya.' : 'Desktop updater is outdated. Install a complete release to upgrade it.')
      : (id ? 'Pembaruan gagal. Coba lagi; paket rilis atau layanan update mungkin bermasalah.' : 'Update failed. Retry; the release package or update service may be unavailable.')
    : state.status === 'current' ? (id ? 'Aplikasi sudah versi terbaru.' : 'App is up to date.')
    : state.status === 'available' ? (id ? `Update v${state.version} tersedia.` : `Update v${state.version} available.`)
    : downloading ? `${id ? 'Mengunduh' : 'Downloading'}${state.version ? ` v${state.version}` : ''}: ${Math.round(state.percent || 0)}%`
    : state.status === 'downloaded' ? (id ? `v${state.version} siap. Simpan pekerjaan sebelum restart.` : `v${state.version} ready. Save your work before restarting.`)
    : state.status === 'unsupported' ? (id ? 'Update tersedia melalui aplikasi desktop.' : 'Updates are available in the desktop app.') : '';

  return <section className="card appInfoCard" aria-labelledby="app-info-title">
    <div className="settingsSectionHeader">
      <div><span className="pill">{id ? 'Informasi' : 'Info'}</span><h2 id="app-info-title">{id ? 'Informasi Aplikasi' : 'App Information'}</h2><p className="muted noMargin">{id ? 'Detail versi dan pembaruan aplikasi.' : 'Version details and app updates.'}</p></div>
      <Info size={21} aria-hidden="true" />
    </div>
    <div className="appInfoRow">
      <div><strong>{id ? 'Versi' : 'Version'}</strong><p className="muted noMargin" style={{ fontSize: '12px' }}>{version ? `Life OS v${version}` : (id ? 'Versi desktop belum tersedia' : 'Desktop version unavailable')}</p></div>
      <button type="button" className="btn ghost" disabled={busy || checking || downloading || state.status === 'unsupported'} onClick={() => void update()}>{label}</button>
    </div>
    <div role="status" aria-live="polite">{message && <p className="muted" style={{ fontSize: '12px', padding: '8px 10px', background: 'var(--surface2)', borderRadius: '8px', margin: '6px 0 0' }}>{message}</p>}</div>
    {downloading && <progress max={100} value={state.percent || 0} aria-label={id ? 'Progres unduhan update' : 'Update download progress'} style={{ width: '100%' }} />}
  </section>;
}

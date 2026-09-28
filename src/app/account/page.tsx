"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Shell } from '@/components/finance/layout';
import { createClient } from '@/lib/supabase/client';

export default function AccountPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        window.location.replace('/login');
        return;
      }
      setEmail(data.user.email ?? '');
      setDisplayName(String(data.user.user_metadata?.display_name ?? data.user.email?.split('@')[0] ?? ''));
      setAvatarUrl(data.user.user_metadata?.avatar_url ?? '');
      setLoading(false);
    });
  }, [supabase]);

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setMessage('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const { error: updateError } = await supabase.auth.updateUser({
          data: { avatar_url: base64 }
        });

        if (updateError) throw updateError;

        setAvatarUrl(base64);
        setMessage('Foto profil berhasil diperbarui.');
        setUploading(false);
      };
      reader.onerror = () => {
        setError('Gagal membaca file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal upload foto');
      setUploading(false);
    }
  }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const updates: { email?: string; password?: string; data: { display_name: string; avatar_url?: string } } = {
      data: { display_name: displayName.trim(), avatar_url: avatarUrl },
    };
    if (email.trim()) updates.email = email.trim();
    if (password) updates.password = password;

    const { error } = await supabase.auth.updateUser(updates);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setPassword('');
      setMessage(updates.email ? 'Profil tersimpan. Cek email untuk konfirmasi perubahan email.' : 'Profil tersimpan.');
    }
  }

  const initial = displayName ? displayName[0].toUpperCase() : email ? email[0].toUpperCase() : '?';

  return (
    <Shell title="Account Settings" quickFab={false}>
      <style dangerouslySetInnerHTML={{ __html: `
        .account-container { max-width: 680px; margin: 0 auto; display: grid; gap: 24px; }
        .account-header { display: flex; align-items: center; gap: 24px; padding: 24px; background: var(--card-bg, var(--surface)); border: 1px solid var(--border); border-radius: 16px; position: relative; }
        .account-avatar-wrapper { position: relative; flex-shrink: 0; }
        .account-avatar { width: 88px; height: 88px; border-radius: 50%; background: var(--surface2); border: 2px solid var(--border2); display: grid; place-items: center; font-size: 36px; font-weight: 700; color: var(--text); box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
        .account-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-upload-btn { position: absolute; bottom: 0; right: 0; width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: var(--accentText); border: 2px solid var(--surface); display: grid; place-items: center; cursor: pointer; font-size: 16px; transition: transform 0.2s; font-weight: bold; }
        .avatar-upload-btn:hover { transform: scale(1.1); }
        .avatar-upload-btn input { display: none; }
        .account-title h2 { margin: 0 0 6px 0; font-size: 24px; letter-spacing: -0.02em; }
        .account-title p { margin: 0; color: var(--text2); font-size: 15px; }
        
        .account-section { background: var(--card-bg, var(--surface)); border: 1px solid var(--border); border-radius: 16px; padding: 28px; }
        .account-section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3); margin: 0 0 20px 0; font-weight: 700; }
        
        .settings-field { display: grid; gap: 8px; margin-bottom: 20px; }
        .settings-field:last-child { margin-bottom: 0; }
        .settings-field label { font-size: 14px; font-weight: 600; color: var(--text); }
        .settings-field .input { background: var(--bg); border: 1px solid var(--border2); transition: all 0.2s ease; padding: 12px 14px; font-size: 15px; border-radius: 8px; }
        .settings-field .input:focus { background: var(--surface); border-color: var(--text); outline: none; box-shadow: 0 0 0 3px rgba(26,25,23,0.05); }
        .settings-field .help-text { font-size: 13px; color: var(--text2); margin-top: 4px; }
        
        .account-actions { margin-top: 8px; display: flex; justify-content: flex-end; }
        .btn-primary { background: var(--text); color: var(--surface); font-weight: 600; padding: 0 24px; min-height: 44px; border-radius: 8px; border: none; cursor: pointer; transition: transform 0.1s, opacity 0.2s; font-size: 15px; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.9; }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .alert-box { padding: 14px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 10px; }
        .alert-error { color: var(--red); background: rgba(163,45,45,0.08); border: 1px solid rgba(163,45,45,0.2); }
        .alert-success { color: var(--green); background: rgba(59,109,17,0.08); border: 1px solid rgba(59,109,17,0.2); }
      `}} />

      <div className="account-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>Memuat profil...</div>
        ) : (
          <form onSubmit={saveAccount}>
            {error && <div className="alert-box alert-error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {error}
            </div>}
            {message && <div className="alert-box alert-success">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              {message}
            </div>}

            <header className="account-header">
              <div className="account-avatar-wrapper">
                <div className="account-avatar">
                  {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : initial}
                </div>
                <label className="avatar-upload-btn" title="Ubah foto profil">
                  <input type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} />
                  ✎
                </label>
              </div>
              <div className="account-title">
                <h2>{displayName || 'User'}</h2>
                <p>{email}</p>
              </div>
            </header>

            <div style={{ display: 'grid', gap: '24px', marginTop: '24px' }}>
              <section className="account-section">
                <h3 className="account-section-title">Informasi Dasar</h3>
                
                <div className="settings-field">
                  <label htmlFor="displayName">Nama Tampilan</label>
                  <input id="displayName" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
                </div>

                <div className="settings-field">
                  <label htmlFor="email">Alamat Email</label>
                  <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                  <div className="help-text">Email ini digunakan untuk login dan menerima notifikasi penting.</div>
                </div>
              </section>

              <section className="account-section">
                <h3 className="account-section-title">Keamanan</h3>
                
                <div className="settings-field">
                  <label htmlFor="password">Ubah Password</label>
                  <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete="new-password" placeholder="••••••••" />
                  <div className="help-text">Biarkan kosong jika Anda tidak ingin mengubah password saat ini. Minimal 6 karakter.</div>
                </div>
              </section>

              <div className="account-actions">
                <button className="btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Shell>
  );
}

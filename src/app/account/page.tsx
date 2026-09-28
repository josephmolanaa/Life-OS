"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Shell } from '@/components/finance/layout';
import { createClient } from '@/lib/supabase/client';

export default function AccountPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      setLoading(false);
    });
  }, [supabase]);

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const updates: { email?: string; password?: string; data: { display_name: string } } = {
      data: { display_name: displayName.trim() },
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

  return (
    <Shell title="Account" quickFab={false}>
      <section className="card" style={{ maxWidth: 720, display: 'grid', gap: 18 }}>
        <div>
          <p className="muted" style={{ margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.18em' }}>User account</p>
          <h2 style={{ margin: '8px 0 6px' }}>Edit profil</h2>
          <p className="muted" style={{ margin: 0 }}>Ubah nama tampilan, email login, atau password akun ini.</p>
        </div>

        {loading ? <p className="muted">Memuat akun...</p> : (
          <form onSubmit={saveAccount} className="form" style={{ display: 'grid', gap: 14 }}>
            {error && <div style={{ color: 'var(--red)', background: 'rgba(163,45,45,0.1)', border: '1px solid var(--red)', padding: 10, borderRadius: 8 }}>{error}</div>}
            {message && <div style={{ color: 'var(--green)', background: 'rgba(59,109,17,0.1)', border: '1px solid var(--green)', padding: 10, borderRadius: 8 }}>{message}</div>}

            <label style={{ display: 'grid', gap: 6 }}>
              <span className="muted">Nama tampilan</span>
              <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span className="muted">Email</span>
              <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span className="muted">Password baru</span>
              <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} autoComplete="new-password" placeholder="Kosongkan jika tidak diganti" />
            </label>

            <button className="btn" type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan perubahan'}</button>
          </form>
        )}
      </section>
    </Shell>
  );
}

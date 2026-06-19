"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleEmailPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      });
      setLoading(false);
      if (error) setError(error.message);
      else setMessage('Registration successful! Please check your email.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) setError(error.message);
      else {
        router.push('/finance');
        router.refresh();
      }
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <section className="card" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
        <p className="muted" style={{ letterSpacing: '.32em', fontSize: '11px', textTransform: 'uppercase', margin: 0 }}>Life OS</p>
        <h1 style={{ margin: '10px 0 8px', fontSize: '36px', lineHeight: 1, color: 'var(--text)' }}>
          {isRegister ? 'Register' : 'Login'}
        </h1>
        <p className="muted" style={{ marginTop: 0 }}>Satu akun Supabase. Data sync Android PWA, web, desktop.</p>

        <div className="authTabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border2)' }}>
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            style={{
              background: 'none',
              border: 'none',
              color: !isRegister ? 'var(--text)' : 'var(--text3)',
              fontWeight: 600,
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: !isRegister ? '2px solid var(--text)' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            style={{
              background: 'none',
              border: 'none',
              color: isRegister ? 'var(--text)' : 'var(--text3)',
              fontWeight: 600,
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: isRegister ? '2px solid var(--text)' : 'none'
            }}
          >
            Register
          </button>
        </div>

        {error && <div style={{ color: 'var(--red)', background: 'rgba(163,45,45,0.1)', border: '1px solid var(--red)', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>{error}</div>}
        {message && <div style={{ color: 'var(--green)', background: 'rgba(59,109,17,0.1)', border: '1px solid var(--green)', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>{message}</div>}

        <form onSubmit={handleEmailPassword} className="form">
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
          <hr style={{ flex: 1, border: 'none', height: '1px', background: 'var(--border2)' }} />
          <span className="muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>or</span>
          <hr style={{ flex: 1, border: 'none', height: '1px', background: 'var(--border2)' }} />
        </div>

        <button
          className="btn ghost"
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          style={{ width: '100%', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>
      </section>
    </main>
  );
}

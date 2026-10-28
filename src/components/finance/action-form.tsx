"use client";

import { useRef, useState, useTransition, type ReactNode } from 'react';

export function ActionForm({ action, children, className, lang = 'en' }: { action: (data: FormData) => Promise<{ error: string } | void>; children: ReactNode; className?: string; lang?: 'id' | 'en' }) {
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  return <form className={className} onSubmit={event => {
    event.preventDefault();
    if (lock.current) return;
    const data = new FormData(event.currentTarget);
    lock.current = true;
    setError('');
    startTransition(async () => {
      try {
        const result = await action(data);
        if (result?.error) setError(result.error);
      } catch (cause) {
        if (typeof cause === 'object' && cause !== null && 'digest' in cause && String(cause.digest).startsWith('NEXT_REDIRECT')) throw cause;
        setError(lang === 'id' ? 'Gagal menyimpan. Isian tetap tersedia; coba lagi.' : 'Unable to save. Your entries are preserved; try again.');
      } finally { lock.current = false; }
    });
  }}>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'contents' }}>{children}</fieldset>
    {pending && <p role="status">{lang === 'id' ? 'Menyimpan…' : 'Saving…'}</p>}
  </form>;
}

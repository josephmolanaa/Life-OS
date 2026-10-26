'use client';

import { useEffect, useRef, useState } from 'react';
import type { Lang } from '@/lib/i18n';

export type DailyQuest = { id: string; label: string; done: boolean };

// ponytail: only today's completion is stored; add history storage before showing streaks.
export function useDailyQuests(lang: Lang) {
  const [todos, setTodos] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/todos?timeZone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error();
      const rows: DailyQuest[] = await response.json();
      if (active) setTodos(rows);
    }).catch(() => { if (active) setError(lang === 'id' ? 'Checklist gagal dimuat. Muat ulang untuk mencoba lagi.' : 'Unable to load checklist. Refresh to retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lang]);

  async function save(method: string, id?: string, body?: unknown) {
    if (inFlight.current || loading) return false;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(id ? `/api/todos/${id}` : '/api/todos', {
        method, headers: { 'Content-Type': 'application/json' },
        ...(body !== undefined ? { body: JSON.stringify(body && typeof body === 'object' ? { ...(body as object), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone } : body) } : {}),
      });
      if (!response.ok) throw new Error();
      const saved: DailyQuest = await response.json();
      setTodos(current => method === 'DELETE' ? current.filter(todo => todo.id !== id)
        : id ? current.map(todo => todo.id === id ? saved : todo) : [saved, ...current]);
      return true;
    } catch {
      setError(lang === 'id' ? 'Perubahan belum tersimpan. Coba lagi; isian tetap tersedia.' : 'Changes were not saved. Retry; your input is still available.');
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return {
    todos, loading, busy, error,
    onAdd: (label: string) => save('POST', undefined, { label }),
    onToggle: (id: string, done: boolean) => save('PUT', id, { done }),
    onUpdate: (id: string, label: string) => save('PUT', id, { label }),
    onDelete: async (id: string) => {
      if (!window.confirm(lang === 'id' ? 'Hapus kebiasaan ini?' : 'Delete this habit?')) return false;
      return save('DELETE', id);
    },
  };
}

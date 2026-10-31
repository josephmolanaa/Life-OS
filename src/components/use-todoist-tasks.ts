'use client';

import { useEffect, useRef, useState } from 'react';
import type { Lang } from '@/lib/i18n';

export type DuckiesTask = {
  id: string;
  label: string;
  done: boolean;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  due_date?: string | null;
  due_time?: string | null;
};

// Feeds Duckies with real Todoist tasks (list_kind='task').
// An add from Duckies lands in Inbox (undated task). Toggling updates the same DB row the desktop Todoist views show.
export function useTodoistTasks(lang: Lang) {
  const [tasks, setTasks] = useState<DuckiesTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    fetch('/api/todos?kind=task', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error();
      const rows: DuckiesTask[] = await response.json();
      if (active) setTasks(rows);
    }).catch(() => { if (active) setError(lang === 'id' ? 'Tugas gagal dimuat. Muat ulang untuk mencoba lagi.' : 'Unable to load tasks. Refresh to retry.'); })
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
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error();
      const saved: DuckiesTask = await response.json();
      setTasks(current => method === 'DELETE' ? current.filter(item => item.id !== id)
        : id ? current.map(item => item.id === id ? saved : item) : [saved, ...current]);
      return true;
    } catch {
      setError(lang === 'id' ? 'Perubahan belum tersimpan. Coba lagi.' : 'Changes were not saved. Please retry.');
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return {
    tasks, loading, busy, error,
    onAdd: (label: string) => save('POST', undefined, { label, list_kind: 'task', priority: 'MEDIUM' }),
    onToggle: (id: string, done: boolean) => save('PUT', id, { done }),
    onDelete: (id: string) => save('DELETE', id),
  };
}

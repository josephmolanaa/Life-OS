"use client";

import { useEffect, useState } from 'react';
import { Shell } from '@/components/finance/layout';
import { DailyQuestCard } from '@/components/life-os-daily-quest';

type TodoRow = { id: string; label: string; done: boolean };
type TodoItem = { id: string; label: string; done: boolean; streak: number };

const defaultTodos = [
  'Workout pagi (Physic)',
  'Baca buku 20 mnt (Social/Career)',
  'Journal / reflection (Discipline)',
  'Belajar AI 1 jam (Career)',
  'Push GitHub Streak (Career)',
];

function mapTodoRows(rows: TodoRow[]): TodoItem[] {
  return rows.map((row) => ({ ...row, streak: row.done ? 1 : 0 }));
}

async function ensureTodos(): Promise<TodoItem[]> {
  const response = await fetch('/api/todos', { cache: 'no-store' });
  if (!response.ok) throw new Error('Failed to load todos');
  const rows = (await response.json()) as TodoRow[];
  if (rows.length) return mapTodoRows(rows);

  await Promise.all(defaultTodos.map((label) => fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  })));

  const seeded = await fetch('/api/todos', { cache: 'no-store' });
  return mapTodoRows(await seeded.json());
}

export default function HabitsPage() {
  const [todos, setTodos] = useState<TodoItem[]>([]);

  useEffect(() => {
    ensureTodos().then(setTodos).catch(() => setTodos(defaultTodos.map((label, index) => ({ id: `fallback-${index}`, label, done: false, streak: 0 }))));
  }, []);

  const handleToggle = async (id: string, checked: boolean) => {
    const nextTodos = todos.map((todo) => todo.id === id ? { ...todo, done: checked, streak: checked ? Math.max(1, todo.streak) : 0 } : todo);
    setTodos(nextTodos);
    await fetch(`/api/todos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: checked }) });
  };
  const handleUpdate = async (id: string, label: string) => {
    const nextTodos = todos.map((todo) => todo.id === id ? { ...todo, label } : todo);
    setTodos(nextTodos);
    await fetch(`/api/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
  };

  return (
    <Shell title="Habits" quickFab={false}>
      <div className="mx-auto flex flex-col" style={{ display: "flex", flexDirection: "column", width: "100%", gap: "clamp(20px, 3vw, 28px)" }}>
        <header className="card" style={{ padding: "clamp(24px, 4vw, 32px)" }}>
          <p className="muted" style={{ letterSpacing: '.32em', fontSize: '11px', textTransform: 'uppercase', margin: 0 }}>Habits</p>
          <h1 className="big" style={{ margin: '8px 0 6px', fontSize: '28px' }}>Daily Todo List</h1>
          <p className="muted" style={{ margin: 0 }}>Checklist harian terpisah dari dashboard utama.</p>
        </header>
        <DailyQuestCard todos={todos} onToggle={handleToggle} onUpdate={handleUpdate} />
      </div>
    </Shell>
  );
}

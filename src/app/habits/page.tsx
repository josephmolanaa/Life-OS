"use client";

import { useEffect, useState } from 'react';
import { Shell } from '@/components/finance/layout';
import { DailyQuestCard } from '@/components/life-os-daily-quest';
import { ContentSkeleton } from '@/components/app-loading';

type TodoRow = { id: string; label: string; done: boolean };
type TodoItem = { id: string; label: string; done: boolean; streak: number };

function mapTodoRows(rows: TodoRow[]): TodoItem[] {
  return rows.map((row) => ({ ...row, streak: row.done ? 1 : 0 }));
}

async function loadTodos(): Promise<TodoItem[]> {
  const response = await fetch('/api/todos', { cache: 'no-store' });
  if (!response.ok) throw new Error('Failed to load todos');
  return mapTodoRows(await response.json() as TodoRow[]);
}

export default function HabitsPage() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTodos()
      .then(setTodos)
      .catch(() => setError('Daily quests could not be loaded. Please refresh and try again.'))
      .finally(() => setLoading(false));
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
  const handleAdd = async (label: string) => {
    setError('');
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      if (!response.ok) throw new Error('Failed to add daily quest');
      const [quest] = mapTodoRows([await response.json() as TodoRow]);
      setTodos((current) => [quest, ...current]);
      return true;
    } catch {
      setError('Daily quest could not be added. Please try again.');
      return false;
    }
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this daily quest?')) return;
    setError('');
    try {
      const response = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete daily quest');
      setTodos((current) => current.filter((todo) => todo.id !== id));
    } catch {
      setError('Daily quest could not be deleted. Please try again.');
    }
  };

  return (
    <Shell title="Habits" quickFab={false}>
      <div className="mx-auto flex flex-col" style={{ display: "flex", flexDirection: "column", width: "100%", gap: "clamp(20px, 3vw, 28px)" }}>
        <header className="card" style={{ padding: "clamp(24px, 4vw, 32px)" }}>
          <p className="muted" style={{ letterSpacing: '.32em', fontSize: '11px', textTransform: 'uppercase', margin: 0 }}>Habits</p>
          <h1 className="big" style={{ margin: '8px 0 6px', fontSize: '28px' }}>Daily Todo List</h1>
          <p className="muted" style={{ margin: 0 }}>Checklist harian terpisah dari dashboard utama.</p>
        </header>
        {loading
          ? <ContentSkeleton variant="habits" />
          : <DailyQuestCard todos={todos} onToggle={handleToggle} onAdd={handleAdd} onUpdate={handleUpdate} onDelete={handleDelete} error={error} />}
      </div>
    </Shell>
  );
}

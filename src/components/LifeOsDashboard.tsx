"use client";

function getLifeOsDate() {
  return toLifeOsDateKey(new Date());
}

function toLifeOsDateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

function parseLifeOsDate(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(date);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseLocalTodos, todoStorageKey } from '@/lib/local-todos';
import { DailyQuestCard } from './life-os-daily-quest';
import { ModuleCards } from './life-os-module-cards';
import { DashboardCard, type DashboardCardProps } from './DashboardCard';
import {  Briefcase, HeartPulse, Users, Flame, Trash2, Plus, Pencil } from 'lucide-react';
import { PrivacyAmount } from './finance/privacy-amount';
import { PrivacyToggleButton } from './finance/privacy-toggle-button';
import { getLang, copy, type Lang, type Translation } from '@/lib/i18n';

type LifeOsDashboardProps = {
  financeSummary: {
    totalBalance: number;
    income: number;
    expense: number;
    savingRate: number;
  };
};

type TodoRow = { id: string; label: string; done: boolean; priority?: 'LOW' | 'MEDIUM' | 'HIGH' };
type TodoItem = { id: string; label: string; done: boolean; streak: number };
type ContribCell = { date: string; count: number };

function mapTodoRows(rows: TodoRow[]): TodoItem[] {
  return rows.map((row) => ({ ...row, streak: row.done ? 1 : 0 }));
}

async function ensureTodos(): Promise<TodoItem[]> {
  const response = await fetch('/api/todos', { cache: 'no-store' });
  if (!response.ok) throw new Error('Failed to load todos');
  const rows = (await response.json()) as TodoRow[];
  return mapTodoRows(rows);
}

function getInitialContribs(): ContribCell[] {
  const cells: ContribCell[] = [];
  const now = new Date();
  const currentDay = now.getDay();
  const endDate = new Date(now);
  endDate.setDate(now.getDate() + (currentDay === 0 ? 0 : 7 - currentDay));
  for (let i = 370; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(endDate.getDate() - i);
    cells.push({ date: toLifeOsDateKey(d), count: 0 });
  }
  return cells;
}

function ConsistencyGraph({ contribs, t, lang }: { contribs: ContribCell[]; t: Translation; lang: Lang }) {
  const colors = ["var(--surface2)", "rgba(76, 175, 80, 0.25)", "rgba(76, 175, 80, 0.45)", "rgba(76, 175, 80, 0.70)", "var(--green)"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const dateFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });
  const weeks = Array.from({ length: Math.ceil(contribs.length / 7) }, (_, index) => contribs.slice(index * 7, index * 7 + 7));
  const monthLabels = weeks.map((week, index) => {
    const firstMonthCell = week.find((cell) => parseLifeOsDate(cell.date).getDate() === 1) ?? (index === 0 ? week[0] : undefined);
    return firstMonthCell ? monthFormatter.format(parseLifeOsDate(firstMonthCell.date)) : '';
  });
  const dayLabels = [t.mon, '', t.wed, '', t.fri, '', ''];

  return (
    <section className="card" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "18px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>{t.consistency}</h2>
      </div>
      <div className="consistencyScroll">
        <div className="consistencyGrid">
          <div />
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks.length}, 1fr)`, gap: '3px', color: 'var(--text2)', fontSize: '12px', lineHeight: 1 }} aria-hidden="true">
            {monthLabels.map((label, index) => <span key={`${label}-${index}`} style={{ minWidth: 0 }}>{label}</span>)}
          </div>
          <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: '3px', color: 'var(--text2)', fontSize: '11px', alignItems: 'center' }} aria-hidden="true">
            {dayLabels.map((label, index) => <span key={`${label}-${index}`} style={{ height: '100%', display: 'flex', alignItems: 'center' }}>{label}</span>)}
          </div>
          <div role="list" aria-label={t.consistency} style={{ display: "grid", gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`, gridTemplateRows: "repeat(7, 1fr)", gridAutoFlow: "column", gap: "3px", width: "100%" }}>
          {weeks.flatMap((week) => week.map((cell) => {
            const cellDate = parseLifeOsDate(cell.date);
            const isFuture = cellDate > today;
            const level = Math.min(4, cell.count);
            const label = `${dateFormatter.format(cellDate)}: ${cell.count} ${t.tasksDone}`;
            
            return (
              <div 
                key={cell.date} 
                role="listitem"
                aria-hidden={isFuture}
                aria-label={isFuture ? undefined : label}
                title={isFuture ? undefined : label}
                style={{ 
                  aspectRatio: "1", 
                  borderRadius: "2px", 
                  background: isFuture ? "transparent" : colors[level], 
                  border: isFuture ? "none" : (level === 0 ? "1px solid var(--border)" : "none"),
                  opacity: isFuture ? 0 : 1
                }} 
              />
            );
          }))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EditableTodoList() {
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [newTodo, setNewTodo] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function request(url: string, options?: RequestInit) {
    const response = await fetch(url, { cache: 'no-store', ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Todo request failed');
    return data;
  }
  useEffect(() => {
    let active = true;
    request('/api/todos?kind=task').then(data => { if (active) setTodos(data); })
      .catch(() => { if (active) setError('Unable to load todos. Refresh to retry.'); })
      .finally(() => { if (active) setLoading(false); });
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!active || !user) return;
      setUserId(user.id);
    });
    return () => { active = false; };
  }, []);

  async function mutate(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save todo'); }
    finally { setBusy(false); }
  }
  const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  async function importLegacy(key: string) {
    await mutate(async () => {
      const items = parseLocalTodos(localStorage.getItem(key));
      if (!items.length) throw new Error('No browser todos found to import.');
      for (const item of items) {
        const rows: TodoRow[] = await request('/api/todos?kind=task');
        const existing = rows.find(row => row.label === item.label.trim());
        if (existing && (existing.done !== item.done || (existing.priority || 'MEDIUM') !== (item.priority || 'MEDIUM'))) {
          throw new Error(`Import conflict: ${item.label}. Original browser copy remains available.`);
        }
        if (!existing) await request('/api/todos', json('POST', { label: item.label, done: item.done, priority: item.priority, list_kind: 'task' }));
      }
      setTodos(await request('/api/todos?kind=task'));
      localStorage.setItem(`${key}:imported:${userId}`, 'true');
    });
  }
  return <section className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
    <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600 }}>Todo List</h2>
    <small className="muted" style={{ marginBottom: '16px' }}>Saved in database for this account</small>
    {error && <p role="alert">{error}</p>}
    {userId && <details style={{ marginBottom: '12px' }}>
      <summary style={{ cursor: 'pointer' }}>Import saved browser todos</summary>
      <p className="muted" style={{ margin: '8px 0' }}>Import into this account. Browser backup kept.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button className="btn" disabled={busy || loading} onClick={() => importLegacy(todoStorageKey(userId))}>This account’s saved todos</button>
        <button className="btn" disabled={busy || loading} onClick={() => importLegacy('editable-todos')}>Older browser todos</button>
      </div>
    </details>}
    {loading ? <p role="status">Loading todos...</p> : <div className="list" style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
      {todos.map(todo => <div key={todo.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '12px', borderRadius: '8px', background: 'var(--surface2)' }}>
        <input type="checkbox" checked={todo.done} disabled={busy} aria-label={`Toggle ${todo.label}`} onChange={() => mutate(async () => {
          const saved = await request(`/api/todos/${todo.id}`, json('PUT', { done: !todo.done }));
          setTodos(current => current.map(row => row.id === todo.id ? saved : row));
        })} />
        <span style={{ flex: '1 1 100px', overflowWrap: 'anywhere', textDecoration: todo.done ? 'line-through' : 'none' }}>{todo.label}</span>
        <small>{todo.priority || 'MEDIUM'}</small>
        <button className="btn" disabled={busy} aria-label={`Edit ${todo.label}`} onClick={() => { setEditingId(todo.id); setNewTodo(todo.label); setPriority(todo.priority || 'MEDIUM'); }}><Pencil size={15}/></button>
        <button className="btn" disabled={busy} aria-label={`Delete ${todo.label}`} onClick={() => mutate(async () => {
          await request(`/api/todos/${todo.id}`, { method: 'DELETE' });
          setTodos(current => current.filter(row => row.id !== todo.id));
          if (editingId === todo.id) { setEditingId(null); setNewTodo(''); }
        })}><Trash2 size={15}/></button>
      </div>)}
      {!todos.length && <p className="muted">No todos yet.</p>}
    </div>}
    <form className="dailyQuestForm dailyQuestFormWithPriority" onSubmit={event => {
      event.preventDefault();
      if (busy || !newTodo.trim()) return;
      void mutate(async () => {
        const saved = await request(editingId ? `/api/todos/${editingId}` : '/api/todos', json(editingId ? 'PUT' : 'POST', { label: newTodo.trim(), priority, ...(!editingId ? { list_kind: 'task' } : {}) }));
        setTodos(current => editingId ? current.map(row => row.id === editingId ? saved : row) : [saved, ...current]);
        setNewTodo(''); setEditingId(null);
      });
    }}>
      <input className="input" aria-label={editingId ? 'Edit todo' : 'New todo'} maxLength={120} required disabled={busy || loading} value={newTodo} onChange={event => setNewTodo(event.target.value)} placeholder="New todo..." />
      <select className="input" aria-label="Todo priority" disabled={busy || loading} value={priority} onChange={event => setPriority(event.target.value as typeof priority)}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select>
      <button type="submit" className="btn" disabled={busy || loading || !newTodo.trim()}>{editingId ? 'Save' : <><Plus size={14}/> Add</>}</button>
    </form>
    {editingId && <button className="btn" disabled={busy} onClick={() => { setEditingId(null); setNewTodo(''); }}>Cancel editing</button>}
  </section>;
}

export function LifeOsDashboard({ financeSummary }: LifeOsDashboardProps) {
  const [lang, setLang] = useState<Lang>('en');
  const [t, setT] = useState<Translation>(copy.en);

  const [awStatus, setAwStatus] = useState('Checking...');
  const [awCategories, setAwCategories] = useState<Array<{ category: string; minutes: number }>>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [questsLoading, setQuestsLoading] = useState(true);
  const [questError, setQuestError] = useState('');
  const [initialContribs] = useState(getInitialContribs);
  const today = getLifeOsDate();
  const doneCount = todos.filter(todo => todo.done).length;
  const contribs = initialContribs.map(cell => cell.date === today ? { ...cell, count: doneCount } : cell);

  const [careerProgress, setCareerProgress] = useState('0%');
  const [disciplineScore, setDisciplineScore] = useState('0%');

  useEffect(() => {
    getLang().then(l => {
      setLang(l);
      setT(copy[l]);
    });

    ensureTodos().then(fetched => {
      setTodos(fetched);
    }).catch(() => setQuestError('Daily quests could not be loaded. Please refresh and try again.'))
      .finally(() => setQuestsLoading(false));

    fetch('/api/career/hours').then(res => res.json()).then(data => {
      if (data.summary) {
        const logged = data.summary.reduce((a: number, b: { loggedHours?: number }) => a + (b.loggedHours || 0), 0);
        setCareerProgress(`${Math.round(logged)}h logged`);
      }
    }).catch(() => {});

    fetch('/api/discipline').then(res => res.json()).then(data => {
      if (data && data.length > 0) {
        setDisciplineScore(`${Math.round(data[0].total_score)}%`);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchAw = async () => {
      try {
        const res = await fetch('/api/activitywatch-data?range=1d');
        if (!res.ok) throw new Error();
        const data = await res.json();
        const categoryMap: Record<string, number> = {};
        
        if (data.timelineData && data.timelineData.length > 0) {
            data.timelineData.forEach((hour: Record<string, unknown>) => {
                for (const key in hour) {
                    if (key !== 'label' && key !== 'dateStr' && typeof hour[key] === 'number') {
                        categoryMap[key] = (categoryMap[key] || 0) + (hour[key] as number);
                    }
                }
            });
        }
        
        const sorted = Object.entries(categoryMap)
            .map(([category, minutes]) => ({ category, minutes }))
            .filter(cat => cat.minutes > 0)
            .sort((a, b) => b.minutes - a.minutes);
        
        if (sorted.length) {
            setAwCategories(sorted);
            setAwStatus(data.status || 'Live Connected');
        } else {
            setAwCategories([]);
            setAwStatus('No activity in 24h');
        }
      } catch {
        setAwStatus('Offline');
        setAwCategories([]);
      }
    };

    fetchAw();
    const interval = setInterval(fetchAw, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateHabit = async (id: string, label: string) => {
    const nextTodos = todos.map((todo) => todo.id === id ? { ...todo, label } : todo);
    setTodos(nextTodos);
    await fetch(`/api/todos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
  };

  const handleAddHabit = async (label: string) => {
    setQuestError('');
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
      setQuestError('Daily quest could not be added. Please try again.');
      return false;
    }
  };

  const handleDeleteHabit = async (id: string) => {
    if (!window.confirm('Delete this daily quest?')) return;
    setQuestError('');
    try {
      const response = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete daily quest');
      setTodos((current) => current.filter((todo) => todo.id !== id));
    } catch {
      setQuestError('Daily quest could not be deleted. Please try again.');
    }
  };

  const handleToggle = async (id: string, checked: boolean) => {
    const nextTodos = todos.map((todo) => todo.id === id ? { ...todo, done: checked, streak: checked ? Math.max(1, todo.streak) : 0 } : todo);
    setTodos(nextTodos);
    await fetch(`/api/todos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: checked }) });
  };

  const pillars: DashboardCardProps[] = [
    { title: t.financial, value: <PrivacyAmount value={`Rp ${financeSummary.totalBalance.toLocaleString('id-ID')}`} />, icon: <Briefcase />, action: <PrivacyToggleButton />, link: '/finance' },
    { title: t.careerAi, value: careerProgress, icon: <Briefcase />, link: '/career' },
    { title: 'Physique', value: t.active, icon: <HeartPulse />, link: '/physique' },
    { title: 'Social', value: t.good, icon: <Users />, link: '/social' },
    { title: 'Discipline', value: disciplineScore, icon: <Flame />, link: '/discipline' },
  ];

  return (
    <div className="lifeDashboard">
      <div className="dashboardPillars">
        {pillars.map(p => <DashboardCard key={p.title} {...p} />)}
      </div>

      <ConsistencyGraph contribs={contribs} t={t} lang={lang} />

      <div className="dashboardSplit">
        {questsLoading
          ? <div className="card skeletonBlock" aria-label="Loading daily quests" />
          : <DailyQuestCard todos={todos} onToggle={handleToggle} onAdd={handleAddHabit} onUpdate={handleUpdateHabit} onDelete={handleDeleteHabit} error={questError} />}
        <EditableTodoList />
      </div>

      <ModuleCards financeSummary={{ income: financeSummary.income, expense: financeSummary.expense }} awStatus={awStatus} awCategories={awCategories} />
    </div>
  );
}







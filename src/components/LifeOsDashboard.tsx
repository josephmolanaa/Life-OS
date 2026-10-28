"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseLocalTodos, todoStorageKey } from '@/lib/local-todos';
import { DailyQuestCard } from './life-os-daily-quest';
import { useDailyQuests } from './use-daily-quests';
import { ModuleCards } from './life-os-module-cards';
import { DashboardCard, type DashboardCardProps } from './DashboardCard';
import {  Briefcase, HeartPulse, Users, Flame, Trash2, Plus, Pencil } from 'lucide-react';
import { PrivacyAmount } from './finance/privacy-amount';
import { PrivacyToggleButton } from './finance/privacy-toggle-button';
import { getLang, copy, type Lang } from '@/lib/i18n';

type LifeOsDashboardProps = {
  financeSummary: {
    totalBalance: number;
    income: number;
    expense: number;
    savingRate: number;
  } | null;
  consistencyHistory?: Record<string, number>;
};

type TodoRow = { id: string; label: string; done: boolean; priority?: 'LOW' | 'MEDIUM' | 'HIGH' };

function ConsistencyGraph({ todos, lang, history = {} }: { todos: { done: boolean }[]; lang: Lang; history?: Record<string, number> }) {
  const completed = todos.filter(todo => todo.done).length;
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());
  const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const cells = Array.from({ length: 371 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    return { date: key, count: history[key] ?? (key === todayKey ? completed : 0) };
  });
  const weeks = Array.from({ length: 53 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
  let previousMonthIndex = -4;
  const monthLabels = weeks.map((week, index) => {
    const first = week.find(cell => cell.date.endsWith('-01'));
    if (!first && index !== 0) return '';
    // Leave enough columns between labels so short months never touch each other.
    if (index - previousMonthIndex < 4) return '';
    const value = first?.date ?? week[0]?.date;
    previousMonthIndex = index;
    return value ? new Date(`${value}T00:00:00`).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short' }) : '';
  });
  const id = lang === 'id';
  const dayLabels = id ? ['Min', '', 'Sel', '', 'Kam', '', 'Sab'] : ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'];
  return <section className="card consistencyCard" aria-label={id ? 'Grafik konsistensi' : 'Consistency graph'}>
    <div className="consistencyHeader"><div><h2>{id ? 'Grafik konsistensi' : 'Consistency graph'}</h2><p className="muted">{id ? 'Aktivitas checklist selama setahun' : 'Checklist activity over the last year'}</p></div><strong>{completed}/{todos.length || 0}</strong></div>
    <div className="consistencyScroll" role="img" aria-label={`${completed} ${id ? 'tugas selesai hari ini' : 'tasks completed today'}`}>
      <div className="consistencyYearGrid">
        <div className="consistencyMonths" aria-hidden="true">{monthLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
        <div className="consistencyDayLabels" aria-hidden="true">{dayLabels.map((label, index) => <span key={index}>{label}</span>)}</div>
        <div className="consistencyWeekGrid">{weeks.map((week, weekIndex) => <div className="consistencyWeek" key={weekIndex}>{week.map(({ date, count }) => <span key={date} className={count ? `isDone consistencyLevel${Math.min(4, count)}` : ''} title={`${date}: ${count} ${id ? 'tugas selesai' : 'tasks completed'}`} />)}</div>)}</div>
      </div>
    </div>
  </section>;
}

function DashboardQuestLoading({ lang }: { lang: Lang }) {
  const id = lang === 'id';
  return <section className="card dailyQuestCard dashboardInlineLoading" aria-busy="true" aria-label={id ? 'Memuat kebiasaan' : 'Loading habits'}>
    <div className="dashboardLoadingHeader"><div><h2>{id ? 'Kebiasaan hari ini' : 'Today’s habits'}</h2><span className="loadingLine" /></div><span className="loadingLine dashboardLoadingIcon" /></div>
    <div className="dashboardLoadingRows">{[0, 1, 2].map(index => <div className="dailyQuestItem" key={index}><span className="loadingLine dashboardLoadingCheck" /><span className="loadingLine" /><span className="loadingLine dashboardLoadingAction" /></div>)}</div>
    <div className="dailyQuestForm"><span className="loadingLine" /><span className="loadingLine dashboardLoadingButton" /></div>
  </section>;
}
function EditableTodoList({ lang }: { lang: Lang }) {
  const id = lang === 'id';
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasLegacy, setHasLegacy] = useState(false);
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
      try { setHasLegacy(parseLocalTodos(localStorage.getItem(todoStorageKey(user.id))).length > 0 || parseLocalTodos(localStorage.getItem('editable-todos')).length > 0); } catch { /* Browser backups unavailable. */ }
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
    <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600 }}>{id ? 'Daftar tugas' : 'Tasks'}</h2>
    <small className="muted" style={{ marginBottom: '16px' }}>{id ? 'Tugas tersimpan di akun; tidak direset setiap hari.' : 'Saved to your account; tasks do not reset daily.'}</small>
    {error && <p role="alert">{error}</p>}
    {userId && hasLegacy && <details style={{ marginBottom: '12px' }}>
      <summary style={{ cursor: 'pointer' }}>{id ? 'Impor tugas dari browser' : 'Import saved browser tasks'}</summary>
      <p className="muted" style={{ margin: '8px 0' }}>{id ? 'Impor ke akun ini. Cadangan browser tetap tersedia.' : 'Import into this account. Browser backup kept.'}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button className="btn" disabled={busy || loading} onClick={() => importLegacy(todoStorageKey(userId))}>{id ? 'Cadangan akun ini' : 'This account’s saved tasks'}</button>
        <button className="btn" disabled={busy || loading} onClick={() => importLegacy('editable-todos')}>{id ? 'Cadangan browser lama' : 'Older browser tasks'}</button>
      </div>
    </details>}
    {loading ? <p role="status">{id ? 'Memuat tugas...' : 'Loading tasks...'}</p> : <div className="list" style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
      {todos.map(todo => <div key={todo.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '12px', borderRadius: '8px', background: 'var(--surface2)' }}>
        <input type="checkbox" checked={todo.done} disabled={busy} aria-label={`Toggle ${todo.label}`} onChange={() => mutate(async () => {
          const saved = await request(`/api/todos/${todo.id}`, json('PUT', { done: !todo.done }));
          setTodos(current => current.map(row => row.id === todo.id ? saved : row));
        })} />
        <span style={{ flex: '1 1 100px', overflowWrap: 'anywhere', textDecoration: todo.done ? 'line-through' : 'none' }}>{todo.label}</span>
        <small>{id ? ({ LOW: 'Rendah', MEDIUM: 'Sedang', HIGH: 'Tinggi' }[todo.priority || 'MEDIUM']) : todo.priority || 'MEDIUM'}</small>
        <button className="btn" disabled={busy} aria-label={`Edit ${todo.label}`} onClick={() => { setEditingId(todo.id); setNewTodo(todo.label); setPriority(todo.priority || 'MEDIUM'); }}><Pencil size={15}/></button>
        <button className="btn" disabled={busy} aria-label={`Delete ${todo.label}`} onClick={() => { if (!window.confirm(id ? 'Hapus tugas ini?' : 'Delete this task?')) return; void mutate(async () => {
          await request(`/api/todos/${todo.id}`, { method: 'DELETE' });
          setTodos(current => current.filter(row => row.id !== todo.id));
          if (editingId === todo.id) { setEditingId(null); setNewTodo(''); }
        }); }}><Trash2 size={15}/></button>
      </div>)}
      {!todos.length && <p className="muted">{id ? 'Belum ada tugas.' : 'No tasks yet.'}</p>}
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
      <input className="input" aria-label={id ? (editingId ? 'Ubah tugas' : 'Tugas baru') : (editingId ? 'Edit task' : 'New task')} maxLength={120} required disabled={busy || loading} value={newTodo} onChange={event => setNewTodo(event.target.value)} placeholder={id ? 'Tugas baru...' : 'New task...'} />
      <select className="input" aria-label={id ? 'Prioritas tugas' : 'Task priority'} disabled={busy || loading} value={priority} onChange={event => setPriority(event.target.value as typeof priority)}><option value="LOW">{id ? 'Rendah' : 'Low'}</option><option value="MEDIUM">{id ? 'Sedang' : 'Medium'}</option><option value="HIGH">{id ? 'Tinggi' : 'High'}</option></select>
      <button type="submit" className="btn" disabled={busy || loading || !newTodo.trim()}>{editingId ? (id ? 'Simpan' : 'Save') : <><Plus size={14}/> {id ? 'Tambah' : 'Add'}</>}</button>
    </form>
    {editingId && <button className="btn" disabled={busy} onClick={() => { setEditingId(null); setNewTodo(''); }}>{id ? 'Batal mengubah' : 'Cancel editing'}</button>}
  </section>;
}

export function LifeOsDashboard({ financeSummary, consistencyHistory }: LifeOsDashboardProps) {
  const [lang, setLang] = useState<Lang>('en');
  const t = copy[lang];
  const id = lang === 'id';
  const quests = useDailyQuests(lang);
  const [awStatus, setAwStatus] = useState('...');
  const [awCategories, setAwCategories] = useState<Array<{ category: string; minutes: number }>>([]);
  const [careerHours, setCareerHours] = useState<number | null>();
  const [discipline, setDiscipline] = useState<{ score: number; date: string } | null>();
  const [disciplineError, setDisciplineError] = useState(false);

  useEffect(() => {
    getLang().then(setLang);
    fetch('/api/career/hours').then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!Array.isArray(data.summary)) throw new Error();
      setCareerHours(data.summary.reduce((total: number, skill: { loggedHours?: number }) => total + (skill.loggedHours || 0), 0));
    }).catch(() => setCareerHours(null));
    fetch('/api/discipline').then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error();
      setDiscipline(data.length ? { score: data[0].total_score, date: data[0].date } : null);
    }).catch(() => setDisciplineError(true));
  }, []);

  useEffect(() => {
    let active = true;
    const fetchAw = async () => {
      try {
        const response = await fetch('/api/activitywatch-data?range=1d');
        if (!response.ok) throw new Error();
        const data = await response.json();
        const totals: Record<string, number> = {};
        for (const hour of data.timelineData || []) {
          for (const [key, value] of Object.entries(hour)) {
            if (key !== 'label' && key !== 'dateStr' && typeof value === 'number') totals[key] = (totals[key] || 0) + value;
          }
        }
        const categories = Object.entries(totals).map(([category, minutes]) => ({ category, minutes })).filter(row => row.minutes > 0).sort((a, b) => b.minutes - a.minutes);
        if (active) {
          setAwCategories(categories);
          setAwStatus(categories.length ? (id ? 'Aktivitas 24 jam terakhir' : 'Activity in the last 24 hours') : (id ? 'Belum ada aktivitas dalam 24 jam' : 'No activity in the last 24 hours'));
        }
      } catch {
        if (active) {
          setAwStatus(id ? 'Aktivitas tidak tersedia. Buka ActivityWatch untuk mencoba lagi.' : 'Activity unavailable. Open ActivityWatch to retry.');
          setAwCategories([]);
        }
      }
    };
    void fetchAw();
    const interval = setInterval(fetchAw, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [id]);

  const unavailable = id ? 'Gagal dimuat' : 'Unavailable';
  const loading = id ? 'Memuat...' : 'Loading...';
  const today = new Date();
  const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const pillars: DashboardCardProps[] = [
    { title: t.financial, value: financeSummary ? <PrivacyAmount value={`Rp ${financeSummary.totalBalance.toLocaleString('id-ID')}`} /> : unavailable, icon: <Briefcase />, action: <PrivacyToggleButton />, link: '/finance' },
    { title: t.careerAi, value: careerHours === undefined ? loading : careerHours === null ? unavailable : `${Math.round(careerHours)} ${id ? 'jam tercatat' : 'hours logged'}`, icon: <Briefcase />, link: '/career' },
    { title: id ? 'Fisik' : 'Physique', value: id ? 'Catatan latihan' : 'Workout log', icon: <HeartPulse />, link: '/physique' },
    { title: id ? 'Sosial' : 'Social', value: id ? 'Relasi & aktivitas' : 'People & activity', icon: <Users />, link: '/social' },
    { title: id ? 'Disiplin' : 'Discipline', value: disciplineError ? unavailable : discipline === undefined ? loading : discipline ? `${Math.round(discipline.score)}% (${discipline.date === todayKey ? (id ? 'hari ini' : 'today') : discipline.date})` : (id ? 'Belum dicatat' : 'No entries'), icon: <Flame />, link: '/discipline' },
  ];

  return <div className="lifeDashboard">
    <div className="dashboardSplit">
      {quests.loading ? <DashboardQuestLoading lang={lang} /> : <DailyQuestCard {...quests} lang={lang} />}
      <EditableTodoList lang={lang} />
    </div>
    <div className="dashboardPillars">
      {pillars.map(pillar => <DashboardCard key={pillar.title} {...pillar} linkText={id ? 'Buka' : 'Open'} />)}
    </div>
    <ConsistencyGraph todos={quests.todos} lang={lang} history={consistencyHistory} />
    <ModuleCards financeSummary={financeSummary} awStatus={awStatus} awCategories={awCategories} lang={lang} />
  </div>;
}

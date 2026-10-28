"use client";

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseLocalTodos, todoStorageKey } from '@/lib/local-todos';
import { filterTasks } from '@/lib/task-view';
import { DailyQuestCard } from './life-os-daily-quest';
import { useDailyQuests } from './use-daily-quests';
import { ModuleCards } from './life-os-module-cards';
import { DashboardCard, type DashboardCardProps } from './DashboardCard';
import {  Briefcase, HeartPulse, Users, Flame, Trash2, Plus, Pencil } from 'lucide-react';
import { PrivacyAmount } from './finance/privacy-amount';
import { PrivacyToggleButton } from './finance/privacy-toggle-button';
import { getLang, copy, type Lang } from '@/lib/i18n';
import { DailyQuestSkeleton, TodoRowsSkeleton } from './skeleton';

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

const dateKey = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');

// GitHub-style contribution calendar: 53 week columns × 7 weekday rows, fixed cell size, 5 levels.
function ConsistencyGraph({ todos, lang, history = {} }: { todos: { done: boolean }[]; lang: Lang; history?: Record<string, number> }) {
  const id = lang === 'id';
  const locale = id ? 'id-ID' : 'en-US';
  const scrollRef = useRef<HTMLDivElement>(null);
  // Newest week sits on the right; start scrolled there on narrow screens like GitHub.
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollLeft = el.scrollWidth; }, []);

  const completed = todos.filter(todo => todo.done).length;
  const today = new Date();
  const todayKey = dateKey(today);
  const start = new Date(today);
  start.setDate(today.getDate() - 364 - today.getDay());
  const weeks: { date: string; count: number; future: boolean }[][] = [];
  for (let index = 0; index < 371; index++) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    if (index % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({ date: key, count: history[key] ?? (key === todayKey ? completed : 0), future: key > todayKey });
  }
  const total = weeks.flat().reduce((sum, cell) => sum + (cell.future ? 0 : cell.count), 0);
  // Label a column when its week contains the 1st of a month (first column only if its month has room).
  const months: { label: string; column: number }[] = [];
  weeks.forEach((week, column) => {
    const first = week.find(cell => cell.date.endsWith('-01'));
    if (!first && column !== 0) return;
    if (column === 0 && week[0].date.slice(8) > '24') return;
    months.push({ label: new Date(`${(first ?? week[0]).date}T00:00:00`).toLocaleDateString(locale, { month: 'short' }), column });
  });
  const level = (count: number) => Math.min(4, count);
  const dayLabels = id ? ['', 'Sen', '', 'Rab', '', 'Jum', ''] : ['', 'Mon', '', 'Wed', '', 'Fri', ''];
  const unit = id ? 'tugas selesai' : 'tasks completed';

  return <section className="card consistencyCard" aria-label={id ? 'Grafik konsistensi' : 'Consistency graph'}>
    <div className="consistencyHeader">
      <h2>{total} {id ? 'tugas selesai dalam setahun terakhir' : 'tasks completed in the last year'}</h2>
      <span className="consistencyToday">{id ? 'Hari ini' : 'Today'} {completed}/{todos.length}</span>
    </div>
    <div className="consistencyScroll" ref={scrollRef}>
      <div className="consistencyCalendar" role="img" aria-label={`${total} ${unit}`}>
        <div className="consistencyMonths" aria-hidden="true">{months.map(month => <span key={month.column} style={{ gridColumnStart: month.column + 1 }}>{month.label}</span>)}</div>
        <div className="consistencyDayLabels" aria-hidden="true">{dayLabels.map((label, index) => <span key={index}>{label}</span>)}</div>
        <div className="consistencyCells">{weeks.flat().map(cell => <span key={cell.date} data-level={cell.future ? undefined : level(cell.count)} className={cell.future ? 'isFuture' : undefined} title={cell.future ? undefined : `${cell.count} ${unit} · ${new Date(`${cell.date}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`} />)}</div>
      </div>
    </div>
    <div className="consistencyLegend" aria-hidden="true">{id ? 'Sedikit' : 'Less'}{[0, 1, 2, 3, 4].map(value => <span key={value} data-level={value} />)}{id ? 'Banyak' : 'More'}</div>
  </section>;
}

function DashboardQuestLoading({ lang }: { lang: Lang }) {
  return <div role="status" aria-busy="true" aria-label={lang === 'id' ? 'Memuat kebiasaan' : 'Loading habits'} style={{ display: 'grid' }}><DailyQuestSkeleton /></div>;
}
export function EditableTodoList({ lang, expanded = false }: { lang: Lang; expanded?: boolean }) {
  const id = lang === 'id';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const mutationPending = useRef(false);
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasLegacy, setHasLegacy] = useState(false);
  const [newTodo, setNewTodo] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const visibleTodos = expanded ? filterTasks(todos, filter, search) : todos;

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
    if (mutationPending.current) return;
    mutationPending.current = true;
    setBusy(true);
    setError('');
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save todo'); }
    finally { mutationPending.current = false; setBusy(false); }
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
    {expanded && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
      <input className="input" type="search" aria-label={id ? 'Cari tugas' : 'Search tasks'} placeholder={id ? 'Cari tugas…' : 'Search tasks…'} value={search} onChange={event => setSearch(event.target.value)} />
      <select className="input" aria-label={id ? 'Status tugas' : 'Task status'} value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
        <option value="active">{id ? 'Aktif' : 'Active'} ({todos.filter(todo => !todo.done).length})</option>
        <option value="completed">{id ? 'Selesai' : 'Completed'} ({todos.filter(todo => todo.done).length})</option>
        <option value="all">{id ? 'Semua' : 'All'} ({todos.length})</option>
      </select>
    </div>}
    {error && <p role="alert">{error}</p>}
    {userId && hasLegacy && <details style={{ marginBottom: '12px' }}>
      <summary style={{ cursor: 'pointer' }}>{id ? 'Impor tugas dari browser' : 'Import saved browser tasks'}</summary>
      <p className="muted" style={{ margin: '8px 0' }}>{id ? 'Impor ke akun ini. Cadangan browser tetap tersedia.' : 'Import into this account. Browser backup kept.'}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button className="btn" disabled={busy || loading} onClick={() => importLegacy(todoStorageKey(userId))}>{id ? 'Cadangan akun ini' : 'This account’s saved tasks'}</button>
        <button className="btn" disabled={busy || loading} onClick={() => importLegacy('editable-todos')}>{id ? 'Cadangan browser lama' : 'Older browser tasks'}</button>
      </div>
    </details>}
    {loading ? <div role="status" aria-busy="true" aria-label={id ? 'Memuat tugas' : 'Loading tasks'}><TodoRowsSkeleton /></div> : <div className="list" style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
      {visibleTodos.map(todo => <div key={todo.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '12px', borderRadius: '8px', background: 'var(--surface2)' }}>
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
      {!visibleTodos.length && <p className="muted">{id ? 'Tidak ada tugas dalam tampilan ini. Tambahkan tugas atau ubah filter.' : 'No tasks in this view. Add a task or change the filter.'}</p>}
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

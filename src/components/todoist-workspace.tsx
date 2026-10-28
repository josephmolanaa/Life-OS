'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Plus, SlidersHorizontal, Pencil, Trash2, CalendarDays, Clock } from 'lucide-react';
import { Shell } from './finance/layout';
import { getLang, type Lang } from '@/lib/i18n';
import { addDays, localDate, visibleTasks, parseTaskDateInput, type Task, type TaskView } from '@/lib/todoist';

type Layout = 'list' | 'board' | 'calendar';
import styles from './todoist.module.css';

async function request(url: string, method = 'GET', body?: unknown) {
  const response = await fetch(url, { method, cache: 'no-store', ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export default function TodoistWorkspace({ view }: { view: TaskView }) {
  const [lang, setLang] = useState<Lang>('en');
  const id = lang === 'id';
  const text = (en: string, indo: string) => id ? indo : en;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dates, setDates] = useState(false);
  const [times, setTimes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [today, setToday] = useState(localDate);
  const [start, setStart] = useState(localDate);
  const [layout, setLayout] = useState<Layout>('list');
  const [month, setMonth] = useState(() => localDate().slice(0, 7) + '-01');
  const [completed, setCompleted] = useState(false);
  const [grouping, setGrouping] = useState('none');
  const [sort, setSort] = useState('default');
  const [priority, setPriority] = useState('all');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<{ id?: string; label: string; priority: Task['priority']; due_date: string; due_time: string } | null>(null);
  const display = useRef<HTMLDetailsElement>(null);
  const names = { inbox: 'Inbox', today: text('Today', 'Hari ini'), upcoming: text('Upcoming', 'Mendatang') };
  async function load() {
    setLoading(true); setError('');
    try {
      const [rows, capability] = await Promise.all([request('/api/todos?kind=task'), request('/api/todos?capabilities=true')]);
      setTasks(rows); setDates(capability.dueDate); setTimes(capability.dueTime);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load tasks'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    getLang().then(setLang);
    void load();
    const timer = setInterval(() => setToday(localDate()), 60000);
    const onPointerDown = (event: MouseEvent) => {
      if (display.current?.open && !display.current.contains(event.target as Node)) {
        display.current.open = false;
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      clearInterval(timer);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);
  async function mutate(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save task'); }
    finally { lock.current = false; setBusy(false); }
  }
  const monthLast = (value: string) => addDays(`${value.slice(0, 8)}01`, 32).slice(0, 7) + '-01';
  const monthEnd = (value: string) => addDays(monthLast(value), -1);
  const calendarStart = (() => { const first = `${month.slice(0, 7)}-01`; const day = new Date(`${first}T12:00:00`).getDay(); return addDays(first, day === 0 ? -6 : 1 - day); })();
  const calendarDays = Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index));
  const calendarEnd = calendarDays[calendarDays.length - 1];
  const rows = visibleTasks(tasks, view, today, start, completed, priority, search, sort, layout === 'calendar' && view === 'upcoming' ? calendarEnd : undefined);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(id ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' });
  const priorityLabel = (value: string) => ({ HIGH: text('High', 'Tinggi'), MEDIUM: text('Medium', 'Sedang'), LOW: text('Low', 'Rendah') }[value] || value);
  const groups = new Map<string, Task[]>();
  if (view === 'upcoming') days.forEach(day => groups.set(day, []));
  if (view === 'today') { if (rows.some(task => task.due_date! < today)) groups.set('overdue', []); groups.set(today, []); }
  for (const task of rows) {
    const key = view === 'upcoming' ? task.due_date! : view === 'today' ? task.due_date! < today ? 'overdue' : today : grouping === 'date' ? task.due_date || 'undated' : grouping === 'priority' ? task.priority : 'all';
    groups.set(key, [...(groups.get(key) || []), task]);
  }
  if (!groups.size) groups.set('all', []);
  const openAdd = (date = '', time = '') => setDraft({ label: '', priority: 'MEDIUM', due_date: dates ? date : '', due_time: time });
  const heading = (key: string) => key === 'all' ? '' : key === 'overdue' ? text('Overdue', 'Terlambat') : key === 'undated' ? text('No date', 'Tanpa tanggal') : ['HIGH', 'MEDIUM', 'LOW'].includes(key) ? priorityLabel(key) : `${dateLabel(key)}${key === today ? text(' · Today', ' · Hari ini') : ''}`;
  return <Shell title="Todoist" quickFab={false}><div className={`${styles.workspace} ${layout !== 'list' ? styles.wide : ''}`}>
    <div className={styles.toolbar}><nav aria-label="Todoist">{(['inbox', 'today', 'upcoming'] as const).map(item => <Link key={item} href={`/todoist/${item}`} aria-current={item === view ? 'page' : undefined}>{names[item]}</Link>)}</nav>
      <div className={styles.toolbarActions}><input className={styles.search} type="search" aria-label={text('Search tasks', 'Cari tugas')} placeholder={text('Search tasks', 'Cari tugas')} value={search} onChange={event => setSearch(event.target.value)} />
      <details ref={display} className={styles.display} onKeyDown={event => { if (event.key === 'Escape') { display.current!.open = false; display.current?.querySelector('summary')?.focus(); } }}><summary aria-label={text('Display', 'Tampilan')} title={text('Display', 'Tampilan')}><SlidersHorizontal size={16} aria-hidden="true" /></summary><div className={styles.panel}>
        <fieldset><legend>Layout</legend>{(['list', 'board', 'calendar'] as const).map(value => <button key={value} type="button" aria-pressed={layout === value} onClick={() => setLayout(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</fieldset>
        <label className={styles.toggle}><input type="checkbox" checked={completed} onChange={event => setCompleted(event.target.checked)} />{text('Completed tasks', 'Tugas selesai')}</label>
        <label>{text('Grouping', 'Pengelompokan')}<select value={view === 'inbox' ? grouping : 'date'} disabled={view !== 'inbox'} onChange={event => setGrouping(event.target.value)}><option value="none">{text('None', 'Tidak ada')}</option><option value="date">{text('Date', 'Tanggal')}</option><option value="priority">{text('Priority', 'Prioritas')}</option></select></label>
        {view !== 'inbox' && <small>{text('This view groups tasks by date.', 'Tampilan ini mengelompokkan tugas per tanggal.')}</small>}
        <label>{text('Sorting', 'Urutan')}<select value={sort} onChange={event => setSort(event.target.value)}><option value="default">{text('Default', 'Bawaan')}</option><option value="date">{text('Date', 'Tanggal')}</option><option value="priority">{text('Priority', 'Prioritas')}</option><option value="title">{text('Title', 'Judul')}</option></select></label>
        <label>{text('Priority', 'Prioritas')}<select value={priority} onChange={event => setPriority(event.target.value)}><option value="all">{text('All', 'Semua')}</option>{['HIGH', 'MEDIUM', 'LOW'].map(value => <option key={value} value={value}>{priorityLabel(value)}</option>)}</select></label>
        <button type="button" onClick={() => { setLayout('list'); setMonth(localDate().slice(0, 7) + '-01'); setCompleted(false); setGrouping('none'); setSort('default'); setPriority('all'); }}>{text('Reset all', 'Reset semua')}</button>
      </div></details></div>
    </div>
    <h2 className={styles.title}>{names[view]}</h2>
    {view === 'today' && !loading && <p className="muted">{rows.filter(task => !task.done).length} {text('tasks', 'tugas')}</p>}
    {error && <div role="alert" className={styles.notice}>{error} <button disabled={busy} onClick={() => void load()}>{text('Retry', 'Coba lagi')}</button></div>}
    {!loading && !dates && !error && <p className={styles.notice}>{text('Scheduling requires database migration 012_todos_due_date.sql. Existing tasks remain available in Inbox.', 'Penjadwalan memerlukan migrasi database 012_todos_due_date.sql. Tugas yang ada tetap tersedia di Inbox.')}</p>}
    {!loading && dates && !times && !error && <p className={styles.notice}>{text('Time scheduling requires database migration 013_todos_due_time.sql.', 'Fitur jam memerlukan migrasi database 013_todos_due_time.sql.')}</p>}
    {view === 'upcoming' && layout !== 'calendar' && <><div className={styles.weekHeader}><strong>{new Date(`${start}T12:00:00`).toLocaleDateString(id ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' })}</strong><div><button aria-label={text('Previous week', 'Minggu sebelumnya')} onClick={() => setStart(addDays(start, -7))}>‹</button><button onClick={() => setStart(today)}>{names.today}</button><button aria-label={text('Next week', 'Minggu berikutnya')} onClick={() => setStart(addDays(start, 7))}>›</button></div></div><div className={styles.week}>{days.map(day => <a key={day} href={`#day-${day}`} aria-current={day === today ? 'date' : undefined}>{new Date(`${day}T12:00:00`).toLocaleDateString(id ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric' })}</a>)}</div></>}
    {layout === 'calendar' && <div className={styles.calendarToolbar}><strong>{new Date(`${month}T12:00:00`).toLocaleDateString(id ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' })}</strong><div><button aria-label={text('Previous month', 'Bulan sebelumnya')} onClick={() => setMonth(addDays(month, -1).slice(0, 7) + '-01')}>‹</button><button onClick={() => setMonth(today.slice(0, 7) + '-01')}>{names.today}</button><button aria-label={text('Next month', 'Bulan berikutnya')} onClick={() => setMonth(addDays(monthEnd(month), 1).slice(0, 7) + '-01')}>›</button></div></div>}
    {layout === 'calendar' && <div className={styles.calendar}><div className={styles.calendarWeek}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <strong key={day}>{text(day, ({ Mon: 'Sen', Tue: 'Sel', Wed: 'Rab', Thu: 'Kam', Fri: 'Jum', Sat: 'Sab', Sun: 'Min' } as Record<string, string>)[day])}</strong>)}</div><div className={styles.calendarGrid}>{calendarDays.map(day => { const items = rows.filter(task => task.due_date === day); return <section key={day} className={`${styles.calendarCell} ${day.slice(0, 7) !== month.slice(0, 7) ? styles.outside : ''} ${day === today ? styles.currentDay : ''}`}><time dateTime={day}>{Number(day.slice(-2))}</time>{items.map(task => <article key={task.id} className={styles.calendarTask}><span className={task.done ? styles.done : ''}>{task.due_time ? `${task.due_time.slice(0, 5)} ` : ''}{task.label}</span><button disabled={busy} aria-label={`${text('Edit', 'Ubah')} ${task.label}`} onClick={() => setDraft({ id: task.id, label: task.label, priority: task.priority, due_date: task.due_date || '', due_time: task.due_time ? task.due_time.slice(0, 5) : '' })}><Pencil size={12} /></button></article>)}<button className={styles.add} disabled={busy || !dates} aria-label={`${text('Add task', 'Tambah tugas')} ${day}`} onClick={() => openAdd(day)}><Plus size={14} /></button></section>})}</div></div>}
    {draft && <form className={styles.editor} onSubmit={event => { event.preventDefault(); void mutate(async () => {
      const parsed = dates ? parseTaskDateInput(draft.label, today) : { label: draft.label, dueDate: null, dueTime: null };
      const finalLabel = (parsed.dueDate || (times && parsed.dueTime)) ? (parsed.label || draft.label) : draft.label;
      const finalDate = (parsed.dueDate || draft.due_date) ? (parsed.dueDate || draft.due_date) : null;
      const finalTime = (times && (parsed.dueTime || draft.due_time)) ? (parsed.dueTime || draft.due_time) : null;
      const saved = await request(draft.id ? `/api/todos/${draft.id}` : '/api/todos', draft.id ? 'PUT' : 'POST', {
        label: finalLabel,
        priority: draft.priority,
        ...(!draft.id ? { list_kind: 'task' } : {}),
        ...(dates ? { due_date: finalDate } : {}),
        ...(times ? { due_time: finalTime } : {})
      });
      setTasks(current => draft.id ? current.map(task => task.id === saved.id ? saved : task) : [saved, ...current]); setDraft(null);
    }); }}>
      <label>{text('Task name', 'Nama tugas')}<input autoFocus required maxLength={120} disabled={busy} value={draft.label} onChange={event => {
        const val = event.target.value;
        if (dates) {
          const parsed = parseTaskDateInput(val, today);
          if (parsed.dueDate || parsed.dueTime) {
            setDraft({
              ...draft,
              label: val,
              ...(parsed.dueDate ? { due_date: parsed.dueDate } : {}),
              ...(parsed.dueTime ? { due_time: parsed.dueTime } : {})
            });
            return;
          }
        }
        setDraft({ ...draft, label: val });
      }} /></label>
      <div className={styles.editorFields}>
        <label>{text('Date', 'Tanggal')}<input type="date" min="1000-01-01" max="9999-12-31" disabled={busy || !dates} value={draft.due_date} onChange={event => setDraft({ ...draft, due_date: event.target.value })} /></label>
        <label>{text('Time', 'Waktu')}<input type="time" disabled={busy || !times} value={draft.due_time} onChange={event => setDraft({ ...draft, due_time: event.target.value })} /></label>
        <label>{text('Priority', 'Prioritas')}<select disabled={busy} value={draft.priority} onChange={event => setDraft({ ...draft, priority: event.target.value as Task['priority'] })}>{(['LOW', 'MEDIUM', 'HIGH'] as const).map(value => <option key={value} value={value}>{priorityLabel(value)}</option>)}</select></label>
      </div>
      <div className={styles.actions}><button type="button" disabled={busy} onClick={() => setDraft(null)}>{text('Cancel', 'Batal')}</button><button className="btn" disabled={busy || !draft.label.trim()}>{text('Save task', 'Simpan tugas')}</button></div>
    </form>}
    {loading ? <div aria-label={text('Loading tasks', 'Memuat tugas')} role="status" className={styles.skeleton}>{[0, 1, 2].map(key => <div key={key} />)}</div> : layout === 'calendar' ? (view === 'inbox' && rows.some(task => !task.due_date) && <div className={styles.undatedSection}><h3>{text('No date', 'Tanpa tanggal')}</h3><div className={styles.list}>{rows.filter(task => !task.due_date).map(task => <article key={task.id} className={styles.task}><input className={styles.check} type="checkbox" checked={task.done} disabled={busy} aria-label={`${text('Complete', 'Selesaikan')} ${task.label}`} onChange={() => void mutate(async () => { const saved = await request(`/api/todos/${task.id}`, 'PUT', { done: !task.done }); setTasks(current => current.map(row => row.id === task.id ? saved : row)); })} /><div className={styles.taskBody}><span className={task.done ? styles.done : ''}>{task.label}</span><small>{task.due_time && <><Clock size={12} /> {task.due_time.slice(0, 5)} · </>} {priorityLabel(task.priority)}</small></div><div className={styles.rowActions}><button disabled={busy} aria-label={`${text('Edit', 'Ubah')} ${task.label}`} onClick={() => setDraft({ id: task.id, label: task.label, priority: task.priority, due_date: task.due_date || '', due_time: task.due_time ? task.due_time.slice(0, 5) : '' })}><Pencil size={14} /></button><button disabled={busy} aria-label={`${text('Delete', 'Hapus')} ${task.label}`} onClick={() => void mutate(async () => { await request(`/api/todos/${task.id}`, 'DELETE'); setTasks(current => current.filter(row => row.id !== task.id)); if (draft?.id === task.id) setDraft(null); })}><Trash2 size={14} /></button></div></article>)}</div></div>) : <div className={layout === 'board' ? styles.board : styles.list}>{Array.from(groups, ([key, items]) => <section id={`day-${key}`} key={key} className={styles.group}>
      {heading(key) && <h3 className={key === 'overdue' ? styles.overdue : ''}>{heading(key)}</h3>}
      {items.map(task => <article key={task.id} className={styles.task}>
        <input className={styles.check} type="checkbox" checked={task.done} disabled={busy} aria-label={`${text('Complete', 'Selesaikan')} ${task.label}`} onChange={() => void mutate(async () => { const saved = await request(`/api/todos/${task.id}`, 'PUT', { done: !task.done }); setTasks(current => current.map(row => row.id === task.id ? saved : row)); })} />
        <div className={styles.taskBody}><span className={task.done ? styles.done : ''}>{task.label}</span><small className={task.due_date && task.due_date < today && !task.done ? styles.overdue : ''}>{task.due_date && <><CalendarDays size={12} /> {dateLabel(task.due_date)} · </>}{task.due_time && <><Clock size={12} /> {task.due_time.slice(0, 5)} · </>} {priorityLabel(task.priority)}</small></div>
        <div className={styles.rowActions}><button disabled={busy} aria-label={`${text('Edit', 'Ubah')} ${task.label}`} onClick={() => setDraft({ id: task.id, label: task.label, priority: task.priority, due_date: task.due_date || '', due_time: task.due_time ? task.due_time.slice(0, 5) : '' })}><Pencil size={14} /></button><button disabled={busy} aria-label={`${text('Delete', 'Hapus')} ${task.label}`} onClick={() => void mutate(async () => { await request(`/api/todos/${task.id}`, 'DELETE'); setTasks(current => current.filter(row => row.id !== task.id)); if (draft?.id === task.id) setDraft(null); })}><Trash2 size={14} /></button></div>
      </article>)}
      {!items.length && key === 'all' && <p className={styles.empty}>{text('No tasks in this view.', 'Tidak ada tugas dalam tampilan ini.')}</p>}
      <button className={styles.add} disabled={loading || busy || (view !== 'inbox' && !dates)} onClick={() => openAdd(/^\d{4}-/.test(key) ? key : view === 'today' ? today : '')}><Plus size={16} />{text('Add task', 'Tambah tugas')}</button>
    </section>)}</div>}
  </div></Shell>;
}

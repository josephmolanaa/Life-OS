'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, SlidersHorizontal, Pencil, Trash2, CalendarDays, Clock } from 'lucide-react';
import { Shell } from './finance/layout';
import { getLang, type Lang } from '@/lib/i18n';
import { addDays, localDate, visibleTasks, parseTaskDateInput, type Task, type TaskView } from '@/lib/todoist';

type Layout = 'list' | 'board' | 'calendar';
type TimelineTab = 'daily' | 'weekly' | 'monthly';
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
  const [today, setToday] = useState(localDate);
  const [start, setStart] = useState(localDate);
  const [layout, setLayout] = useState<Layout>('list');
  const [month, setMonth] = useState(() => localDate().slice(0, 7) + '-01');
  const [completed, setCompleted] = useState(false);
  const [grouping, setGrouping] = useState('none');
  const [timelineTab, setTimelineTab] = useState<TimelineTab>('monthly');
  const [timelineAnchor, setTimelineAnchor] = useState(() => localDate());
  const canvasRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState('default');
  const [priority, setPriority] = useState('all');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<{ id?: string; label: string; priority: Task['priority']; due_date: string; due_time: string; start_time: string; end_time: string } | null>(null);
  const display = useRef<HTMLDetailsElement>(null);
  const names = { inbox: 'Inbox', today: text('Today', 'Hari ini'), upcoming: text('Upcoming', 'Mendatang'), timeline: text('Timeline', 'Timeline') };
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
  const monthLast = (value: string) => addDays(`${value.slice(0, 8)}01`, 32).slice(0, 7) + '-01';
  const monthEnd = (value: string) => addDays(monthLast(value), -1);
  const { calendarDays, calendarEnd } = useMemo(() => {
    const first = `${month.slice(0, 7)}-01`;
    const day = new Date(`${first}T12:00:00`).getDay();
    const calStart = addDays(first, day === 0 ? -6 : 1 - day);
    const days = Array.from({ length: 42 }, (_, index) => addDays(calStart, index));
    return { calendarDays: days, calendarEnd: days[days.length - 1] };
  }, [month]);
  const rows = useMemo(() => {
    return visibleTasks(tasks, view, today, start, completed, priority, search, sort, layout === 'calendar' && view === 'upcoming' ? calendarEnd : undefined);
  }, [tasks, view, today, start, completed, priority, search, sort, layout, calendarEnd]);

  // Notion-style horizontal Gantt Timeline computations
  const ganttTasks = useMemo(() => {
    if (view !== 'timeline') return [];
    return rows.filter(task => completed || !task.done);
  }, [rows, view, completed]);

  const timelineNavTitle = useMemo(() => {
    const d = new Date(`${timelineAnchor}T12:00:00`);
    if (timelineTab === 'monthly') {
      return d.toLocaleDateString(id ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });
    }
    if (timelineTab === 'weekly') {
      const day = d.getDay();
      const mon = addDays(timelineAnchor, day === 0 ? -6 : 1 - day);
      const sun = addDays(mon, 6);
      const monD = new Date(`${mon}T12:00:00`);
      const sunD = new Date(`${sun}T12:00:00`);
      return `${monD.toLocaleDateString(id ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' })} – ${sunD.toLocaleDateString(id ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return d.toLocaleDateString(id ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }, [timelineAnchor, timelineTab, id]);

  const { cols, colWidth, monthBlocks, totalCanvasWidth, todayLineLeft } = useMemo(() => {
    if (timelineTab === 'monthly') {
      const width = 42;
      const anchorDate = new Date(`${timelineAnchor}T12:00:00`);
      const firstOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
      const startD = new Date(firstOfMonth);
      startD.setDate(firstOfMonth.getDate() - 14);
      const dateList = Array.from({ length: 60 }, (_, i) => {
        const d = new Date(startD);
        d.setDate(startD.getDate() + i);
        return localDate(d);
      });

      const blocks: { label: string; count: number }[] = [];
      dateList.forEach(d => {
        const label = new Date(`${d}T12:00:00`).toLocaleDateString(id ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });
        const last = blocks[blocks.length - 1];
        if (last && last.label === label) last.count++;
        else blocks.push({ label, count: 1 });
      });

      const columnList = dateList.map(d => {
        const dayNum = String(Number(d.slice(-2)));
        const dow = new Date(`${d}T12:00:00`).getDay();
        return {
          key: d,
          label: dayNum,
          isToday: d === today,
          isWeekend: dow === 0 || dow === 6
        };
      });

      const todayIdx = dateList.indexOf(today);
      const tLine = todayIdx !== -1 ? todayIdx * width + width / 2 : null;

      return {
        cols: columnList,
        colWidth: width,
        monthBlocks: blocks,
        totalCanvasWidth: dateList.length * width,
        todayLineLeft: tLine
      };
    }

    if (timelineTab === 'weekly') {
      const width = 90;
      const anchorDate = new Date(`${timelineAnchor}T12:00:00`);
      const dow = anchorDate.getDay();
      const monday = new Date(anchorDate);
      monday.setDate(anchorDate.getDate() - (dow === 0 ? 6 : dow - 1) - 7);
      const dateList = Array.from({ length: 21 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return localDate(d);
      });

      const blocks: { label: string; count: number }[] = [];
      dateList.forEach(d => {
        const label = new Date(`${d}T12:00:00`).toLocaleDateString(id ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });
        const last = blocks[blocks.length - 1];
        if (last && last.label === label) last.count++;
        else blocks.push({ label, count: 1 });
      });

      const columnList = dateList.map(d => {
        const dObj = new Date(`${d}T12:00:00`);
        const label = dObj.toLocaleDateString(id ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric' });
        const dayOfWeek = dObj.getDay();
        return {
          key: d,
          label,
          isToday: d === today,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        };
      });

      const todayIdx = dateList.indexOf(today);
      const tLine = todayIdx !== -1 ? todayIdx * width + width / 2 : null;

      return {
        cols: columnList,
        colWidth: width,
        monthBlocks: blocks,
        totalCanvasWidth: dateList.length * width,
        todayLineLeft: tLine
      };
    }

    // Daily
    const width = 56;
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const blockTitle = new Date(`${timelineAnchor}T12:00:00`).toLocaleDateString(id ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const blocks = [{ label: blockTitle, count: 24 }];
    const columnList = hours.map(h => ({
      key: h,
      label: h,
      isToday: false,
      isWeekend: false
    }));

    let tLine: number | null = null;
    if (timelineAnchor === today) {
      const now = new Date();
      tLine = (now.getHours() + now.getMinutes() / 60) * width;
    }

    return {
      cols: columnList,
      colWidth: width,
      monthBlocks: blocks,
      totalCanvasWidth: 24 * width,
      todayLineLeft: tLine
    };
  }, [timelineTab, timelineAnchor, today, id]);

  const getBarProps = (task: Task) => {
    if (timelineTab === 'daily') {
      if (task.due_date !== timelineAnchor) return null;
      let startHour = 9;
      let endHour = 10;
      if (task.start_time) {
        const [h, m] = task.start_time.split(':').map(Number);
        startHour = h + (m || 0) / 60;
        endHour = startHour + 1;
        if (task.end_time) {
          const [eh, em] = task.end_time.split(':').map(Number);
          endHour = Math.max(startHour + 0.5, eh + (em || 0) / 60);
        }
      } else if (task.due_time) {
        const [h, m] = task.due_time.split(':').map(Number);
        startHour = h + (m || 0) / 60;
        endHour = startHour + 1;
      }

      let progress = 0;
      if (task.done) {
        progress = 100;
      } else if (timelineAnchor < today) {
        progress = 100;
      } else if (timelineAnchor > today) {
        progress = 0;
      } else if (todayLineLeft !== null) {
        const nowHour = todayLineLeft / colWidth;
        if (nowHour >= endHour) progress = 100;
        else if (nowHour <= startHour) progress = 0;
        else progress = Math.min(100, Math.max(0, ((nowHour - startHour) / (endHour - startHour)) * 100));
      }

      return {
        left: startHour * colWidth,
        width: Math.max(colWidth, (endHour - startHour) * colWidth),
        progress
      };
    }

    if (!task.due_date) return null;
    const dateKeys = cols.map(c => c.key);
    const idx = dateKeys.indexOf(task.due_date);
    if (idx === -1) return null;
    const minW = timelineTab === 'monthly' ? 120 : colWidth - 8;

    let progress = 0;
    if (task.done) {
      progress = 100;
    } else if (task.due_date < today) {
      progress = 100;
    } else if (task.due_date > today) {
      progress = 0;
    } else {
      if (task.start_time && task.end_time) {
        const [sh, sm] = task.start_time.split(':').map(Number);
        const [eh, em] = task.end_time.split(':').map(Number);
        const s = sh + (sm || 0) / 60;
        const e = Math.max(s + 0.5, eh + (em || 0) / 60);
        const now = new Date();
        const curr = now.getHours() + now.getMinutes() / 60;
        if (curr >= e) progress = 100;
        else if (curr <= s) progress = 0;
        else progress = Math.min(100, Math.max(0, ((curr - s) / (e - s)) * 100));
      } else {
        const now = new Date();
        const curr = now.getHours() + now.getMinutes() / 60;
        progress = Math.min(100, Math.max(0, (curr / 24) * 100));
      }
    }

    return {
      left: idx * colWidth + 2,
      width: minW,
      progress
    };
  };

  useEffect(() => {
    if (view === 'timeline' && canvasRef.current && todayLineLeft !== null) {
      const w = canvasRef.current.clientWidth;
      canvasRef.current.scrollLeft = Math.max(0, todayLineLeft - w / 2);
    }
  }, [view, timelineTab, timelineAnchor, todayLineLeft]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(start, index)), [start]);
  const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(id ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' });
  const priorityLabel = (value: string) => ({ HIGH: text('High', 'Tinggi'), MEDIUM: text('Medium', 'Sedang'), LOW: text('Low', 'Rendah') }[value] || value);
  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    if (view === 'upcoming') days.forEach(day => map.set(day, []));
    if (view === 'today') {
      if (rows.some(task => task.due_date! < today)) map.set('overdue', []);
      map.set(today, []);
    }
    for (const task of rows) {
      const key = view === 'upcoming' ? task.due_date! : view === 'today' ? (task.due_date! < today ? 'overdue' : today) : grouping === 'date' ? (task.due_date || 'undated') : grouping === 'priority' ? task.priority : 'all';
      const existing = map.get(key);
      if (existing) {
        existing.push(task);
      } else {
        map.set(key, [task]);
      }
    }
    if (!map.size) map.set('all', []);
    return map;
  }, [rows, view, days, today, grouping]);

  const openAdd = (date = '', time = '') => setDraft({ label: '', priority: 'MEDIUM', due_date: dates ? date : '', due_time: time, start_time: '', end_time: '' });
  const openEdit = (task: Task) => setDraft({
    id: task.id,
    label: task.label,
    priority: task.priority,
    due_date: task.due_date || '',
    due_time: task.due_time ? task.due_time.slice(0, 5) : '',
    start_time: task.start_time || '',
    end_time: task.end_time || '',
  });

  const handleToggle = (task: Task) => {
    const nextDone = !task.done;
    setTasks(current => current.map(row => row.id === task.id ? { ...row, done: nextDone } : row));
    request(`/api/todos/${task.id}`, 'PUT', { done: nextDone }).catch(cause => {
      setTasks(current => current.map(row => row.id === task.id ? { ...row, done: !nextDone } : row));
      setError(cause instanceof Error ? cause.message : 'Unable to save task');
    });
  };

  const handleDelete = (taskId: string) => {
    const previous = tasks;
    setTasks(current => current.filter(row => row.id !== taskId));
    if (draft?.id === taskId) setDraft(null);
    request(`/api/todos/${taskId}`, 'DELETE').catch(cause => {
      setTasks(previous);
      setError(cause instanceof Error ? cause.message : 'Unable to delete task');
    });
  };

  const handleSaveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || !draft.label.trim()) return;
    const parsed = dates ? parseTaskDateInput(draft.label, today) : { label: draft.label, dueDate: null, dueTime: null };
    const finalLabel = (parsed.dueDate || (times && parsed.dueTime)) ? (parsed.label || draft.label) : draft.label;
    const finalDate = (parsed.dueDate || draft.due_date) ? (parsed.dueDate || draft.due_date) : null;
    const finalTime = (times && (parsed.dueTime || draft.due_time)) ? (parsed.dueTime || draft.due_time) : null;

    if (draft.id) {
      const taskId = draft.id;
      const existing = tasks.find(t => t.id === taskId);
      const optimistic: Task = {
        ...(existing || { id: taskId, done: false, list_kind: 'task', created_at: new Date().toISOString() }),
        label: finalLabel,
        priority: draft.priority,
        due_date: finalDate,
        due_time: finalTime || draft.start_time || null,
        start_time: draft.start_time || null,
        end_time: draft.end_time || null,
      };
      setTasks(current => current.map(t => t.id === taskId ? optimistic : t));
      setDraft(null);

      request(`/api/todos/${taskId}`, 'PUT', {
        label: finalLabel,
        priority: draft.priority,
        ...(dates ? { due_date: finalDate } : {}),
        ...(times ? { due_time: finalTime || draft.start_time || null } : {}),
        start_time: draft.start_time || null,
        end_time: draft.end_time || null,
      }).then(saved => {
        setTasks(current => current.map(t => t.id === taskId ? saved : t));
      }).catch(cause => {
        setError(cause instanceof Error ? cause.message : 'Unable to save task');
        if (existing) {
          setTasks(current => current.map(t => t.id === taskId ? existing : t));
        }
      });
    } else {
      setBusy(true);
      try {
        const saved = await request('/api/todos', 'POST', {
          label: finalLabel,
          priority: draft.priority,
          list_kind: 'task',
          ...(dates ? { due_date: finalDate } : {}),
          ...(times ? { due_time: finalTime || draft.start_time || null } : {}),
          start_time: draft.start_time || null,
          end_time: draft.end_time || null,
        });
        setTasks(current => [saved, ...current]);
        setDraft(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to save task');
      } finally {
        setBusy(false);
      }
    }
  };

  const renderEditor = (currentDraft: NonNullable<typeof draft>) => (
    <form key={currentDraft.id || 'new-task'} className={styles.editor} onSubmit={handleSaveDraft}>
      <label>{text('Task name', 'Nama tugas')}<input autoFocus required maxLength={120} disabled={busy} value={currentDraft.label} onChange={event => {
        const val = event.target.value;
        if (dates) {
          const parsed = parseTaskDateInput(val, today);
          if (parsed.dueDate || parsed.dueTime) {
            setDraft({
              ...currentDraft,
              label: val,
              ...(parsed.dueDate ? { due_date: parsed.dueDate } : {}),
              ...(parsed.dueTime ? { due_time: parsed.dueTime } : {})
            });
            return;
          }
        }
        setDraft({ ...currentDraft, label: val });
      }} /></label>
      <div className={styles.editorFields}>
        <label>{text('Date', 'Tanggal')}<input type="date" min="1000-01-01" max="9999-12-31" disabled={busy || !dates} value={currentDraft.due_date} onChange={event => setDraft({ ...currentDraft, due_date: event.target.value })} /></label>
        <label>{text('Time', 'Waktu')}<input type="time" disabled={busy || !times} value={currentDraft.due_time} onChange={event => setDraft({ ...currentDraft, due_time: event.target.value })} /></label>
        <label>{text('Start', 'Mulai')}<input type="time" disabled={busy} value={currentDraft.start_time} onChange={event => setDraft({ ...currentDraft, start_time: event.target.value })} /></label>
        <label>{text('End', 'Selesai')}<input type="time" disabled={busy} value={currentDraft.end_time} onChange={event => setDraft({ ...currentDraft, end_time: event.target.value })} /></label>
        <label>{text('Priority', 'Prioritas')}<select disabled={busy} value={currentDraft.priority} onChange={event => setDraft({ ...currentDraft, priority: event.target.value as Task['priority'] })}>{(['LOW', 'MEDIUM', 'HIGH'] as const).map(value => <option key={value} value={value}>{priorityLabel(value)}</option>)}</select></label>
      </div>
      <div className={styles.actions}><button type="button" disabled={busy} onClick={() => setDraft(null)}>{text('Cancel', 'Batal')}</button><button className="btn" disabled={busy || !currentDraft.label.trim()}>{text('Save task', 'Simpan tugas')}</button></div>
    </form>
  );

  const isInlineEditor = (layout === 'list' || layout === 'board') && !!draft?.id;
  const taskInCurrentView = draft?.id ? rows.some(t => t.id === draft.id) : false;
  const showTopEditor = draft && (!isInlineEditor || !taskInCurrentView);

  const heading = (key: string) => key === 'all' ? '' : key === 'overdue' ? text('Overdue', 'Terlambat') : key === 'undated' ? text('No date', 'Tanpa tanggal') : ['HIGH', 'MEDIUM', 'LOW'].includes(key) ? priorityLabel(key) : `${dateLabel(key)}${key === today ? text(' · Today', ' · Hari ini') : ''}`;
  return <Shell title="Todoist" quickFab={false}><div className={`${styles.workspace} ${layout !== 'list' || view === 'timeline' ? styles.wide : ''}`}>
    <div className={styles.toolbar}><nav aria-label="Todoist">{(['inbox', 'today', 'upcoming', 'timeline'] as const).map(item => <Link key={item} href={`/todoist/${item}`} aria-current={item === view ? 'page' : undefined}>{names[item]}</Link>)}</nav>
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
    {layout === 'calendar' && <div className={styles.calendar}><div className={styles.calendarWeek}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <strong key={day}>{text(day, ({ Mon: 'Sen', Tue: 'Sel', Wed: 'Rab', Thu: 'Kam', Fri: 'Jum', Sat: 'Sab', Sun: 'Min' } as Record<string, string>)[day])}</strong>)}</div><div className={styles.calendarGrid}>{calendarDays.map(day => { const items = rows.filter(task => task.due_date === day); return <section key={day} className={`${styles.calendarCell} ${day.slice(0, 7) !== month.slice(0, 7) ? styles.outside : ''} ${day === today ? styles.currentDay : ''}`}><time dateTime={day}>{Number(day.slice(-2))}</time>{items.map(task => <article key={task.id} className={styles.calendarTask} onClick={() => openEdit(task)}><span className={task.done ? styles.done : ''}>{task.due_time ? `${task.due_time.slice(0, 5)} ` : ''}{task.label}</span><button type="button" aria-label={`${text('Edit', 'Ubah')} ${task.label}`} onClick={event => { event.stopPropagation(); openEdit(task); }}><Pencil size={12} /></button></article>)}<button className={styles.add} disabled={busy || !dates} aria-label={`${text('Add task', 'Tambah tugas')} ${day}`} onClick={() => openAdd(day)}><Plus size={14} /></button></section>})}</div></div>}

    {view === 'timeline' && <div className={styles.timelineWrapper}>
      <div className={styles.timelineToolbar}>
        <div className={styles.timelineNav}>
          <button type="button" className={styles.timelineNavBtn} aria-label={text('Previous', 'Sebelumnya')} onClick={() => {
            if (timelineTab === 'monthly') {
              const d = new Date(`${timelineAnchor}T12:00:00`);
              d.setMonth(d.getMonth() - 1);
              setTimelineAnchor(localDate(d));
            } else if (timelineTab === 'weekly') {
              setTimelineAnchor(addDays(timelineAnchor, -7));
            } else {
              setTimelineAnchor(addDays(timelineAnchor, -1));
            }
          }}>‹</button>
          <button type="button" className={styles.timelineNavBtn} onClick={() => setTimelineAnchor(today)}>{names.today}</button>
          <button type="button" className={styles.timelineNavBtn} aria-label={text('Next', 'Berikutnya')} onClick={() => {
            if (timelineTab === 'monthly') {
              const d = new Date(`${timelineAnchor}T12:00:00`);
              d.setMonth(d.getMonth() + 1);
              setTimelineAnchor(localDate(d));
            } else if (timelineTab === 'weekly') {
              setTimelineAnchor(addDays(timelineAnchor, 7));
            } else {
              setTimelineAnchor(addDays(timelineAnchor, 1));
            }
          }}>›</button>
          <span className={styles.timelineNavTitle}>{timelineNavTitle}</span>
        </div>
        <div className={styles.timelineControls}>
          <div className={styles.timelineViewSelect}>
            {(['daily', 'weekly', 'monthly'] as const).map(tab => (
              <button key={tab} type="button" className={`${styles.timelineViewBtn} ${timelineTab === tab ? styles.active : ''}`} onClick={() => setTimelineTab(tab)}>
                {tab === 'daily' ? text('Daily', 'Harian') : tab === 'weekly' ? text('Weekly', 'Mingguan') : text('Monthly', 'Bulanan')}
              </button>
            ))}
          </div>
          <button type="button" className={styles.timelineNewBtn} onClick={() => openAdd(timelineAnchor)}>
            <Plus size={14} /> {text('New', 'Baru')}
          </button>
        </div>
      </div>

      <div className={styles.ganttContainer}>
        <div className={styles.ganttSidebar}>
          <div className={styles.ganttSidebarHeader}>
            <span>{text('Tasks', 'Tugas')}</span>
            <span className={styles.ganttSidebarCount}>{ganttTasks.length}</span>
          </div>
          <div className={styles.ganttSidebarRows}>
            {ganttTasks.map(task => (
              <div key={task.id} className={styles.ganttSidebarRow} onClick={() => setDraft({ id: task.id, label: task.label, priority: task.priority, due_date: task.due_date || '', due_time: task.due_time ? task.due_time.slice(0, 5) : '', start_time: task.start_time || '', end_time: task.end_time || '' })}>
                <span className={styles.ganttRowBullet}>▶</span>
                <span className={`${styles.ganttRowLabel} ${task.done ? styles.done : ''}`}>{task.label}</span>
              </div>
            ))}
            {!ganttTasks.length && <p className={styles.timelineEmpty}>{text('No tasks yet', 'Belum ada tugas')}</p>}
          </div>
          <button type="button" className={styles.ganttSidebarAdd} onClick={() => openAdd(timelineAnchor)}>
            <Plus size={14} /> {text('New', 'Baru')}
          </button>
        </div>

        <div className={styles.ganttCanvas} ref={canvasRef}>
          <div className={styles.ganttHeader} style={{ width: totalCanvasWidth }}>
            <div className={styles.ganttMonthsRow}>
              {monthBlocks.map((b, idx) => (
                <div key={idx} className={styles.ganttMonthBlock} style={{ width: b.count * colWidth }}>
                  {b.label}
                </div>
              ))}
            </div>
            <div className={styles.ganttColsRow}>
              {cols.map((c, idx) => (
                <div key={idx} className={styles.ganttColHeader} style={{ width: colWidth }}>
                  {c.isToday ? <span className={styles.todayBadge}>{c.label}</span> : c.label}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.ganttGrid} style={{ width: totalCanvasWidth }}>
            {todayLineLeft !== null && <div className={styles.ganttTodayLine} style={{ left: todayLineLeft }} />}
            <div className={styles.ganttBackgroundGrid}>
              {cols.map((c, idx) => (
                <div key={idx} className={`${styles.ganttGridCol} ${c.isWeekend ? styles.ganttWeekendCol : ''}`} style={{ width: colWidth }} />
              ))}
            </div>
            <div className={styles.ganttRows}>
              {ganttTasks.map(task => {
                const bar = getBarProps(task);
                return (
                  <div key={task.id} className={styles.ganttRow}>
                    {bar && (
                      <div className={`${styles.ganttBar} ${bar.progress >= 100 ? styles.ganttBarCompleted : ''}`} style={{ left: bar.left, width: bar.width }} title={`${task.label} (${task.start_time || ''} - ${task.end_time || ''})${bar.progress > 0 ? ` · ${Math.round(bar.progress)}%` : ''}`} onClick={() => setDraft({ id: task.id, label: task.label, priority: task.priority, due_date: task.due_date || '', due_time: task.due_time ? task.due_time.slice(0, 5) : '', start_time: task.start_time || '', end_time: task.end_time || '' })}>
                        {bar.progress > 0 && (
                          <div className={styles.ganttBarProgress} style={{ width: `${bar.progress}%` }} />
                        )}
                        <span className={styles.ganttBarIcon}>▶</span>
                        <span className={`${styles.ganttBarText} ${task.done ? styles.done : ''}`}>{task.label}</span>
                        {(task.start_time || task.due_time) && (
                          <span className={styles.ganttBarTime}>
                            {task.start_time && task.end_time ? `${task.start_time.slice(0, 5)}–${task.end_time.slice(0, 5)}` : (task.start_time || task.due_time)?.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>}

    {showTopEditor && renderEditor(draft)}
    {loading ? <div aria-label={text('Loading tasks', 'Memuat tugas')} role="status" className={styles.skeleton}>{[0, 1, 2].map(key => <div key={key} />)}</div> : layout === 'calendar' ? (view === 'inbox' && rows.some(task => !task.due_date) && <div className={styles.undatedSection}><h3>{text('No date', 'Tanpa tanggal')}</h3><div className={styles.list}>{rows.filter(task => !task.due_date).map(task => <article key={task.id} className={`${styles.task} ${draft?.id === task.id ? styles.selected : ''}`}><input className={styles.check} type="checkbox" checked={task.done} aria-label={`${text('Complete', 'Selesaikan')} ${task.label}`} onChange={() => handleToggle(task)} /><div className={styles.taskBody} onClick={() => openEdit(task)}><span className={task.done ? styles.done : ''}>{task.label}</span><small>{task.due_time && <><Clock size={12} /> {task.due_time.slice(0, 5)} · </>}{task.start_time && task.end_time && <><Clock size={12} /> {task.start_time.slice(0, 5)}–{task.end_time.slice(0, 5)} · </>}{task.start_time && !task.end_time && <><Clock size={12} /> {task.start_time.slice(0, 5)} · </>} {priorityLabel(task.priority)}</small></div><div className={styles.rowActions}><button type="button" aria-label={`${text('Edit', 'Ubah')} ${task.label}`} onClick={() => openEdit(task)}><Pencil size={14} /></button><button type="button" aria-label={`${text('Delete', 'Hapus')} ${task.label}`} onClick={() => handleDelete(task.id)}><Trash2 size={14} /></button></div></article>)}</div></div>) : view === 'timeline' ? null : <div className={layout === 'board' ? styles.board : styles.list}>{Array.from(groups, ([key, items]) => <section id={`day-${key}`} key={key} className={styles.group}>
      {heading(key) && <h3 className={key === 'overdue' ? styles.overdue : ''}>{heading(key)}</h3>}
      {items.map(task => {
        if (isInlineEditor && draft?.id === task.id) {
          return renderEditor(draft);
        }
        return <article key={task.id} className={`${styles.task} ${draft?.id === task.id ? styles.selected : ''}`}>
          <input className={styles.check} type="checkbox" checked={task.done} aria-label={`${text('Complete', 'Selesaikan')} ${task.label}`} onChange={() => handleToggle(task)} />
          <div className={styles.taskBody} onClick={() => openEdit(task)}><span className={task.done ? styles.done : ''}>{task.label}</span><small className={task.due_date && task.due_date < today && !task.done ? styles.overdue : ''}>{task.due_date && <><CalendarDays size={12} /> {dateLabel(task.due_date)} · </>}{task.due_time && <><Clock size={12} /> {task.due_time.slice(0, 5)} · </>}{task.start_time && task.end_time && <><Clock size={12} /> {task.start_time.slice(0, 5)}–{task.end_time.slice(0, 5)} · </>}{task.start_time && !task.end_time && <><Clock size={12} /> {task.start_time.slice(0, 5)} · </>} {priorityLabel(task.priority)}</small></div>
          <div className={styles.rowActions}><button type="button" aria-label={`${text('Edit', 'Ubah')} ${task.label}`} onClick={() => openEdit(task)}><Pencil size={14} /></button><button type="button" aria-label={`${text('Delete', 'Hapus')} ${task.label}`} onClick={() => handleDelete(task.id)}><Trash2 size={14} /></button></div>
        </article>;
      })}
      {!items.length && key === 'all' && <p className={styles.empty}>{text('No tasks in this view.', 'Tidak ada tugas dalam tampilan ini.')}</p>}
      <button className={styles.add} disabled={loading || busy || (view !== 'inbox' && !dates)} onClick={() => openAdd(/^\d{4}-/.test(key) ? key : view === 'today' ? today : '')}><Plus size={16} />{text('Add task', 'Tambah tugas')}</button>
    </section>)}</div>}
  </div></Shell>;
}

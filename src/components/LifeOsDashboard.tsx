"use client";

function getLifeOsDate() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

import { useEffect, useState } from 'react';
import { DailyQuestCard } from './life-os-daily-quest';
import { ModuleCards } from './life-os-module-cards';
import { DashboardCard, type DashboardCardProps } from './DashboardCard';
import {  Briefcase, HeartPulse, Users, Flame, Trash2, Plus, Calendar, Pencil } from 'lucide-react';
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

type TodoRow = { id: string; label: string; done: boolean };
type TodoItem = { id: string; label: string; done: boolean; streak: number };
type ContribCell = { date: string; count: number };
type AwItem = { app: string; minutes: number };

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
  const seededRows = (await seeded.json()) as TodoRow[];
  return mapTodoRows(seededRows);
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
    cells.push({ date: d.toDateString(), count: 0 });
  }
  return cells;
}

function ConsistencyGraph({ contribs, t }: { contribs: ContribCell[]; t: Translation }) {
  const colors = ["var(--surface2)", "rgba(76, 175, 80, 0.25)", "rgba(76, 175, 80, 0.45)", "rgba(76, 175, 80, 0.70)", "var(--green)"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <section className="card" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "18px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>{t.consistency}</h2>
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(53, 1fr)", gridTemplateRows: "repeat(7, 1fr)", gridAutoFlow: "column", gap: "3px", width: "100%" }}>
          {contribs.map((cell) => {
            const cellDate = new Date(cell.date);
            const isFuture = cellDate > today;
            const level = Math.min(4, cell.count);
            
            return (
              <div 
                key={cell.date} 
                title={isFuture ? undefined : `${cell.date}: ${cell.count} ${t.tasksDone}`} 
                style={{ 
                  aspectRatio: "1", 
                  borderRadius: "2px", 
                  background: isFuture ? "transparent" : colors[level], 
                  border: isFuture ? "none" : (level === 0 ? "1px solid var(--border)" : "none"),
                  opacity: isFuture ? 0 : 1
                }} 
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function EditableTodoList() {
  const [todos, setTodos] = useState<{id:string, label:string, done:boolean, priority?: 'LOW' | 'MEDIUM' | 'HIGH'}[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  useEffect(() => {
    const saved = localStorage.getItem('editable-todos');
    if (saved) {
      try {
        setTodos(JSON.parse(saved));
      } catch {
        setTodos(getDefaultTodos());
      }
    } else {
      setTodos(getDefaultTodos());
    }
  }, []);

  const getDefaultTodos = () => [
    { id: '1', label: 'Read Book', done: false, priority: 'MEDIUM' as const },
    { id: '2', label: 'Pay Electric Bill', done: true, priority: 'LOW' as const },
    { id: '3', label: 'Go to Grocery Store', done: true, priority: 'MEDIUM' as const },
    { id: '4', label: 'Work Meeting', done: false, priority: 'HIGH' as const },
  ];

  const saveTodos = (newTodos: any[]) => {
    setTodos(newTodos);
    localStorage.setItem('editable-todos', JSON.stringify(newTodos));
  };

  const priorityColors = {
    HIGH: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
    MEDIUM: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
    LOW: { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' },
  };

  return (
    <section className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>Todo List</h2>
      
      <div className="list" style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
        {todos.map(t => {
          const pStyle = priorityColors[t.priority || 'MEDIUM'];
          const isEditing = editingId === t.id;
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', background: 'var(--surface2)', border: '1px solid var(--border2)' }}>
              <input 
                type="checkbox" 
                checked={t.done} 
                onChange={() => saveTodos(todos.map(x => x.id === t.id ? {...x, done: !x.done} : x))}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--green)' }}
              />
              
              <div style={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      className="input" 
                      value={editText} 
                      onChange={e => setEditText(e.target.value)} 
                      style={{ fontSize: '14px', padding: '4px 8px', flex: 1 }} 
                      autoFocus 
                    />
                    <select 
                      value={editPriority} 
                      onChange={e => setEditPriority(e.target.value as any)}
                      style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px', fontSize: '12px' }}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                    <button 
                      onClick={() => {
                        if (!editText.trim()) return;
                        saveTodos(todos.map(x => x.id === t.id ? {...x, label: editText.trim(), priority: editPriority} : x));
                        setEditingId(null);
                      }}
                      style={{ background: 'var(--green)', color: '#000', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text3)' : 'var(--text)', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.label}
                    </div>
                    {t.priority && (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: pStyle.bg, color: pStyle.color, letterSpacing: '0.5px', textTransform: 'uppercase', flexShrink: 0 }}>
                        {t.priority}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!isEditing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button 
                    onClick={() => { setEditingId(t.id); setEditText(t.label); setEditPriority(t.priority || 'MEDIUM'); }} 
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '4px' }}
                    title="Edit todo"
                  >
                    <Pencil size={15} />
                  </button>
                  <button 
                    onClick={() => saveTodos(todos.filter(x => x.id !== t.id))} 
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '4px' }}
                    title="Delete todo"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {todos.length === 0 && (
          <p className="muted" style={{ fontSize: '14px', textAlign: 'center', padding: '12px 0' }}>No todos yet.</p>
        )}
      </div>

      <form 
        onSubmit={(e) => { 
          e.preventDefault(); 
          if (!newTodo.trim()) return; 
          saveTodos([...todos, { id: Date.now().toString(), label: newTodo.trim(), done: false, priority: newPriority }]); 
          setNewTodo(''); 
          setNewPriority('MEDIUM'); 
        }} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto', width: '100%' }}
      >
        <input 
          className="input" 
          value={newTodo} 
          onChange={e => setNewTodo(e.target.value)} 
          placeholder="New todo..." 
          style={{ flex: 1, minWidth: '0', fontSize: '13px', padding: '6px 10px' }} 
        />
        <select 
          value={newPriority} 
          onChange={e => setNewPriority(e.target.value as any)}
          style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', fontSize: '12px', cursor: 'pointer' }}
        >
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
        </select>
        <button 
          type="submit" 
          className="btn" 
          style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--green)', color: '#000', fontWeight: 600 }}
        >
          <Plus size={14} /> Add
        </button>
      </form>
    </section>
  );
}

export function LifeOsDashboard({ financeSummary }: LifeOsDashboardProps) {
  const [lang, setLang] = useState<Lang>('en');
  const [t, setT] = useState<Translation>(copy.en);

  const [awStatus, setAwStatus] = useState('Checking...');
  const [awCategories, setAwCategories] = useState<Array<{ category: string; minutes: number }>>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [contribs, setContribs] = useState<ContribCell[]>(getInitialContribs());

  const [careerProgress, setCareerProgress] = useState('0%');
  const [disciplineScore, setDisciplineScore] = useState('0%');

  useEffect(() => {
    getLang().then(l => {
      setLang(l);
      setT(copy[l]);
    });

    ensureTodos().then(fetched => {
      setTodos(fetched);
      const today = getLifeOsDate();
      const doneCount = fetched.filter((item: any) => item.done).length;
      if (doneCount > 0) {
        setContribs((current) => {
          const next = current.map((cell) => cell.date === today ? { ...cell, count: doneCount } : cell);
          if (!next.some((cell) => cell.date === today)) next.push({ date: today, count: doneCount });
          return next.slice(-365);
        });
      }
    }).catch(() => setTodos(defaultTodos.map((label, index) => ({ id: `fallback-${index}`, label, done: false, streak: 0 }))));

    fetch('/api/career/hours').then(res => res.json()).then(data => {
      if (data.summary) {
        const logged = data.summary.reduce((a: number, b: any) => a + (b.loggedHours || 0), 0);
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
            data.timelineData.forEach((hour: any) => {
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

const handleToggle = async (id: string, checked: boolean) => {
    const nextTodos = todos.map((todo) => todo.id === id ? { ...todo, done: checked, streak: checked ? Math.max(1, todo.streak) : 0 } : todo);
    setTodos(nextTodos);
    await fetch(`/api/todos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: checked }) });
    const today = getLifeOsDate();
    const doneCount = nextTodos.filter((todo) => todo.done).length;
    setContribs((current) => {
      const next = current.map((cell) => cell.date === today ? { ...cell, count: doneCount } : cell);
      if (!next.some((cell) => cell.date === today)) next.push({ date: today, count: doneCount });
      return next.slice(-365);
    });
  };

  const pillars: DashboardCardProps[] = [
    { title: t.financial, value: <PrivacyAmount value={`Rp ${financeSummary.totalBalance.toLocaleString('id-ID')}`} />, icon: <Briefcase />, action: <PrivacyToggleButton />, link: '/finance' },
    { title: t.careerAi, value: careerProgress, icon: <Briefcase />, link: '/career' },
    { title: 'Physique', value: t.active, icon: <HeartPulse />, link: '/physique' },
    { title: 'Social', value: t.good, icon: <Users />, link: '/social' },
    { title: 'Discipline', value: disciplineScore, icon: <Flame />, link: '/discipline' },
  ];

  return (
    <div style={{ display: 'grid', gap: '24px', width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {pillars.map(p => <DashboardCard key={p.title} {...p} />)}
      </div>

      <ConsistencyGraph contribs={contribs} t={t} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <DailyQuestCard todos={todos} onToggle={handleToggle} onUpdate={handleUpdateHabit} />
        <EditableTodoList />
      </div>

      <ModuleCards financeSummary={{ income: financeSummary.income, expense: financeSummary.expense }} awStatus={awStatus} awCategories={awCategories} />
    </div>
  );
}







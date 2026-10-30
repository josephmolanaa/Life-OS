'use client';

import { useEffect, useState } from 'react';
import { CheckSquare, Clock, Droplets, Cat, FolderDown } from 'lucide-react';
import { useDailyQuests } from '@/components/use-daily-quests';

type Tab = 'quests' | 'timer' | 'water' | 'pet' | 'shelf';
const defaultSeconds = 25 * 60;

export default function DuckiesPage() {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>('quests');
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);
  const [water, setWater] = useState(0);
  const [fileName, setFileName] = useState('');
  const quests = useDailyQuests('en');

  useEffect(() => {
    const previous = document.body.style.background;
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.background = previous; document.documentElement.style.background = ''; document.body.style.overflow = ''; };
  }, []);
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('lifeos-duckies-state') || '{}');
    if (Number.isInteger(saved.seconds) && saved.seconds >= 0 && saved.seconds <= 24 * 60 * 60) setSeconds(saved.seconds);
    if (Number.isInteger(saved.water) && saved.water >= 0 && saved.water <= 10000) setWater(saved.water);
  }, []);
  useEffect(() => { localStorage.setItem('lifeos-duckies-state', JSON.stringify({ seconds, water })); }, [seconds, water]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds(value => value > 0 ? value - 1 : 0), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => { window.lifeOsDuckies?.resize(expanded ? 190 : 38, expanded ? 640 : 240); }, [expanded]);
  const format = (value: number) => `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
  const tabButton = (value: Tab, label: string, Icon: typeof CheckSquare) => <button type="button" aria-label={label} aria-pressed={tab === value} className={tab === value ? 'duckiesTab active' : 'duckiesTab'} onClick={() => setTab(value)}><Icon size={14} aria-hidden="true" /></button>;

  return <main className={`duckiesWidget ${expanded ? 'expanded' : 'compact'}`} onMouseEnter={() => setExpanded(true)} onMouseLeave={() => setExpanded(false)}>
    {!expanded ? <button type="button" className="duckiesCompact" onClick={() => setExpanded(true)}><b>⚡ Focus</b><span>{format(seconds)}</span><span>💧 {water} ml</span></button> : <section className="duckiesPanel" aria-label="Duckies">
      <header><strong>DUCKIES</strong><nav aria-label="Duckies tabs">{tabButton('quests', 'Daily quests', CheckSquare)}{tabButton('timer', 'Focus timer', Clock)}{tabButton('water', 'Water tracker', Droplets)}{tabButton('pet', 'Scaramouche pet', Cat)}{tabButton('shelf', 'File shelf', FolderDown)}</nav></header>
      <div className="duckiesContent">
        {tab === 'quests' && <div><p className="duckiesMuted">Today’s quests · {quests.todos.filter(item => item.done).length}/{quests.todos.length}</p>{quests.todos.slice(0, 4).map(item => <label className="duckiesQuest" key={item.id}><input type="checkbox" checked={item.done} disabled={quests.busy} onChange={event => void quests.onToggle(item.id, event.target.checked)} /><span>{item.label}</span></label>)}{quests.error && <p role="alert">{quests.error}</p>}{!quests.todos.length && <p className="duckiesMuted">No quests today.</p>}</div>}
        {tab === 'timer' && <div className="duckiesCenter"><strong className="duckiesTimer">{format(seconds)}</strong><div><button type="button" className="duckiesAction" onClick={() => setRunning(value => !value)}>{running ? 'Pause' : 'Start'}</button><button type="button" className="duckiesAction secondary" onClick={() => { setRunning(false); setSeconds(defaultSeconds); }}>Reset</button></div></div>}
        {tab === 'water' && <div className="duckiesCenter"><strong>{water} / 2000 ml</strong><div><button type="button" className="duckiesAction" onClick={() => setWater(value => Math.min(10000, value + 250))}>+250 ml</button><button type="button" className="duckiesAction secondary" onClick={() => setWater(0)}>Reset</button></div></div>}
        {tab === 'pet' && <div className="duckiesPet"><span aria-hidden="true">🧙</span><div><b>Mini Scaramouche</b><p>Finish your quest before the day ends.</p></div></div>}
        {tab === 'shelf' && <div className="duckiesShelf" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); setFileName(event.dataTransfer.files[0]?.name || ''); }}><FolderDown size={20} aria-hidden="true" /><span>{fileName || 'Drop a file here for a temporary shelf.'}</span></div>}
      </div>
    </section>}
  </main>;
}

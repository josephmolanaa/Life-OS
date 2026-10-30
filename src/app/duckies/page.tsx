'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckSquare, Clock, Droplets, Cat, FolderDown, Pause, Play, RotateCcw, Plus, Bell, Volume2, VolumeX } from 'lucide-react';
import { useDailyQuests } from '@/components/use-daily-quests';
import { getLang, type Lang } from '@/lib/i18n';

type Tab = 'quests' | 'timer' | 'water' | 'pet' | 'shelf';
type Settings = { enabled: boolean; notifications: boolean; sound: boolean };
type Toast = { id: number; title: string; body: string; tone: 'green' | 'blue' | 'amber' };

const focusSeconds = 25 * 60;
const waterGoal = 2000;

// Two-note glass chime: soft attack, long exponential tail, octave partial, low-pass for warmth.
function chime(tone: Toast['tone']) {
  try {
    const context = new AudioContext();
    const notes = tone === 'green' ? [587.33, 880] : tone === 'blue' ? [523.25, 783.99] : [659.25, 987.77];
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3200;
    filter.connect(context.destination);
    notes.forEach((frequency, index) => {
      const start = context.currentTime + 0.02 + index * 0.11;
      [[frequency, 0.16], [frequency * 2, 0.04]].forEach(([hz, level]) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = hz;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(level, start + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
        oscillator.connect(gain).connect(filter);
        oscillator.start(start);
        oscillator.stop(start + 0.72);
      });
    });
    window.setTimeout(() => void context.close(), 1200);
  } catch { /* Audio is optional. */ }
}

export default function DuckiesPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>('quests');
  const [seconds, setSeconds] = useState(focusSeconds);
  const [running, setRunning] = useState(false);
  const [water, setWater] = useState(0);
  const [fileName, setFileName] = useState('');
  const [settings, setSettings] = useState<Settings>({ enabled: true, notifications: false, sound: false });
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const quests = useDailyQuests(lang);
  const id = lang === 'id';
  const done = quests.todos.filter(item => item.done).length;

  useEffect(() => {
    getLang().then(setLang);
    window.lifeOsDuckies?.getSettings().then(setSettings).catch(() => {});
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.overflow = 'hidden';
    try {
      const saved = JSON.parse(localStorage.getItem('lifeos-duckies-state') || '{}');
      if (Number.isInteger(saved.seconds) && saved.seconds >= 0 && saved.seconds <= 86400) setSeconds(saved.seconds);
      if (Number.isInteger(saved.water) && saved.water >= 0 && saved.water <= 10000 && saved.day === new Date().toDateString()) setWater(saved.water);
    } catch { /* Corrupt state falls back to defaults. */ }
    return window.lifeOsDuckies?.onSettings?.(setSettings);
  }, []);
  useEffect(() => { localStorage.setItem('lifeos-duckies-state', JSON.stringify({ seconds, water, day: new Date().toDateString() })); }, [seconds, water]);

  const notify = useCallback((next: Omit<Toast, 'id'>) => {
    if (settings.sound) chime(next.tone);
    if (!settings.notifications) return;
    window.clearTimeout(toastTimer.current);
    setToast({ ...next, id: Date.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, [settings.notifications, settings.sound]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds(value => {
      if (value > 1) return value - 1;
      setRunning(false);
      notify({ title: id ? 'Fokus selesai' : 'Focus complete', body: id ? 'Waktunya istirahat 5 menit.' : 'Time for a 5-minute break.', tone: 'green' });
      return 0;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running, notify, id]);

  const mode = expanded ? 'expanded' : toast ? 'toast' : 'compact';

  const format = (value: number) => `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
  const progress = 1 - seconds / focusSeconds;
  const addWater = () => setWater(value => {
    const next = Math.min(10000, value + 250);
    if (value < waterGoal && next >= waterGoal) notify({ title: id ? 'Target air tercapai' : 'Water goal reached', body: `${next} / ${waterGoal} ml`, tone: 'blue' });
    return next;
  });
  const toggleQuest = async (questId: string, checked: boolean) => {
    if (await quests.onToggle(questId, checked) && checked) notify({ title: id ? 'Quest selesai' : 'Quest complete', body: `${done + 1}/${quests.todos.length} ${id ? 'hari ini' : 'today'}`, tone: 'amber' });
  };
  const tabs: [Tab, string, typeof CheckSquare][] = [
    ['quests', id ? 'Quest' : 'Quests', CheckSquare], ['timer', id ? 'Fokus' : 'Focus', Clock], ['water', id ? 'Air' : 'Water', Droplets], ['pet', 'Pet', Cat], ['shelf', 'Shelf', FolderDown],
  ];

  return <main className={`island ${mode}`} onMouseEnter={() => { window.lifeOsDuckies?.setInteractive?.(true); setExpanded(true); }} onMouseLeave={() => { window.lifeOsDuckies?.setInteractive?.(false); setExpanded(false); }}>
    {mode === 'compact' && <button type="button" className="islandLayer islandCompact" onClick={() => setExpanded(true)} aria-label={id ? 'Buka Duckies' : 'Open Duckies'}>
      <span className={`islandRing ${running ? 'live' : ''}`} style={{ ['--p' as string]: progress }} aria-hidden="true" />
      <span className="islandTime">{running || seconds < focusSeconds ? format(seconds) : `${done}/${quests.todos.length}`}</span>
      <span className="islandMeta"><Droplets size={11} aria-hidden="true" />{(water / 1000).toFixed(1)}L</span>
    </button>}

    {mode === 'toast' && toast && <div key={toast.id} className={`islandLayer islandToast ${toast.tone}`} role="status" aria-live="polite">
      <span className="islandToastIcon"><Bell size={15} aria-hidden="true" /></span>
      <div><b>{toast.title}</b><small>{toast.body}</small></div>
    </div>}

    {mode === 'expanded' && <section className="islandLayer islandPanel" aria-label="Duckies">
      <header>
        <strong>Duckies</strong>
        <nav aria-label={id ? 'Tab Duckies' : 'Duckies tabs'}>{tabs.map(([value, label, Icon]) => <button key={value} type="button" title={label} aria-label={label} aria-pressed={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}><Icon size={14} aria-hidden="true" /></button>)}</nav>
        <span className="islandFlags" aria-label={id ? 'Status notifikasi dan suara' : 'Notification and sound status'}>
          <Bell size={12} className={settings.notifications ? 'on' : ''} aria-hidden="true" />{settings.sound ? <Volume2 size={12} className="on" aria-hidden="true" /> : <VolumeX size={12} aria-hidden="true" />}
        </span>
      </header>
      <div className="islandBody">
        {tab === 'quests' && <div className="islandQuests">
          <p className="islandMuted">{id ? 'Quest hari ini' : 'Today’s quests'} · {done}/{quests.todos.length}</p>
          {quests.todos.slice(0, 4).map(item => <label key={item.id} className={item.done ? 'done' : ''}><input type="checkbox" checked={item.done} disabled={quests.busy} onChange={event => void toggleQuest(item.id, event.target.checked)} /><span>{item.label}</span></label>)}
          {quests.error && <p role="alert" className="islandMuted">{quests.error}</p>}
          {!quests.loading && !quests.todos.length && <p className="islandMuted">{id ? 'Belum ada quest hari ini.' : 'No quests today.'}</p>}
        </div>}
        {tab === 'timer' && <div className="islandCenter">
          <div className="islandDial" style={{ ['--p' as string]: progress }}><strong>{format(seconds)}</strong></div>
          <div className="islandActions">
            <button type="button" className="primary" onClick={() => setRunning(value => !value)}>{running ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}{running ? (id ? 'Jeda' : 'Pause') : (id ? 'Mulai' : 'Start')}</button>
            <button type="button" onClick={() => { setRunning(false); setSeconds(focusSeconds); }}><RotateCcw size={14} aria-hidden="true" />Reset</button>
          </div>
        </div>}
        {tab === 'water' && <div className="islandCenter">
          <div className="islandWater"><i style={{ width: `${Math.min(100, water / waterGoal * 100)}%` }} /></div>
          <strong>{water} / {waterGoal} ml</strong>
          <div className="islandActions"><button type="button" className="primary blue" onClick={addWater}><Plus size={14} aria-hidden="true" />250 ml</button><button type="button" onClick={() => setWater(0)}><RotateCcw size={14} aria-hidden="true" />Reset</button></div>
        </div>}
        {tab === 'pet' && <div className="islandPet"><span aria-hidden="true">🦆</span><div><b>Ducky</b><p>{done === quests.todos.length && quests.todos.length ? (id ? 'Semua quest beres. Mantap!' : 'All quests done. Nice!') : (id ? 'Selesaikan quest sebelum hari berganti.' : 'Finish your quests before the day ends.')}</p></div></div>}
        {tab === 'shelf' && <div className="islandShelf" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); setFileName(event.dataTransfer.files[0]?.name || ''); }}><FolderDown size={20} aria-hidden="true" /><span>{fileName || (id ? 'Taruh file di sini (sementara).' : 'Drop a file here (temporary).')}</span></div>}
      </div>
    </section>}
  </main>;
}

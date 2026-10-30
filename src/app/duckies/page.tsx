'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CheckSquare, Clock, Droplets, Cat, FolderDown, Pause, Play, RotateCcw, Plus, Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { useDailyQuests } from '@/components/use-daily-quests';
import { getLang, type Lang } from '@/lib/i18n';
import { PixelDuck } from '@/components/pixel-duck';

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
  const [dnd, setDnd] = useState(false);
  const [clock, setClock] = useState('');
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
    setDnd(localStorage.getItem('lifeos-duckies-dnd') === '1');
    // Desktop clock in the system locale; a string state skips re-renders until the minute changes.
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const clockTimer = window.setInterval(tick, 5000);
    const offSettings = window.lifeOsDuckies?.onSettings?.(setSettings);
    return () => { window.clearInterval(clockTimer); offSettings?.(); };
  }, []);
  const toggleDnd = () => setDnd(value => { localStorage.setItem('lifeos-duckies-dnd', value ? '0' : '1'); return !value; });
  useEffect(() => { localStorage.setItem('lifeos-duckies-state', JSON.stringify({ seconds, water, day: new Date().toDateString() })); }, [seconds, water]);

  const notify = useCallback((next: Omit<Toast, 'id'>) => {
    if (dnd) return;
    if (settings.sound) chime(next.tone);
    if (!settings.notifications) return;
    window.clearTimeout(toastTimer.current);
    setToast({ ...next, id: Date.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, [dnd, settings.notifications, settings.sound]);

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
  // Like iPhone: the island hugs whatever is showing. Measure the active layer and let CSS spring to it.
  const layer = useRef<HTMLElement | null>(null);
  const [fit, setFit] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const node = layer.current;
    if (!node || mode === 'expanded') { setFit(null); return; }
    const measure = () => setFit({ width: Math.ceil(node.offsetWidth), height: Math.ceil(node.offsetHeight) });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [mode, toast?.id]);
  const timerActive = running || seconds < focusSeconds;
  // The window hugs the pill. Grow it before the CSS spring expands (so nothing clips),
  // shrink it only after the spring settles (so the collapse stays visible).
  // Grows apply at once; shrinks wait for the spring to settle and for the cursor to leave,
  // so the window never slides out from under a hovering cursor.
  const islandRef = useRef<HTMLElement | null>(null);
  const windowSize = useRef<[number, number]>([0, 0]);
  const hovering = useRef(false);
  const shrinkTimer = useRef<number | undefined>(undefined);
  const target = useRef<[number, number]>([0, 0]);
  const applyWindow = useCallback(() => {
    const [w, h] = target.current;
    if (!w || (w === windowSize.current[0] && h === windowSize.current[1])) return;
    windowSize.current = [w, h];
    window.lifeOsDuckies?.resize(h, w);
  }, []);
  const scheduleShrink = useCallback(() => {
    window.clearTimeout(shrinkTimer.current);
    shrinkTimer.current = window.setTimeout(() => { if (!hovering.current) applyWindow(); }, 560);
  }, [applyWindow]);
  useEffect(() => {
    const width = mode === 'expanded' ? 560 : fit?.width;
    const height = mode === 'expanded' ? 230 : fit?.height;
    if (!width || !height) return;
    target.current = [Math.ceil(width) + 4, Math.ceil(height) + 4];
    const [w, h] = windowSize.current;
    if (target.current[0] >= w && target.current[1] >= h) { window.clearTimeout(shrinkTimer.current); applyWindow(); }
    else scheduleShrink();
  }, [mode, fit, applyWindow, scheduleShrink]);
  // Hover intent: a short dwell opens, a short grace keeps it open while the cursor wobbles out.
  const hoverTimer = useRef<number | undefined>(undefined);
  const hoverIn = () => { hovering.current = true; window.clearTimeout(hoverTimer.current); hoverTimer.current = window.setTimeout(() => setExpanded(true), 120); };
  const hoverOut = () => { hovering.current = false; window.clearTimeout(hoverTimer.current); hoverTimer.current = window.setTimeout(() => {
    // Windows fires a spurious mouseleave when the window resizes under a still cursor; trust :hover instead.
    if (islandRef.current?.matches(':hover')) { hovering.current = true; return; }
    setExpanded(false);
  }, 220); if (!expanded) scheduleShrink(); };
  const compactKind = timerActive ? 'live' : quests.todos.length || water ? 'split' : 'idle';
  const dndLabel = dnd ? (id ? 'Matikan Jangan Ganggu' : 'Turn off Do Not Disturb') : (id ? 'Nyalakan Jangan Ganggu' : 'Turn on Do Not Disturb');
  const bell = <button type="button" className={`islandBell ${dnd ? 'on' : ''}`} onClick={event => { event.stopPropagation(); toggleDnd(); }} aria-pressed={dnd} aria-label={dndLabel} title={dndLabel}>{dnd ? <BellOff size={14} aria-hidden="true" /> : <Bell size={14} aria-hidden="true" />}</button>;

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

  return <main ref={islandRef} className={`island ${mode}`} style={fit ? { width: fit.width, height: fit.height } : undefined} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
    {mode === 'compact' && compactKind === 'idle' && <div ref={node => { layer.current = node; }} className="islandLayer islandCompact idle">
      <button type="button" className="islandExpand" onClick={() => setExpanded(true)} aria-label={id ? 'Buka Duckies' : 'Open Duckies'}><PixelDuck /><span className="islandTime">{clock}</span></button>
      <span className="islandGap" aria-hidden="true" />
      {bell}
    </div>}
    {mode === 'compact' && compactKind !== 'idle' && <button ref={node => { layer.current = node; }} type="button" className={`islandLayer islandCompact ${compactKind}`} onClick={() => setExpanded(true)} aria-label={id ? 'Buka Duckies' : 'Open Duckies'}>
      {timerActive ? <>
        <PixelDuck scene={running ? 'focus' : 'idle'} />
        <span className={`islandRing ${running ? 'live' : ''}`} style={{ ['--p' as string]: progress }} aria-hidden="true" />
        <span className="islandGap" aria-hidden="true" />
        <span className="islandTime green">{format(seconds)}</span>
      </> : quests.todos.length || water ? <>
        {quests.todos.length ? <span className="islandLead"><span className="islandRing" style={{ ['--p' as string]: done / quests.todos.length }} aria-hidden="true" /><span className="islandTime">{done}/{quests.todos.length}</span></span> : <PixelDuck />}
        <span className="islandGap" aria-hidden="true" />
        {water ? <span className="islandMeta"><Droplets size={12} aria-hidden="true" />{(water / 1000).toFixed(1)}L</span> : <PixelDuck />}
      </> : null}
    </button>}

    {mode === 'toast' && toast && <div ref={node => { layer.current = node; }} key={toast.id} className={`islandLayer islandToast ${toast.tone}`} role="status" aria-live="polite">
      <span className="islandToastIcon"><PixelDuck scene="success" size={28} /></span>
      <div><b>{toast.title}</b><small>{toast.body}</small></div>
    </div>}

    {mode === 'expanded' && <section className="islandLayer islandPanel" aria-label="Duckies">
      <header>
        <strong className="islandBrand"><PixelDuck size={28} />Duckies</strong>
        <nav aria-label={id ? 'Tab Duckies' : 'Duckies tabs'}>{tabs.map(([value, label, Icon]) => <button key={value} type="button" title={label} aria-label={label} aria-pressed={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}><Icon size={14} aria-hidden="true" /></button>)}</nav>
        <span className="islandFlags" aria-label={id ? 'Status notifikasi dan suara' : 'Notification and sound status'}>
          {bell}{settings.sound ? <Volume2 size={12} className="on" aria-hidden="true" /> : <VolumeX size={12} aria-hidden="true" />}
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
        {tab === 'pet' && <div className="islandPet"><PixelDuck scene={done === quests.todos.length && quests.todos.length ? 'success' : 'idle'} size={84} /><div><b>Ducky</b><p>{done === quests.todos.length && quests.todos.length ? (id ? 'Semua quest beres. Mantap!' : 'All quests done. Nice!') : (id ? 'Selesaikan quest sebelum hari berganti.' : 'Finish your quests before the day ends.')}</p></div></div>}
        {tab === 'shelf' && <div className="islandShelf" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); setFileName(event.dataTransfer.files[0]?.name || ''); }}><FolderDown size={20} aria-hidden="true" /><span>{fileName || (id ? 'Taruh file di sini (sementara).' : 'Drop a file here (temporary).')}</span></div>}
      </div>
    </section>}
  </main>;
}

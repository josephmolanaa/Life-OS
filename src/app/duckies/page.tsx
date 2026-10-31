'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CheckSquare, Clock, Droplets, Cat, FolderDown, Pause, Play, RotateCcw, Minus, Plus, Bell, BellOff, Volume2, VolumeX, X, FileText } from 'lucide-react';
import { useTodoistTasks } from '@/components/use-todoist-tasks';
import { duckiesDisplayKey, formatCountdown, readDuckiesDisplay, type DuckiesDisplay } from '@/lib/duckies-display';
import { getLang, type Lang } from '@/lib/i18n';
import { PixelDuck, duckScenes, type DuckScene } from '@/components/pixel-duck';

type Tab = 'tasks' | 'timer' | 'water' | 'pet' | 'shelf';
type Settings = { enabled: boolean; notifications: boolean; sound: boolean };
type Toast = { id: number; title: string; body: string; tone: 'green' | 'blue' | 'amber' | 'discord'; image?: string };
type ShelfItem = { id: number; name: string; detail: string; url?: string; text?: string };

const focusPresets = [15, 25, 45, 60];
const waterAmounts = [
  { ml: 200, id: 'Gelas', en: 'Glass' },
  { ml: 250, id: 'Cangkir', en: 'Cup' },
  { ml: 500, id: 'Botol', en: 'Bottle' },
  { ml: 750, id: 'Tumbler', en: 'Tumbler' },
];
const waterGoals = [1500, 2000, 2500, 3000];
const reminderPresets = [0, 30, 60, 90];
const petNames: Record<DuckScene, [string, string]> = {
  idle: ['Santai', 'Chill'],
  focus: ['Koding', 'Coding'],
  success: ['Rayakan', 'Party'],
  debug: ['Debug', 'Debug'],
  error: ['Panik', 'Panic'],
  coffee: ['Ngopi', 'Coffee'],
  music: ['Lo-fi', 'Lo-fi'],
};

const readNumber = (key: string, fallback: number, min: number, max: number) => {
  const value = Number(localStorage.getItem(key));
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
};

const sizeLabel = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

// Two-note glass chime: soft attack, long exponential tail, octave partial, low-pass for warmth.
function chime(tone: Toast['tone']) {
  try {
    const context = new AudioContext();
    const notes = tone === 'green' ? [587.33, 880] : tone === 'blue' ? [523.25, 783.99] : tone === 'discord' ? [587.33, 880] : [659.25, 987.77];
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
  const [tab, setTab] = useState<Tab>('tasks');
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [water, setWater] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2000);
  const [reminderMinutes, setReminderMinutes] = useState(0);
  const [pet, setPet] = useState<DuckScene>('idle');
  const [shelf, setShelf] = useState<ShelfItem[]>([]);
  const [settings, setSettings] = useState<Settings>({ enabled: true, notifications: false, sound: false });
  const [toast, setToast] = useState<Toast | null>(null);
  const [dnd, setDnd] = useState(false);
  const [draft, setDraft] = useState('');
  const [completing, setCompleting] = useState<string[]>([]);
  const [display, setDisplay] = useState<DuckiesDisplay>(() => readDuckiesDisplay(null));
  const [now, setNow] = useState(() => new Date());
  const toastTimer = useRef<number | undefined>(undefined);
  const todoist = useTodoistTasks(lang);
  const id = lang === 'id';
  const openTasks = todoist.tasks.filter(item => !item.done);

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
    const minutes = readNumber('lifeos-duckies-focus', 25, 1, 180);
    setFocusMinutes(minutes);
    try { if (!Number.isInteger(JSON.parse(localStorage.getItem('lifeos-duckies-state') || '{}').seconds)) setSeconds(minutes * 60); } catch { setSeconds(minutes * 60); }
    setWaterGoal(readNumber('lifeos-duckies-water-goal', 2000, 250, 10000));
    setReminderMinutes(readNumber('lifeos-duckies-water-reminder', 0, 0, 240));
    const savedPet = localStorage.getItem('lifeos-duckies-pet');
    if (duckScenes.includes(savedPet as DuckScene)) setPet(savedPet as DuckScene);
    // Desktop clock in the system locale; a string state skips re-renders until the minute changes.
    setDisplay(readDuckiesDisplay(localStorage.getItem(duckiesDisplayKey)));
    const onStorage = (event: StorageEvent) => { if (event.key === duckiesDisplayKey) setDisplay(readDuckiesDisplay(event.newValue)); };
    window.addEventListener('storage', onStorage);
    const clockTimer = window.setInterval(() => setNow(new Date()), 5000);
    const offSettings = window.lifeOsDuckies?.onSettings?.(setSettings);
    return () => { window.clearInterval(clockTimer); window.removeEventListener('storage', onStorage); offSettings?.(); };
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
  // Desktop notifications from main (updates, reminders, page `new Notification()`) drop into the island.
  useEffect(() => window.lifeOsDuckies?.onToast?.(incoming => notify({ title: incoming.title, body: incoming.body, tone: (['blue', 'amber', 'discord'] as const).find(tone => tone === incoming.tone) ?? 'green', image: incoming.image?.startsWith('data:image/png;base64,') ? incoming.image : undefined })), [notify]);

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

  // Water reminder: nudges every N minutes until today's goal is met.
  useEffect(() => {
    if (!reminderMinutes || water >= waterGoal) return;
    const timer = window.setInterval(() => notify({ title: id ? 'Waktunya minum' : 'Time to drink', body: `${water} / ${waterGoal} ml`, tone: 'blue' }), reminderMinutes * 60000);
    return () => window.clearInterval(timer);
  }, [reminderMinutes, water, waterGoal, notify, id]);

  const mode = expanded ? 'expanded' : toast ? 'toast' : 'compact';
  const focusSeconds = focusMinutes * 60;
  const timerActive = running || seconds < focusSeconds;
  const setFocus = (minutes: number) => {
    const next = Math.min(180, Math.max(1, minutes));
    localStorage.setItem('lifeos-duckies-focus', String(next));
    setFocusMinutes(next);
    if (!running) setSeconds(next * 60);
  };
  const chooseGoal = (goal: number) => { localStorage.setItem('lifeos-duckies-water-goal', String(goal)); setWaterGoal(goal); };
  const chooseReminder = (minutes: number) => { localStorage.setItem('lifeos-duckies-water-reminder', String(minutes)); setReminderMinutes(minutes); };
  const choosePet = (scene: DuckScene) => { localStorage.setItem('lifeos-duckies-pet', scene); setPet(scene); };
  // Shelf: temporary, in-memory only. Files come from drag-drop or Ctrl+V; nothing is opened or uploaded.
  const addToShelf = (files: File[], text = '') => {
    const items: ShelfItem[] = files.map((file, index) => ({ id: Date.now() + index, name: file.name || (id ? 'Gambar ditempel' : 'Pasted image'), detail: sizeLabel(file.size), url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined }));
    if (!items.length && text.trim()) items.push({ id: Date.now(), name: text.trim().slice(0, 60), detail: `${text.length} ${id ? 'karakter' : 'chars'}`, text: text.trim() });
    if (items.length) setShelf(current => [...items, ...current].slice(0, 12));
  };
  const removeFromShelf = (item: ShelfItem) => { if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url); setShelf(current => current.filter(entry => entry.id !== item.id)); };
  // Desktop: read the OS clipboard through main (copied Explorer files, screenshots, text).
  const pasteFromClipboard = async () => {
    const clip = await window.lifeOsDuckies?.readClipboard?.();
    if (!clip || clip.error) {
      console.error('Clipboard read failed:', clip?.error || clip?.output);
      return false;
    }
    const now = Date.now();
    const items: ShelfItem[] = clip.files?.length
      ? clip.files.map((file, index) => ({ id: now + index, name: file.name, detail: sizeLabel(file.size) }))
      : clip.image ? [{ id: now, name: id ? 'Gambar ditempel' : 'Pasted image', detail: sizeLabel(clip.image.size), url: clip.image.preview }]
      : clip.text ? [{ id: now, name: clip.text.trim().slice(0, 60), detail: `${clip.text.length} ${id ? 'karakter' : 'chars'}`, text: clip.text.trim() }] : [];
    if (items.length) setShelf(current => [...items, ...current].slice(0, 12));
    return true;
  };

  // All three layers stay mounted and crossfade; only the black pill's size springs. Each layer is
  // measured continuously so the pill always knows the size of what it is about to show.
  const compactRef = useRef<HTMLElement | null>(null);
  const toastRef = useRef<HTMLDivElement | null>(null);
  const lastToast = useRef<Toast | null>(null);
  if (toast) lastToast.current = toast;
  const [compactSize, setCompactSize] = useState<[number, number]>([160, 36]);
  const [toastSize, setToastSize] = useState<[number, number]>([300, 64]);
  const compactKind = timerActive ? 'live' : 'idle';
  const center = display.mode === 'clock' ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : formatCountdown(new Date(display.target), now);
  // Re-bind on compactKind: idle and split/live are different nodes, so a stale observer would read a detached node as 0x0.
  useLayoutEffect(() => {
    const watch = (node: HTMLElement | null, set: (size: [number, number]) => void) => {
      if (!node) return undefined;
      const measure = () => { if (node.isConnected && node.offsetWidth) set([Math.ceil(node.offsetWidth), Math.ceil(node.offsetHeight)]); };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      return observer;
    };
    const observers = [watch(compactRef.current, setCompactSize), watch(toastRef.current, setToastSize)];
    return () => observers.forEach(observer => observer?.disconnect());
  }, [compactKind]);
  const [width, height] = mode === 'expanded' ? [560, 230] : mode === 'toast' ? toastSize : compactSize;
  // The OS window never resizes (that is what blinked); it is clipped to the pill instead. Grow the clip
  // before the spring opens, shrink it after the spring settles, with room for the soft shadow.
  const islandRef = useRef<HTMLElement | null>(null);
  const shape = useRef<[number, number]>([0, 0]);
  const applyShape = useCallback(() => {
    shape.current = [width, height];
    const pad = 18, canvas = 600;
    // .duckiesRoute flex-centers the pill, so the clip is centered too.
    const w = Math.min(canvas, width + pad * 2);
    window.lifeOsDuckies?.setShape?.({ x: Math.max(0, Math.round((canvas - w) / 2)), y: 0, width: w, height: height + pad + 6 });
  }, [width, height]);
  // Grow the clip before the spring opens; shrink only after it settles so the close animation isn't cut off.
  useEffect(() => {
    if (width >= shape.current[0] && height >= shape.current[1]) { applyShape(); return; }
    const timer = window.setTimeout(applyShape, 560);
    return () => window.clearTimeout(timer);
  }, [applyShape, width, height]);
  // Hover intent: a short dwell opens, a short grace closes, so passing the cursor across doesn't flicker.
  const hoverTimer = useRef<number | undefined>(undefined);
  const hoverIn = () => { window.clearTimeout(hoverTimer.current); hoverTimer.current = window.setTimeout(() => setExpanded(true), 120); };
  const hoverOut = () => { window.clearTimeout(hoverTimer.current); hoverTimer.current = window.setTimeout(() => setExpanded(false), 220); };
  const dndLabel = dnd ? (id ? 'Matikan Jangan Ganggu' : 'Turn off Do Not Disturb') : (id ? 'Nyalakan Jangan Ganggu' : 'Turn on Do Not Disturb');
  const bell = <button type="button" className={`islandBell ${dnd ? 'on' : ''}`} onClick={event => { event.stopPropagation(); toggleDnd(); }} aria-pressed={dnd} aria-label={dndLabel} title={dndLabel}>{dnd ? <BellOff size={14} aria-hidden="true" /> : <Bell size={14} aria-hidden="true" />}</button>;

  const format = (value: number) => `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
  const progress = 1 - seconds / focusSeconds;
  const addWater = (amount: number) => setWater(value => {
    const next = Math.min(10000, value + amount);
    if (value < waterGoal && next >= waterGoal) notify({ title: id ? 'Target air tercapai' : 'Water goal reached', body: `${next} / ${waterGoal} ml`, tone: 'blue' });
    return next;
  });
  const toggleTask = async (taskId: string, checked: boolean) => {
    if (await todoist.onToggle(taskId, checked) && checked) notify({ title: id ? 'Tugas selesai' : 'Task done', body: `${openTasks.length - 1} ${id ? 'tugas tersisa' : 'tasks left'}`, tone: 'amber' });
  };
  // macOS Reminders feel: fill + strike instantly, let the row fade out, then persist the completion.
  const completeTask = (taskId: string) => {
    if (completing.includes(taskId)) return;
    setCompleting(current => [...current, taskId]);
    window.setTimeout(() => { void toggleTask(taskId, true).finally(() => setCompleting(current => current.filter(item => item !== taskId))); }, 650);
  };
  const tabs: [Tab, string, typeof CheckSquare][] = [
    ['tasks', 'Todoist', CheckSquare], ['timer', id ? 'Fokus' : 'Focus', Clock], ['water', id ? 'Air' : 'Water', Droplets], ['pet', 'Pet', Cat], ['shelf', 'Shelf', FolderDown],
  ];

  return <main ref={islandRef} className={`island ${mode}`} style={{ width, height }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
    {compactKind === 'idle' && <div ref={node => { compactRef.current = node; }} className={`islandLayer islandCompact idle ${mode === 'compact' ? 'on' : ''}`} aria-hidden={mode !== 'compact'}>
      <button type="button" className="islandExpand" onClick={() => setExpanded(true)} aria-label={id ? 'Buka Duckies' : 'Open Duckies'}><PixelDuck scene={pet} /><span className={`islandTime ${display.mode === 'countdown' ? 'red' : ''}`}>{center}</span></button>
      {bell}
    </div>}
    {compactKind !== 'idle' && <button ref={node => { compactRef.current = node; }} type="button" className={`islandLayer islandCompact ${compactKind} ${mode === 'compact' ? 'on' : ''}`} aria-hidden={mode !== 'compact'} tabIndex={mode === 'compact' ? 0 : -1} onClick={() => setExpanded(true)} aria-label={id ? 'Buka Duckies' : 'Open Duckies'}>
      {timerActive ? <>
        <PixelDuck scene={running ? 'focus' : pet} />
        <span className={`islandRing ${running ? 'live' : ''}`} style={{ ['--p' as string]: progress }} aria-hidden="true" />
        <span className="islandGap" aria-hidden="true" />
        <span className="islandTime green">{format(seconds)}</span>
      </> : null}
    </button>}

    <div ref={toastRef} className={`islandLayer islandToast ${lastToast.current?.tone ?? 'green'} ${mode === 'toast' ? 'on' : ''}`} role="status" aria-live="polite">
      {lastToast.current?.image ? <img className="islandToastAvatar" src={lastToast.current.image} alt="" aria-hidden="true" /> : <span className="islandToastIcon"><PixelDuck scene="success" size={28} /></span>}
      <div><b>{lastToast.current?.title ?? 'Duckies'}</b><small>{lastToast.current?.body ?? ''}</small></div>
    </div>

    <section className={`islandLayer islandPanel ${mode === 'expanded' ? 'on' : ''}`} aria-label="Duckies" aria-hidden={mode !== 'expanded'}>
      <header>
        <strong className="islandBrand"><PixelDuck scene={pet} size={28} />Duckies</strong>
        <nav aria-label={id ? 'Tab Duckies' : 'Duckies tabs'}>{tabs.map(([value, label, Icon]) => <button key={value} type="button" title={label} aria-label={label} aria-pressed={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}><Icon size={14} aria-hidden="true" /></button>)}</nav>
        <span className="islandFlags" aria-label={id ? 'Status notifikasi dan suara' : 'Notification and sound status'}>
          {bell}{settings.sound ? <Volume2 size={12} className="on" aria-hidden="true" /> : <VolumeX size={12} aria-hidden="true" />}
        </span>
      </header>
      <div className="islandBody">
        {tab === 'tasks' && <div className="macReminders">
          <div className="macRemindersHead">
            <span className="macRemindersDot" aria-hidden="true" />
            <b>Inbox</b>
            <span className="macRemindersCount">{openTasks.length}</span>
          </div>
          <ul className="macRemindersList">
            {openTasks.slice(0, 5).map(item => <li key={item.id} className={completing.includes(item.id) ? 'completing' : ''}>
              <button type="button" className={`macCheck ${(item.priority || 'MEDIUM').toLowerCase()}`} aria-pressed={completing.includes(item.id)} onClick={() => completeTask(item.id)} aria-label={`${id ? 'Selesaikan' : 'Complete'} ${item.label}`} />
              <span className="macRemindersText"><span>{item.label}</span>{item.due_date && <small>{new Date(`${item.due_date}T12:00:00`).toLocaleDateString(id ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' })}{item.due_time ? ` · ${item.due_time.slice(0, 5)}` : ''}</small>}</span>
              <button type="button" className="macRemindersDelete" disabled={todoist.busy} onClick={() => void todoist.onDelete(item.id)} aria-label={`${id ? 'Hapus' : 'Delete'} ${item.label}`}><X size={12} aria-hidden="true" /></button>
            </li>)}
            {openTasks.length > 5 && <li className="macRemindersMore">+{openTasks.length - 5} {id ? 'lainnya di Life OS' : 'more in Life OS'}</li>}
          </ul>
          {!todoist.loading && !openTasks.length && <p className="macRemindersEmpty">{id ? 'Semua beres.' : 'All done.'}</p>}
          {todoist.error && <p role="alert" className="macRemindersEmpty">{todoist.error}</p>}
          <form className="macRemindersAdd" onSubmit={event => { event.preventDefault(); const label = draft.trim(); if (!label || todoist.busy) return; setDraft(''); void todoist.onAdd(label); }}>
            <Plus size={14} aria-hidden="true" />
            <input type="text" value={draft} maxLength={120} placeholder={id ? 'Pengingat baru' : 'New Reminder'} disabled={todoist.busy} onChange={event => setDraft(event.target.value)} aria-label={id ? 'Tugas baru untuk Inbox' : 'New Inbox task'} />
          </form>
        </div>}
        {tab === 'timer' && <div className="islandSplit">
          <div className="islandDial" style={{ ['--p' as string]: progress }}><strong>{format(seconds)}</strong></div>
          <div className="islandControls">
            <div className="islandStepper" aria-label={id ? 'Durasi fokus' : 'Focus length'}>
              <button type="button" onClick={() => setFocus(focusMinutes - 5)} disabled={running || focusMinutes <= 1} aria-label={id ? 'Kurangi 5 menit' : 'Minus 5 minutes'}><Minus size={13} aria-hidden="true" /></button>
              <label><input type="number" min={1} max={180} value={focusMinutes} disabled={running} onChange={event => setFocus(Math.round(Number(event.target.value) || 1))} aria-label={id ? 'Menit' : 'Minutes'} /><span>{id ? 'menit' : 'min'}</span></label>
              <button type="button" onClick={() => setFocus(focusMinutes + 5)} disabled={running || focusMinutes >= 180} aria-label={id ? 'Tambah 5 menit' : 'Plus 5 minutes'}><Plus size={13} aria-hidden="true" /></button>
            </div>
            <div className="islandChips">{focusPresets.map(minutes => <button key={minutes} type="button" className={focusMinutes === minutes ? 'active' : ''} disabled={running} onClick={() => setFocus(minutes)}>{minutes}m</button>)}</div>
            <div className="islandActions">
              <button type="button" className="primary" onClick={() => setRunning(value => !value)}>{running ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}{running ? (id ? 'Jeda' : 'Pause') : (id ? 'Mulai' : 'Start')}</button>
              <button type="button" onClick={() => { setRunning(false); setSeconds(focusSeconds); }}><RotateCcw size={14} aria-hidden="true" />Reset</button>
            </div>
          </div>
        </div>}
        {tab === 'water' && <div className="islandSplit">
          <div className="islandWaterSummary">
            <strong>{water}<small> / {waterGoal} ml</small></strong>
            <div className="islandWater"><i style={{ width: `${Math.min(100, water / waterGoal * 100)}%` }} /></div>
            <button type="button" className="islandLink" onClick={() => setWater(0)}><RotateCcw size={12} aria-hidden="true" />Reset</button>
          </div>
          <div className="islandControls">
            <div className="islandChips">{waterAmounts.map(item => <button key={item.ml} type="button" className="blue" onClick={() => addWater(item.ml)} title={id ? item.id : item.en}>+{item.ml}<small>{id ? item.id : item.en}</small></button>)}</div>
            <div className="islandChipRow"><span>{id ? 'Target' : 'Goal'}</span>{waterGoals.map(goal => <button key={goal} type="button" className={waterGoal === goal ? 'active' : ''} onClick={() => chooseGoal(goal)}>{goal / 1000}L</button>)}</div>
            <div className="islandChipRow"><span>{id ? 'Ingatkan' : 'Remind'}</span>{reminderPresets.map(minutes => <button key={minutes} type="button" className={reminderMinutes === minutes ? 'active' : ''} onClick={() => chooseReminder(minutes)}>{minutes ? `${minutes}m` : (id ? 'Mati' : 'Off')}</button>)}</div>
          </div>
        </div>}
        {tab === 'pet' && <div className="islandPet">
          <PixelDuck scene={pet} size={84} />
          <div className="islandPetPicker">
            <p className="islandMuted">{id ? 'Pilih model Duckies — dipakai juga di island.' : 'Pick a Duckies model — used on the island too.'}</p>
            <div role="radiogroup" aria-label={id ? 'Model Duckies' : 'Duckies model'}>{duckScenes.map(scene => <button key={scene} type="button" role="radio" aria-checked={pet === scene} className={pet === scene ? 'active' : ''} onClick={() => choosePet(scene)} title={petNames[scene][id ? 0 : 1]}><PixelDuck scene={scene} size={28} /><span>{petNames[scene][id ? 0 : 1]}</span></button>)}</div>
          </div>
        </div>}
        {tab === 'shelf' && <div className={`islandShelf ${shelf.length ? 'filled' : ''}`} tabIndex={0} role="region" aria-label={id ? 'Shelf: tarik file atau tekan Ctrl+V' : 'Shelf: drop files or press Ctrl+V'} onClick={event => { event.currentTarget.focus(); void pasteFromClipboard(); }} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v' && window.lifeOsDuckies?.readClipboard) { event.preventDefault(); void pasteFromClipboard(); } }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }} onDrop={event => { event.preventDefault(); addToShelf([...event.dataTransfer.files], event.dataTransfer.getData('text/plain')); }} onPaste={event => { event.preventDefault(); addToShelf([...event.clipboardData.files], event.clipboardData.getData('text/plain')); }}>
          {shelf.length ? <ul>{shelf.map(item => <li key={item.id} draggable={true} onDragStart={event => { event.dataTransfer.setData('text/plain', item.text ?? item.url ?? item.name); event.dataTransfer.effectAllowed = 'copyMove'; }} onDragEnd={event => { if (event.dataTransfer.dropEffect === 'move') removeFromShelf(item); }} onClick={event => { event.stopPropagation(); void pasteFromClipboard(); }}>{item.url ? <img src={item.url} alt="" draggable={false} /> : item.text ? <FileText size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}<span><b>{item.name}</b><small>{item.detail}</small></span><button type="button" onClick={event => { event.stopPropagation(); removeFromShelf(item); }} aria-label={`${id ? 'Hapus' : 'Remove'} ${item.name}`}><X size={12} aria-hidden="true" /></button></li>)}</ul>
            : <><FolderDown size={20} aria-hidden="true" /><span>{id ? 'Taruh file di sini, atau klik / Ctrl+V untuk tempel dari clipboard.' : 'Drop files here, or click / Ctrl+V to paste from clipboard.'}</span></>}
        </div>}
      </div>
    </section>
  </main>;
}

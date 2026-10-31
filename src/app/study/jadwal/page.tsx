'use client';

import { useEffect, useState } from 'react';
import { Shell } from '@/components/finance/layout';
import { getLang } from '@/lib/i18n';
import { defaultStudySchedule } from '@/lib/study';

type StudyItem = {
  id?: string;
  code: string;
  course: string;
  day: string;
  sessions?: string | null;
  time?: string | null;
  room?: string | null;
  lecturer?: string | null;
  semester?: string | null;
};

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU', '-'];
const FIELDS = ['code', 'course', 'day', 'sessions', 'time', 'room', 'lecturer', 'semester'] as const;
const empty: StudyItem = { code: '', course: '', day: 'SENIN', sessions: '', time: '', room: '', lecturer: '', semester: 'Semester 7' };
const dayOrder = (d: string) => { const i = DAYS.indexOf(d.toUpperCase()); return i < 0 ? 99 : i; };
const th: React.CSSProperties = { padding: '12px 10px', color: 'var(--text2)', fontWeight: 600, fontSize: 12 };
const td: React.CSSProperties = { padding: '12px 10px', verticalAlign: 'top', overflowWrap: 'anywhere' };

export default function JadwalPage() {
  const [id, setId] = useState(false);
  const [items, setItems] = useState<StudyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<StudyItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { getLang().then(l => setId(l === 'id')); load(); }, []);

  async function load() {
    try {
      const res = await fetch('/api/study/schedule', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load schedule');
      setItems(data);
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  async function send(method: string, body?: object, itemId?: string) {
    const res = await fetch(`/api/study/schedule${itemId ? `?id=${encodeURIComponent(itemId)}` : ''}`, {
      method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Request failed');
  }

  async function run(task: () => Promise<void>) {
    setBusy(true); setError('');
    try { await task(); await load(); return true; }
    catch (err) { setError((err as Error).message); await load(); return false; }
    finally { setBusy(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const body = Object.fromEntries(FIELDS.map(f => [f, form[f] ?? '']));
    if (await run(() => send(form.id ? 'PATCH' : 'POST', body, form.id))) setForm(null);
  }

  async function remove(item: StudyItem) {
    if (!item.id || !confirm(id ? `Hapus ${item.course}?` : `Delete ${item.course}?`)) return;
    await run(() => send('DELETE', undefined, item.id));
  }

  // Skips codes already present, so a partial import can be resumed.
  const missing = defaultStudySchedule.filter(d => !items.some(i => i.code === d.code));
  const importDefaults = () => run(async () => { for (const item of missing) await send('POST', item); });

  const sorted = [...items].sort((a, b) => dayOrder(a.day) - dayOrder(b.day) || String(a.time).localeCompare(String(b.time)));
  const semester = items[0]?.semester || 'Semester 7';
  const unset = id ? 'Belum ditentukan' : 'Not specified';
  const show = (v?: string | null) => (!v || v === '-' ? unset : v);
  const label: Record<(typeof FIELDS)[number], string> = id
    ? { code: 'Kode', course: 'Mata kuliah', day: 'Hari', sessions: 'Jam ke', time: 'Waktu', room: 'Ruang', lecturer: 'Dosen', semester: 'Semester' }
    : { code: 'Code', course: 'Course', day: 'Day', sessions: 'Sessions', time: 'Time', room: 'Room', lecturer: 'Lecturer', semester: 'Semester' };
  const actions = (item: StudyItem) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button type="button" onClick={() => setForm({ ...item })} disabled={busy}>Edit</button>
      <button type="button" onClick={() => remove(item)} disabled={busy}>{id ? 'Hapus' : 'Delete'}</button>
    </div>
  );

  return (
    <Shell title={id ? 'Jadwal Kuliah' : 'Class Schedule'} quickFab={false}>
      <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{semester}</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!loading && missing.length > 0 && <button type="button" onClick={importDefaults} disabled={busy}>{id ? `Impor jadwal Semester 7 (${missing.length})` : `Import Semester 7 schedule (${missing.length})`}</button>}
            <button className="btn" type="button" onClick={() => setForm({ ...empty, semester })} disabled={busy}>{id ? 'Tambah mata kuliah' : 'Add course'}</button>
          </div>
        </div>

        {error && <div className="card" role="alert" style={{ padding: 16, color: 'var(--red)' }}>{error}</div>}

        {form && (
          <form className="card" onSubmit={save} style={{ padding: 20, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
            {FIELDS.map(f => (
              <label key={f} style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                {label[f]}
                {f === 'day'
                  ? <select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{DAYS.map(d => <option key={d}>{d}</option>)}</select>
                  : <input value={form[f] ?? ''} required={f === 'code' || f === 'course'} maxLength={f === 'code' ? 20 : 120} onChange={e => setForm({ ...form, [f]: e.target.value })} />}
              </label>
            ))}
            <div style={{ display: 'flex', gap: 8, gridColumn: '1 / -1' }}>
              <button className="btn" type="submit" disabled={busy}>{id ? 'Simpan' : 'Save'}</button>
              <button type="button" onClick={() => setForm(null)} disabled={busy}>{id ? 'Batal' : 'Cancel'}</button>
            </div>
          </form>
        )}

        {loading ? <p style={{ color: 'var(--text2)' }}>{id ? 'Memuat…' : 'Loading…'}</p>
          : !sorted.length ? (
            <div className="card" style={{ padding: 20 }}>{id ? 'Belum ada jadwal. Tambah mata kuliah atau impor jadwal Semester 7.' : 'No classes yet. Add a course or import the Semester 7 schedule.'}</div>
          ) : <>
            <div className="studyScheduleCards">
              {sorted.map(item => (
                <article className="card" key={item.id ?? item.code}>
                  <small>{item.code}</small><h3>{item.course}</h3>
                  <dl>
                    <dt>{id ? 'Hari / waktu' : 'Day / time'}</dt><dd>{item.day} · {show(item.time)}</dd>
                    <dt>{label.room}</dt><dd>{show(item.room)}</dd>
                    <dt>{label.lecturer}</dt><dd>{show(item.lecturer)}</dd>
                  </dl>
                  {actions(item)}
                </article>
              ))}
            </div>
            <div className="card studyScheduleTable" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <colgroup><col style={{ width: '12%' }} /><col style={{ width: '20%' }} /><col style={{ width: '9%' }} /><col style={{ width: '7%' }} /><col style={{ width: '11%' }} /><col style={{ width: '16%' }} /><col style={{ width: '14%' }} /><col style={{ width: '11%' }} /></colgroup>
                <thead>
                  <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                    {(['code', 'course', 'day', 'sessions', 'time', 'room', 'lecturer'] as const).map(f => <th scope="col" key={f} style={th}>{label[f].toUpperCase()}</th>)}
                    <th scope="col" style={th}><span className="sr-only">{id ? 'Aksi' : 'Actions'}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(item => (
                    <tr key={item.id ?? item.code} style={{ borderBottom: '1px solid var(--border2)' }}>
                      <td style={{ ...td, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text2)' }}>{item.code}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{item.course}</td>
                      <td style={td}><span className="pill">{item.day}</span></td>
                      <td style={{ ...td, fontFamily: 'JetBrains Mono, monospace' }}>{item.sessions || '-'}</td>
                      <td style={{ ...td, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text2)' }}>{item.time || '-'}</td>
                      <td style={td}>{item.room || '-'}</td>
                      <td style={{ ...td, color: 'var(--text2)' }}>{item.lecturer || '-'}</td>
                      <td style={td}>{actions(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>}
      </div>
    </Shell>
  );
}

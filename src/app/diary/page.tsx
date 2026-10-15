"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { Shell } from "@/components/finance/layout";
import { Calendar, Search, Trash2, Edit3, Plus, Smile, Flame, Book, Sparkles } from "lucide-react";
import { getLang, copy, type Lang, type Translation } from "@/lib/i18n";
import { ContentSkeleton } from "@/components/app-loading";
import { createClient } from "@/lib/supabase/client";

type Entry = { date: string; text: string; mood: string; updated: string };
type DiaryUser = { id: string; email?: string | null };

function localDate(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

async function diaryRequest(method: string, body?: object, signal?: AbortSignal) {
  const response = await fetch('/api/diary', {
    method, cache: 'no-store', signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Diary request failed. Please try again.');
  return data;
}
const moods = [
  { label: "Bad", icon: "😞", color: "#ef4444" },
  { label: "Meh", icon: "😐", color: "#f59e0b" },
  { label: "Okay", icon: "🙂", color: "#3b82f6" },
  { label: "Good", icon: "😊", color: "#10b981" },
  { label: "Great", icon: "🤩", color: "#8b5cf6" },
];

export default function DiaryPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [t, setT] = useState<Translation>(copy.en);
  const [date, setDate] = useState(localDate);
  const [text, setText] = useState("");
  const [mood, setMood] = useState("Okay");
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [q, setQ] = useState("");
  const [isEditing, setIsEditing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [user, setUser] = useState<DiaryUser | null>(null);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [expectedUpdated, setExpectedUpdated] = useState<string | null>(null);
  const activeUser = useRef<string | null>(null);
  const sessionUser = useRef<string | null | undefined>(undefined);
  const pending = useRef(false);
  const id = lang === 'id';

  useEffect(() => {
    const controller = new AbortController();
    getLang().then(l => { setLang(l); setT(copy[l]); });
    diaryRequest('GET', undefined, controller.signal).then((data: { entries: Entry[]; user: DiaryUser }) => {
      if (controller.signal.aborted) return;
      if (sessionUser.current !== undefined && sessionUser.current !== data.user.id) {
        setError('Account changed. Sign in and reload Diary.');
        return;
      }
      activeUser.current = data.user.id;
      setUser(data.user);
      const saved = Object.fromEntries(data.entries.map(entry => [entry.date, entry]));
      setEntries(saved);
      const today = localDate();
      setDate(today);
      setText(saved[today]?.text || '');
      setMood(saved[today]?.mood || 'Okay');
      setExpectedUpdated(saved[today]?.updated ?? null);
      try {
        setLegacyAvailable(!!localStorage.getItem('diary') && !localStorage.getItem(`diary-imported:${data.user.id}`));
      } catch { /* Database access still works when browser storage is unavailable. */ }
    }).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load diary.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user.id ?? null;
      const accountChanged = (sessionUser.current !== undefined && nextUser !== sessionUser.current)
        || (activeUser.current !== null && nextUser !== activeUser.current);
      sessionUser.current = nextUser;
      if (event === 'SIGNED_OUT' || accountChanged) {
        controller.abort();
        activeUser.current = null;
        setUser(null);
        setEntries({});
        setText('');
        setLegacyAvailable(false);
        setLoading(false);
        setError('Account changed. Sign in and reload Diary.');
      }
    });
    return () => { controller.abort(); subscription.unsubscribe(); activeUser.current = null; sessionUser.current = undefined; };
  }, []);

  const prompt = useMemo(() => {
    const data = entries;
    const keys = Object.keys(data).filter(k => k !== localDate());
    if (keys.length > 0) {
      const randomKey = keys.sort().at(-1)!;
      const entry = data[randomKey];
      const snippet = entry.text.length > 60 ? entry.text.substring(0, 60) + "..." : entry.text;
      const prompts = lang === 'id' ? [
        `Ingat kejadian pada ${randomKey}? Kamu nulis: "${snippet}". Bagaimana pandanganmu sekarang?`,
        `Coba tengok catatan ${randomKey}. Apa ada perkembangan dari apa yang kamu rasakan saat itu?`
      ] : [
        `Remember ${randomKey}? You wrote: "${snippet}". How do you feel about it now?`,
        `Look back at ${randomKey}. Has there been progress since then?`
      ];
      return prompts[0];
    } else {
      return lang === 'id' ? "Apa hal paling menarik yang terjadi hari ini?" : "What was the most interesting thing that happened today?";
    }
  }, [entries, lang]);

  const stats = useMemo(() => {
    const list = Object.values(entries).sort((a,b) => b.date.localeCompare(a.date));
    let streak = 0;
    const cursor = new Date();
    if (!entries[localDate(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (entries[localDate(cursor)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    const totalWords = list.reduce((sum, e) => sum + (e.text.trim().split(/\s+/).filter(Boolean).length || 0), 0);
    return { streak, totalWords, count: list.length };
  }, [entries]);

  const save = async () => {
    if (!user || pending.current || !date || !text.trim()) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const entry: Entry = await diaryRequest('PUT', { date, text, mood, userId: user.id, expectedUpdated });
      if (activeUser.current !== user.id) return;
      setEntries(s => ({ ...s, [entry.date]: entry }));
      setExpectedUpdated(entry.updated);
      setIsEditing(false);
      setNotice(id ? 'Catatan tersimpan di akunmu.' : 'Entry saved to your account.');

      if (entry.date === localDate()) {
        try {
          const res = await fetch('/api/todos', { cache: 'no-store' });
          if (!res.ok) throw new Error('Quest sync failed');
          const quests: { id: string; label: string; done: boolean }[] = await res.json();
          const journalTask = quests.find(task => /journal|reflection|diary/i.test(task.label));
          if (activeUser.current !== user.id) return;
          if (journalTask && !journalTask.done) {
            const update = await fetch(`/api/todos/${journalTask.id}`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: true }),
            });
            if (!update.ok) throw new Error('Quest sync failed');
          }
        } catch {
          if (activeUser.current === user.id) setNotice(id ? 'Catatan tersimpan. Daily Quest belum berhasil diperbarui.' : 'Entry saved. Daily Quest could not be updated.');
        }
      }
    } catch (error) {
      if (activeUser.current === user.id) setError(error instanceof Error ? error.message : 'Could not save diary.');
    } finally { pending.current = false; setBusy(false); }
  };

  const loadDraft = (nextDate: string) => {
    const entry = entries[nextDate];
    setDate(nextDate);
    setText(entry?.text || '');
    setMood(entry?.mood || 'Okay');
    setExpectedUpdated(entry?.updated ?? null);
    setError('');
    setNotice('');
    setIsEditing(true);
  };

  const startEdit = (d: string) => {
    if (pending.current) return;
    const dirty = isEditing && (text !== (entries[date]?.text || '') || mood !== (entries[date]?.mood || 'Okay'));
    if (dirty && !confirm(id ? 'Buang perubahan yang belum disimpan?' : 'Discard unsaved changes?')) return;
    loadDraft(d);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (d: string) => {
    if (!user || pending.current || !confirm(t.confirmDelete)) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await diaryRequest('DELETE', { date: d, userId: user.id, expectedUpdated: entries[d].updated });
      if (activeUser.current !== user.id) return;
      setEntries(current => { const next = { ...current }; delete next[d]; return next; });
      if (d === date) { setText(''); setMood('Okay'); setExpectedUpdated(null); setIsEditing(true); }
      setNotice(id ? 'Catatan dihapus dari akunmu.' : 'Entry deleted from your account.');
    } catch (error) {
      if (activeUser.current === user.id) setError(error instanceof Error ? error.message : 'Could not delete diary.');
    } finally { pending.current = false; setBusy(false); }
  };

  const importLegacy = async () => {
    if (!user || pending.current || !confirm(id
      ? `Impor catatan lokal milikmu ke akun ${user.email || user.id}? Catatan dengan tanggal yang sudah ada tidak akan ditimpa.`
      : `Import your local entries into ${user.email || user.id}? Existing dates will not be overwritten.`)) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      // Legacy entries have no owner. Import only after the user confirms the destination account.
      const legacy: unknown = JSON.parse(localStorage.getItem('diary') || '{}');
      if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) throw new Error('Invalid local diary backup. Original data preserved.');
      const candidates = Object.values(legacy) as Entry[];
      if (candidates.some(entry => !entry || typeof entry.date !== 'string' || typeof entry.text !== 'string' || typeof entry.mood !== 'string')) throw new Error('Invalid local diary backup. Original data preserved.');
      const current: { entries: Entry[]; user: DiaryUser } = await diaryRequest('GET');
      if (current.user.id !== user.id) throw new Error('Account changed. Reload before importing.');
      const saved = Object.fromEntries(current.entries.map(entry => [entry.date, entry]));
      const wasDirty = text !== (entries[date]?.text || '') || mood !== (entries[date]?.mood || 'Okay');
      let imported = 0;
      let conflicts = 0;
      for (const entry of candidates) {
        if (activeUser.current !== user.id) return;
        if (saved[entry.date]) {
          if (saved[entry.date].text !== entry.text.trim() || saved[entry.date].mood !== entry.mood) conflicts++;
          continue;
        }
        const result: Entry = await diaryRequest('PUT', { date: entry.date, text: entry.text, mood: entry.mood, userId: user.id, expectedUpdated: null });
        if (activeUser.current !== user.id) return;
        saved[result.date] = result;
        setEntries(previous => ({ ...previous, [result.date]: result }));
        imported++;
      }
      if (activeUser.current !== user.id) return;
      setEntries(saved);
      const activeEntry = saved[date];
      if (!wasDirty) {
        setText(activeEntry?.text || '');
        setMood(activeEntry?.mood || 'Okay');
        setExpectedUpdated(activeEntry?.updated ?? null);
      }
      setNotice(id ? `${imported} catatan diimpor; ${conflicts} tanggal bentrok dilewati. Catatan lokal asli tetap disimpan.` : `${imported} entries imported; ${conflicts} conflicting dates skipped. Local originals preserved.`);
      if (!conflicts) {
        setLegacyAvailable(false);
        try { localStorage.setItem(`diary-imported:${user.id}`, 'true'); } catch { /* Re-import is safe: existing dates are never overwritten. */ }
      }
    } catch (error) {
      if (activeUser.current === user.id) setError(error instanceof Error ? error.message : 'Import failed. Local originals preserved.');
    } finally { pending.current = false; setBusy(false); }
  };

  const list = Object.values(entries).sort((a,b) => b.date.localeCompare(a.date)).filter(e => !q || e.text.toLowerCase().includes(q.toLowerCase()) || e.date.includes(q));

  const formatDate = (dateStr: string) => {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) return <Shell title={t.diaryTitle} quickFab={false}><ContentSkeleton variant="diary" /></Shell>;
  if (!user) return <Shell title={t.diaryTitle} quickFab={false}><div className="notice error" role="alert">{error}</div><button className="btn" onClick={() => window.location.reload()}>{id ? 'Coba lagi' : 'Retry'}</button></Shell>;

  return (
    <Shell title={t.diaryTitle || "Diary"} quickFab={false}>
      <div style={{ display: "grid", gap: "24px", maxWidth: "800px", width: "100%", margin: "0 auto", padding: "0 min(16px, 4vw) 40px", boxSizing: "border-box" }}>
        {error && <div className="notice error" role="alert">{error}</div>}
        {notice && <div className="notice" role="status">{notice}</div>}
        {legacyAvailable && <div className="card"><p>{id ? 'Ada catatan lama di browser ini. Impor hanya jika catatan tersebut milikmu.' : 'Old entries exist in this browser. Import only if they belong to you.'}</p><button className="btn ghost" disabled={busy} onClick={importLegacy}>{id ? 'Impor catatan lokal' : 'Import local entries'}</button></div>}
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: "16px" }}>
          <div className="card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "8px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", color: "#ef4444" }}><Flame size={20} /></div>
            <div><small className="muted">{t.streak}</small><div style={{ fontWeight: 700 }}>{stats.streak} {t.days}</div></div>
          </div>
          <div className="card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "8px", background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px", color: "#3b82f6" }}><Book size={20} /></div>
            <div><small className="muted">{t.entries}</small><div style={{ fontWeight: 700 }}>{stats.count}</div></div>
          </div>
          <div className="card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "8px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", color: "#10b981" }}><Smile size={20} /></div>
            <div><small className="muted">{t.words}</small><div style={{ fontWeight: 700 }}>{stats.totalWords}</div></div>
          </div>
        </div>

        {isEditing ? (
          <div className="card" style={{ padding: "24px", border: "1px solid var(--accent)", position: "relative" }}>
            {prompt && (
              <div style={{ background: "var(--accent)0d", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", borderLeft: "4px solid var(--accent)", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <Sparkles size={16} style={{ marginTop: "2px", color: "var(--accent)" }} />
                <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "var(--text2)", fontStyle: "italic" }}>{prompt}</p>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <Calendar size={18} className="muted" />
                <input className="input" type="date" aria-label={id ? 'Tanggal catatan' : 'Entry date'} value={date} disabled={busy} onChange={e => startEdit(e.target.value)} style={{ border: "none", background: "transparent", fontSize: "16px", fontWeight: "bold", padding: 0, minWidth: 0 }} />
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button className="btn ghost" disabled={busy} onClick={() => { setText(entries[date]?.text || ''); setMood(entries[date]?.mood || 'Okay'); setIsEditing(false); setError(''); }}>{t.cancel}</button>
                <button className="btn" onClick={save} disabled={busy || !date || !text.trim()}>{busy ? (id ? 'Menyimpan...' : 'Saving...') : t.saveEntry}</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
              {moods.map(m => (
                <button key={m.label} disabled={busy} aria-pressed={mood === m.label} onClick={() => setMood(m.label)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid " + (mood === m.label ? m.color : "var(--border)"), background: mood === m.label ? m.color + "1a" : "transparent", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{m.icon}</span><span style={{ color: mood === m.label ? m.color : "var(--text2)" }}>{m.label}</span>
                </button>
              ))}
            </div>
            <textarea className="input" aria-label={t.whatHappened} value={text} disabled={busy} maxLength={100000} onChange={e => setText(e.target.value)} placeholder={t.whatHappened} rows={10} style={{ width: "100%", background: "transparent", border: "none", fontSize: "16px", lineHeight: "1.6", resize: "none", padding: 0 }} />
          </div>
        ) : (
          <button className="card" disabled={busy} onClick={() => startEdit(localDate())} style={{ padding: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", cursor: "pointer", border: "1px dashed var(--border)", background: "transparent" }}>
            <Plus size={20} /><span style={{ fontWeight: 600 }}>{t.newEntry}</span>
          </button>
        )}

        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} className="muted" />
          <input className="input" aria-label={t.searchDiary} placeholder={t.searchDiary} value={q} onChange={e => setQ(e.target.value)} style={{ width: "100%", paddingLeft: "36px" }} />
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          {list.length === 0 && <div style={{ textAlign: "center", padding: "40px", opacity: 0.5 }}>{q ? t.noSearch : t.noDiary}</div>}
          {list.map(e => {
            const m = moods.find(m => m.label === e.mood) || moods[2];
            const wordCount = e.text.trim().split(/\s+/).filter(Boolean).length;
            return (
              <div key={e.date} className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>{formatDate(e.date)}</h3>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "99px", background: m.color + "1a", color: m.color, border: "1px solid " + m.color + "33" }}>{m.icon} {m.label}</span>
                    </div>
                    <small className="muted" style={{ fontSize: "11px" }}>{wordCount} {t.wordCount} · {t.lastEdited} {new Date(e.updated).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-US', { hour: "2-digit", minute: "2-digit" })}</small>
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button className="btn ghost" disabled={busy} aria-label={`Edit ${formatDate(e.date)}`} style={{ padding: "6px" }} onClick={() => startEdit(e.date)}><Edit3 size={14} /></button>
                    <button className="btn ghost" disabled={busy} aria-label={`${id ? 'Hapus' : 'Delete'} ${formatDate(e.date)}`} style={{ padding: "6px", color: "var(--red)" }} onClick={() => void remove(e.date)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "15px", lineHeight: "1.6", color: "var(--text)" }}>{e.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

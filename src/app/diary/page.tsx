"use client";
import { useEffect, useState, useMemo } from "react";
import { Shell } from "@/components/finance/layout";
import { Calendar, Search, Trash2, Edit3, Plus, Smile, Flame, Book, Sparkles } from "lucide-react";
import { getLang, copy, type Lang, type Translation } from "@/lib/i18n";

type Entry = { date: string; text: string; mood: string; updated: string };
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
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [text, setText] = useState("");
  const [mood, setMood] = useState("Okay");
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [q, setQ] = useState("");
  const [isEditing, setIsEditing] = useState(true);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    getLang().then(l => { setLang(l); setT(copy[l]); });
    try { 
      const saved = JSON.parse(localStorage.getItem("diary") || "{}");
      setEntries(saved);
      generatePrompt(saved);
    } catch {}
  }, []);

  useEffect(() => { localStorage.setItem("diary", JSON.stringify(entries)); }, [entries]);

  const generatePrompt = (data: Record<string, Entry>) => {
    const keys = Object.keys(data).filter(k => k !== new Date().toISOString().split("T")[0]);
    if (keys.length > 0) {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const entry = data[randomKey];
      const snippet = entry.text.length > 60 ? entry.text.substring(0, 60) + "..." : entry.text;
      const prompts = lang === 'id' ? [
        `Ingat kejadian pada ${randomKey}? Kamu nulis: "${snippet}". Bagaimana pandanganmu sekarang?`,
        `Coba tengok catatan ${randomKey}. Apa ada perkembangan dari apa yang kamu rasakan saat itu?`
      ] : [
        `Remember ${randomKey}? You wrote: "${snippet}". How do you feel about it now?`,
        `Look back at ${randomKey}. Has there been progress since then?`
      ];
      setPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
    } else {
      setPrompt(lang === 'id' ? "Apa hal paling menarik yang terjadi hari ini?" : "What was the most interesting thing that happened today?");
    }
  };

  const stats = useMemo(() => {
    const list = Object.values(entries).sort((a,b) => b.date.localeCompare(a.date));
    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    let check = today;
    while (entries[check]) {
      streak++;
      const d = new Date(check);
      d.setDate(d.getDate() - 1);
      check = d.toISOString().split("T")[0];
    }
    const totalWords = list.reduce((sum, e) => sum + (e.text.trim().split(/\s+/).filter(Boolean).length || 0), 0);
    return { streak, totalWords, count: list.length };
  }, [entries]);

  const save = async () => {
    if (!text.trim()) return;
    setEntries(s => ({ ...s, [date]: { date, text: text.trim(), mood, updated: new Date().toISOString() } }));
    setIsEditing(false);

    // Sync with Daily Quest (Habits)
    try {
      const res = await fetch('/api/todos');
      if (res.ok) {
        const quests = await res.json();
        const journalTask = quests.find((task: any) => 
          task.label.toLowerCase().includes('journal') || 
          task.label.toLowerCase().includes('reflection') ||
          task.label.toLowerCase().includes('diary')
        );
        if (journalTask && !journalTask.done) {
          await fetch(`/api/todos/${journalTask.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ done: true }),
          });
        }
      }
    } catch (e) { console.error("Quest sync failed", e); }
  };

  const startEdit = (d: string) => {
    setDate(d);
    setText(entries[d]?.text || "");
    setMood(entries[d]?.mood || "Okay");
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = (d: string) => {
    if (!confirm(t.confirmDelete)) return;
    const n = { ...entries }; delete n[d]; setEntries(n);
    if (d === date) { setText(""); setIsEditing(true); }
  };

  const list = Object.values(entries).sort((a,b) => b.date.localeCompare(a.date)).filter(e => !q || e.text.toLowerCase().includes(q.toLowerCase()) || e.date.includes(q));

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <Shell title={t.diaryTitle || "Diary"} quickFab={false}>
      <div style={{ display: "grid", gap: "24px", maxWidth: "800px", margin: "0 auto", padding: "0 16px 40px" }}>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Calendar size={18} className="muted" />
                <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ border: "none", background: "transparent", fontSize: "16px", fontWeight: "bold", padding: 0 }} />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn ghost" onClick={() => { setText(""); setIsEditing(false); }}>{t.cancel}</button>
                <button className="btn" onClick={save} disabled={!text.trim()}>{t.saveEntry}</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
              {moods.map(m => (
                <button key={m.label} onClick={() => setMood(m.label)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid " + (mood === m.label ? m.color : "var(--border)"), background: mood === m.label ? m.color + "1a" : "transparent", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{m.icon}</span><span style={{ color: mood === m.label ? m.color : "var(--text2)" }}>{m.label}</span>
                </button>
              ))}
            </div>
            <textarea className="input" value={text} onChange={e => setText(e.target.value)} placeholder={t.whatHappened} rows={10} style={{ width: "100%", background: "transparent", border: "none", fontSize: "16px", lineHeight: "1.6", resize: "none", outline: "none", padding: 0 }} />
          </div>
        ) : (
          <button className="card" onClick={() => { setDate(new Date().toISOString().split("T")[0]); setText(""); setMood("Okay"); setIsEditing(true); generatePrompt(entries); }} style={{ padding: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", cursor: "pointer", border: "1px dashed var(--border)", background: "transparent" }}>
            <Plus size={20} /><span style={{ fontWeight: 600 }}>{t.newEntry}</span>
          </button>
        )}

        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} className="muted" />
          <input className="input" placeholder={t.searchDiary} value={q} onChange={e => setQ(e.target.value)} style={{ width: "100%", paddingLeft: "36px" }} />
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          {list.length === 0 && <div style={{ textAlign: "center", padding: "40px", opacity: 0.5 }}>{q ? t.noSearch : t.noDiary}</div>}
          {list.map(e => {
            const m = moods.find(m => m.label === e.mood) || moods[2];
            const wordCount = e.text.trim().split(/\s+/).filter(Boolean).length;
            return (
              <div key={e.date} className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>{formatDate(e.date)}</h3>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "99px", background: m.color + "1a", color: m.color, border: "1px solid " + m.color + "33" }}>{m.icon} {m.label}</span>
                    </div>
                    <small className="muted" style={{ fontSize: "11px" }}>{wordCount} {t.wordCount} · {t.lastEdited} {new Date(e.updated).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-US', { hour: "2-digit", minute: "2-digit" })}</small>
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button className="btn ghost" style={{ padding: "6px" }} onClick={() => startEdit(e.date)}><Edit3 size={14} /></button>
                    <button className="btn ghost" style={{ padding: "6px", color: "var(--red)" }} onClick={() => remove(e.date)}><Trash2 size={14} /></button>
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
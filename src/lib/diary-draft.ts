type Draft = { date: string; text: string; mood: string; expectedUpdated: string | null; savedAt: number };
const prefix = 'life-os-diary-draft:';
// ponytail: one active draft per account per tab; use encrypted server drafts for cross-device recovery.
export function readDiaryDraft(userId: string): Draft | null {
  const raw = sessionStorage.getItem(prefix + userId);
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || typeof d.text !== 'string' || d.text.length > 100000 || !['Bad','Meh','Okay','Good','Great'].includes(d.mood) || !(d.expectedUpdated === null || typeof d.expectedUpdated === 'string') || !Number.isFinite(d.savedAt) || Date.now() - d.savedAt > 86400000 || d.savedAt > Date.now()) throw new Error('Invalid draft');
    return d;
  } catch { sessionStorage.removeItem(prefix + userId); return null; }
}
export function writeDiaryDraft(userId: string, draft: Omit<Draft, 'savedAt'> | null) {
  if (draft) sessionStorage.setItem(prefix + userId, JSON.stringify({ ...draft, savedAt: Date.now() }));
  else sessionStorage.removeItem(prefix + userId);
}

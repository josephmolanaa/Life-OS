export type Task = { id: string; label: string; done: boolean; priority: 'LOW' | 'MEDIUM' | 'HIGH'; due_date?: string | null; due_time?: string | null; created_at?: string };
export type TaskView = 'inbox' | 'today' | 'upcoming';
export function validTaskDate(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1000-01-01') return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validTaskTime(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string') return false;
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  return !!match;
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}
export function visibleTasks(tasks: Task[], view: TaskView, today: string, start: string, completed: boolean, priority: string, search: string, sort: string, end?: string) {
  const ranks = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return tasks.filter(task => (completed || !task.done) && (priority === 'all' || task.priority === priority) && task.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
    (view === 'inbox' || (view === 'today' ? !!task.due_date && task.due_date <= today : !!task.due_date && task.due_date >= start && task.due_date <= (end || addDays(start, 6)))))
    .sort((a, b) => Number(a.done) - Number(b.done) || (sort === 'priority' ? ranks[a.priority] - ranks[b.priority] : sort === 'title' ? a.label.localeCompare(b.label) : sort === 'date' ? (a.due_date || '9999').localeCompare(b.due_date || '9999') || (a.due_time || '99:99').localeCompare(b.due_time || '99:99') : (a.due_time || '99:99').localeCompare(b.due_time || '99:99')));
}

const DAY_INDICES: Record<string, number> = {
  senin: 1, monday: 1, mon: 1,
  selasa: 2, tuesday: 2, tue: 2,
  rabu: 3, wednesday: 3, wed: 3,
  kamis: 4, thursday: 4, thu: 4,
  jumat: 5, "jum'at": 5, friday: 5, fri: 5,
  sabtu: 6, saturday: 6, sat: 6,
  minggu: 7, ahad: 7, sunday: 7, sun: 7
};

export function parseTaskDateInput(text: string, baseDate = localDate()): { label: string; dueDate: string | null; dueTime: string | null } {
  let working = text.trim();
  if (!working) return { label: '', dueDate: null, dueTime: null };

  let extractedTime: string | null = null;

  // 0. Deteksi pola waktu (jam)
  // Format 12-jam: "jam 3 sore", "jam 8 malam", "jam 7 pagi", "jam 1 siang", "at 5pm", "at 10:00 am", "5:30 pm"
  const timePeriodRegex = /\b(?:(?:jam|pukul|at)\s+)?([1-9]|1[0-2])(?::([0-5]\d))?\s*(pagi|siang|sore|malam|am|pm)\b/i;
  const timePeriodMatch = working.match(timePeriodRegex);
  if (timePeriodMatch) {
    let hours = Number(timePeriodMatch[1]);
    const minutes = timePeriodMatch[2] ? String(Number(timePeriodMatch[2])).padStart(2, '0') : '00';
    const period = timePeriodMatch[3].toLowerCase();

    if (['malam', 'pm'].includes(period) && hours < 12) hours += 12;
    else if (['malam', 'pm'].includes(period) && hours === 12) hours = 0; // jam 12 malam = tengah malam 00:00
    else if (['sore'].includes(period) && hours < 12) hours += 12;
    else if (['siang'].includes(period) && hours < 12 && hours !== 12) hours += (hours <= 3 ? 12 : 0);
    else if (['pagi', 'am'].includes(period) && hours === 12) hours = 0;

    extractedTime = `${String(hours).padStart(2, '0')}:${minutes}`;
    working = working.replace(timePeriodMatch[0], ' ');
  } else {
    // Format: "jam 14:30", "jam 14.30", "pukul 15:00", "at 14:00"
    const timeExactRegex = /\b(?:jam|pukul|at)\s+([01]?\d|2[0-3])[:.]([0-5]\d)\b/i;
    const timeExactMatch = working.match(timeExactRegex);
    if (timeExactMatch) {
      const hours = String(Number(timeExactMatch[1])).padStart(2, '0');
      const minutes = String(Number(timeExactMatch[2])).padStart(2, '0');
      extractedTime = `${hours}:${minutes}`;
      working = working.replace(timeExactMatch[0], ' ');
    } else {
      // Format 24-jam langsung: "14:30" atau "20.15"
      const direct24Regex = /\b([01]\d|2[0-3])[:.]([0-5]\d)\b/;
      const direct24Match = working.match(direct24Regex);
      if (direct24Match) {
        extractedTime = `${direct24Match[1]}:${direct24Match[2]}`;
        working = working.replace(direct24Match[0], ' ');
      }
    }
  }

  working = working.replace(/\s{2,}/g, ' ').trim();

  const base = new Date(`${baseDate}T12:00:00`);
  const currentDay = base.getDay() === 0 ? 7 : base.getDay(); // 1=Mon, 7=Sun

  // 1. Hari ini / today / nanti / later
  const todayRegex = /\b(?:hari\s+ini|today|nanti(?:\s+(?:siang|sore|malam))?|later)\b/i;
  if (todayRegex.test(working)) {
    return {
      label: working.replace(todayRegex, '').replace(/\b(?:di|pada|on)\s*$/i, '').replace(/\b(?:di|pada|on)\s+/i, '').replace(/\s{2,}/g, ' ').trim(),
      dueDate: baseDate,
      dueTime: extractedTime
    };
  }

  // 2. Lusa / day after tomorrow
  const lusaRegex = /\b(?:lusa|day\s+after\s+tomorrow)\b/i;
  if (lusaRegex.test(working)) {
    return {
      label: working.replace(lusaRegex, '').replace(/\b(?:di|pada|on)\s*$/i, '').replace(/\b(?:di|pada|on)\s+/i, '').replace(/\s{2,}/g, ' ').trim(),
      dueDate: addDays(baseDate, 2),
      dueTime: extractedTime
    };
  }

  // 3. Besok / tomorrow
  const besokRegex = /\b(?:besok|tomorrow)\b/i;
  if (besokRegex.test(working)) {
    return {
      label: working.replace(besokRegex, '').replace(/\b(?:di|pada|on)\s*$/i, '').replace(/\b(?:di|pada|on)\s+/i, '').replace(/\s{2,}/g, ' ').trim(),
      dueDate: addDays(baseDate, 1),
      dueTime: extractedTime
    };
  }

  // 4. [hari] depan / next [day]
  const nextDayRegex = /\b(?:next\s+(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|ahad|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|ahad|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+depan)\b/i;
  const nextMatch = working.match(nextDayRegex);
  if (nextMatch) {
    const rawDay = (nextMatch[1] || nextMatch[2]).toLowerCase();
    const targetIdx = DAY_INDICES[rawDay];
    if (targetIdx !== undefined) {
      let diff = targetIdx - currentDay;
      if (diff <= 0) diff += 7;
      diff += 7; // minggu berikutnya
      return {
        label: working.replace(nextMatch[0], '').replace(/\b(?:di|pada|on)\s*$/i, '').replace(/\b(?:di|pada|on)\s+/i, '').replace(/\s{2,}/g, ' ').trim(),
        dueDate: addDays(baseDate, diff),
        dueTime: extractedTime
      };
    }
  }

  // 5. Nama hari biasa: "di hari jumat", "pada jumat", "hari jumat", "jumat"
  const dayRegex = /\b(?:(?:di|pada)\s+)?(?:hari\s+)?(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|ahad|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
  const dayMatch = working.match(dayRegex);
  if (dayMatch) {
    const rawDay = dayMatch[1].toLowerCase();
    const targetIdx = DAY_INDICES[rawDay];
    if (targetIdx !== undefined) {
      let diff = targetIdx - currentDay;
      if (diff <= 0) diff += 7; // hari terdekat mendatang
      return {
        label: working.replace(dayMatch[0], '').replace(/\b(?:di|pada|on)\s*$/i, '').replace(/\b(?:di|pada|on)\s+/i, '').replace(/\s{2,}/g, ' ').trim(),
        dueDate: addDays(baseDate, diff),
        dueTime: extractedTime
      };
    }
  }

  // 6. Jika hanya ada jam tanpa tanggal, default-kan tanggal ke hari ini (baseDate)
  if (extractedTime) {
    return {
      label: working.replace(/\b(?:di|pada|on)\s*$/i, '').trim(),
      dueDate: baseDate,
      dueTime: extractedTime
    };
  }

  return { label: working.replace(/\b(?:di|pada|on)\s*$/i, '').trim(), dueDate: null, dueTime: null };
}



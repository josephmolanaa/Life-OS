// What the idle island shows in its center: the desktop clock or a countdown to a user-chosen moment.
// Stored in localStorage: the settings page and the Duckies window share the 127.0.0.1 origin, so the
// `storage` event syncs them live without an Electron round trip.
export type DuckiesDisplay = { mode: 'clock' | 'countdown'; target: string };
export const duckiesDisplayKey = 'lifeos-duckies-display';
export const defaultDuckiesDisplay: DuckiesDisplay = { mode: 'countdown', target: '2030-03-18T00:00' };

export function readDuckiesDisplay(raw: string | null): DuckiesDisplay {
  try {
    const value = JSON.parse(raw || '{}');
    const mode = value.mode === 'clock' || value.mode === 'countdown' ? value.mode : defaultDuckiesDisplay.mode;
    const target = typeof value.target === 'string' && !Number.isNaN(new Date(value.target).getTime()) ? value.target : defaultDuckiesDisplay.target;
    return { mode, target };
  } catch { return defaultDuckiesDisplay; }
}

const addMonths = (date: Date, months: number) => { const next = new Date(date); next.setMonth(next.getMonth() + months); return next; };

// Calendar-accurate years/months/days/hours left. ponytail: month overflow on the 29th–31st follows Date's rollover.
export function countdownParts(target: Date, now: Date) {
  if (target.getTime() <= now.getTime()) return { years: 0, months: 0, days: 0, hours: 0 };
  let total = (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth();
  let anchor = addMonths(now, total);
  if (anchor > target) anchor = addMonths(now, --total);
  const rest = target.getTime() - anchor.getTime();
  return { years: Math.floor(total / 12), months: total % 12, days: Math.floor(rest / 864e5), hours: Math.floor((rest % 864e5) / 36e5) };
}

export function formatCountdown(target: Date, now: Date) {
  const { years, months, days, hours } = countdownParts(target, now);
  return `${years}y ${months}m ${days}d ${hours}h`;
}

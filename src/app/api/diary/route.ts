import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MOODS = new Set(['Bad', 'Meh', 'Okay', 'Good', 'Great']);
const MAX_TEXT_LENGTH = 100_000;

type DiaryRow = { date: string; text: string; mood: string; updated_at: string };

function entry(row: DiaryRow) {
  return { date: row.date, text: row.text, mood: row.mood, updated: row.updated_at };
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}

function databaseError(error: { code?: string }, action: string) {
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return NextResponse.json({ error: 'Diary database is not ready. Apply the diary migration first.' }, { status: 503 });
  }
  if (error.code === '23505') return conflict();
  return NextResponse.json({ error: `Could not ${action} diary entry` }, { status: 500 });
}

function conflict() {
  return NextResponse.json({ error: 'This entry changed. Reload before saving or deleting.' }, { status: 409 });
}

async function body(request: Request) {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) };
    }
    return { value: value as Record<string, unknown> };
  } catch {
    return { error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) };
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('diary_entries')
    .select('date,text,mood,updated_at')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) return databaseError(error, 'load');
  return NextResponse.json({ entries: (data as DiaryRow[] || []).map(entry), user: { id: user.id, email: user.email ?? null } });
}

export async function PUT(request: Request) {
  const parsed = await body(request);
  if ('error' in parsed) return parsed.error;

  const { date, text, mood, userId, expectedUpdated } = parsed.value;
  if (!validDate(date) || typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH || typeof mood !== 'string' || !MOODS.has(mood) || typeof userId !== 'string' || (expectedUpdated !== null && !validTimestamp(expectedUpdated))) {
    return NextResponse.json({ error: 'Invalid diary entry' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (userId !== user.id) return NextResponse.json({ error: 'Account changed. Reload before saving.' }, { status: 403 });

  const updatedAt = Math.max(Date.now(), expectedUpdated === null ? 0 : Date.parse(expectedUpdated) + 1);
  const payload = { text: text.trim(), mood, updated_at: new Date(updatedAt).toISOString() };
  const query = expectedUpdated === null
    ? supabase.from('diary_entries').insert({ ...payload, user_id: user.id, date })
    : supabase.from('diary_entries').update(payload).eq('user_id', user.id).eq('date', date).eq('updated_at', expectedUpdated);
  const { data, error } = await query
    .select('date,text,mood,updated_at')
    .maybeSingle();

  if (error) return databaseError(error, 'save');
  if (!data) return conflict();
  return NextResponse.json(entry(data as DiaryRow));
}

export async function DELETE(request: Request) {
  const parsed = await body(request);
  if ('error' in parsed) return parsed.error;
  const { date, userId, expectedUpdated } = parsed.value;
  if (!validDate(date) || typeof userId !== 'string' || !validTimestamp(expectedUpdated)) return NextResponse.json({ error: 'Invalid diary entry date or version' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (userId !== user.id) return NextResponse.json({ error: 'Account changed. Reload before deleting.' }, { status: 403 });

  const { data, error } = await supabase
    .from('diary_entries')
    .delete()
    .eq('user_id', user.id)
    .eq('date', date)
    .eq('updated_at', expectedUpdated)
    .select('date')
    .maybeSingle();

  if (error) return databaseError(error, 'delete');
  if (!data) return conflict();
  return NextResponse.json({ success: true });
}

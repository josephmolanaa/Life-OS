import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('discipline_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const scores = ['total', 'physique', 'habits', 'social', 'career'] as const;
  if (!body || typeof body !== 'object' || Array.isArray(body) || scores.some((key) => typeof body[key] !== 'number' || !Number.isFinite(body[key]) || (body[key] as number) < 0 || (body[key] as number) > 100)) {
    return NextResponse.json({ error: 'Scores must be numbers between 0 and 100' }, { status: 400 });
  }
  const date = typeof body.date === 'string' ? body.date : null;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  if (body.timeZone !== undefined && typeof body.timeZone !== 'string') return NextResponse.json({ error: 'Invalid time zone' }, { status: 400 });
  const timeZone = body.timeZone as string | undefined ?? 'UTC';
  let today: string;
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const part = (name: string) => parts.find(value => value.type === name)?.value;
    today = `${part('year')}-${part('month')}-${part('day')}`;
  } catch { return NextResponse.json({ error: 'Invalid time zone' }, { status: 400 }); }
  const storedDate = date ?? today;
  const parsed = new Date(`${storedDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== storedDate || storedDate !== today) {
    return NextResponse.json({ error: 'Date must be today' }, { status: 400 });
  }

  const { error } = await supabase.from('discipline_logs').upsert({
    user_id: user.id,
    date: storedDate,
    total_score: body.total as number,
    physique_score: body.physique as number,
    habits_score: body.habits as number,
    social_score: body.social as number,
    career_score: body.career as number
  }, { onConflict: 'user_id,date' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

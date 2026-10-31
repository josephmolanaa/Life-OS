import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('study_schedule')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { code, course, day, sessions, time, room, lecturer, semester = 'Semester 7' } = body as {
    code?: unknown; course?: unknown; day?: unknown; sessions?: unknown;
    time?: unknown; room?: unknown; lecturer?: unknown; semester?: unknown;
  };

  if (typeof code !== 'string' || !code.trim() || code.trim().length > 20) return NextResponse.json({ error: 'Code must be 1–20 characters' }, { status: 400 });
  if (typeof course !== 'string' || !course.trim() || course.trim().length > 120) return NextResponse.json({ error: 'Course must be 1–120 characters' }, { status: 400 });
  if (typeof day !== 'string' || !day.trim()) return NextResponse.json({ error: 'Day is required' }, { status: 400 });
  if (sessions !== undefined && typeof sessions !== 'string') return NextResponse.json({ error: 'Sessions must be a string' }, { status: 400 });
  if (time !== undefined && typeof time !== 'string') return NextResponse.json({ error: 'Time must be a string' }, { status: 400 });
  if (room !== undefined && typeof room !== 'string') return NextResponse.json({ error: 'Room must be a string' }, { status: 400 });
  if (lecturer !== undefined && typeof lecturer !== 'string') return NextResponse.json({ error: 'Lecturer must be a string' }, { status: 400 });
  if (typeof semester !== 'string' || !semester.trim()) return NextResponse.json({ error: 'Semester is required' }, { status: 400 });

  const { data, error } = await supabase.from('study_schedule').insert({
    user_id: user.id,
    code: code.trim(),
    course: course.trim(),
    day: day.trim(),
    sessions: sessions?.trim() || null,
    time: time?.trim() || null,
    room: room?.trim() || null,
    lecturer: lecturer?.trim() || null,
    semester: semester.trim()
  }).select().single();

  if (error?.code === '23505') return NextResponse.json({ error: 'A schedule with this code already exists' }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
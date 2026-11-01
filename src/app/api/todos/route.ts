import { NextResponse } from 'next/server';
import { validTaskDate, validTaskTime, validTimeRange, parseTodoRow, encodeTimeMetadata } from '@/lib/todoist';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  if (params.get('capabilities') === 'true') {
    const [dateRes, timeRes] = await Promise.all([
      supabase.from('todos').select('due_date').eq('user_id', user.id).limit(1),
      supabase.from('todos').select('due_time').eq('user_id', user.id).limit(1)
    ]);
    if (dateRes.error && !['42703', 'PGRST204'].includes(dateRes.error.code)) return NextResponse.json({ error: dateRes.error.message }, { status: 500 });
    return NextResponse.json({ dueDate: !dateRes.error, dueTime: !timeRes.error, timeRange: true });
  }
  const kind = params.get('kind') || 'daily';
  const timeZone = params.get('timeZone') || 'UTC';
  let calendar: Intl.DateTimeFormat;
  try { calendar = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { return NextResponse.json({ error: 'Invalid time zone' }, { status: 400 }); }
  if (!['daily', 'task'].includes(kind)) return NextResponse.json({ error: 'Invalid list kind' }, { status: 400 });
  const { data, error } = await supabase.from('todos').select('*').eq('user_id', user.id).eq('list_kind', kind).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (kind === 'task') return NextResponse.json((data || []).map(parseTodoRow));

  // ponytail: updated_at tracks completion changes; add completion history before streaks.
  const today = calendar.format(new Date());
  const stale = (data || []).filter(todo => todo.done && calendar.format(new Date(todo.updated_at || todo.created_at)) !== today);
  try {
    await Promise.all(stale.map(async todo => {
      const query = supabase.from('todos').update({ done: false }).eq('id', todo.id).eq('user_id', user.id).eq('done', true);
      const { error: updateError } = await (todo.updated_at == null ? query.is('updated_at', null) : query.eq('updated_at', todo.updated_at));
      if (updateError) throw updateError;
    }));
  } catch { return NextResponse.json({ error: 'Unable to reset daily quests' }, { status: 500 }); }
  if (!stale.length) return NextResponse.json((data || []).map(parseTodoRow));
  // Read again: a concurrent completion must survive rollover and appear in this response.
  const { data: updatedData, error: reloadError } = await supabase.from('todos').select('*').eq('user_id', user.id).eq('list_kind', kind).order('created_at', { ascending: false });
  if (reloadError) return NextResponse.json({ error: 'Unable to reload daily quests' }, { status: 500 });

  return NextResponse.json((updatedData || []).map(parseTodoRow));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const { label, priority, list_kind = 'daily', done = false } = body as { label?: unknown; priority?: unknown; list_kind?: unknown; done?: unknown };
  if (!['daily', 'task'].includes(list_kind as string) || typeof done !== 'boolean') return NextResponse.json({ error: 'Invalid todo' }, { status: 400 });
  if (typeof label !== 'string' || !label.trim() || label.trim().length > 120) return NextResponse.json({ error: 'Label must be 1–120 characters' }, { status: 400 });
  if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH'].includes(priority as string)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });

  const due = (body as { due_date?: unknown }).due_date;
  if (due !== undefined && (list_kind !== 'task' || !validTaskDate(due))) return NextResponse.json({ error: 'Invalid task due date' }, { status: 400 });
  const time = (body as { due_time?: unknown }).due_time;
  if (time !== undefined && (list_kind !== 'task' || !validTaskTime(time))) return NextResponse.json({ error: 'Invalid task due time' }, { status: 400 });
  const startTime = (body as { start_time?: unknown }).start_time;
  const endTime = (body as { end_time?: unknown }).end_time;
  if (startTime !== undefined || endTime !== undefined) {
    if (list_kind !== 'task') return NextResponse.json({ error: 'Time range only for tasks' }, { status: 400 });
    if (!validTimeRange(startTime, endTime)) return NextResponse.json({ error: 'Invalid time range: start must be before end' }, { status: 400 });
  }

  const insertPayload = {
    user_id: user.id,
    label: label.trim(),
    done,
    list_kind,
    priority: priority ?? 'MEDIUM',
    ...(due !== undefined ? { due_date: due } : {}),
    ...(time !== undefined ? { due_time: time } : {}),
    ...(startTime !== undefined ? { start_time: startTime } : {}),
    ...(endTime !== undefined ? { end_time: endTime } : {})
  };

  let { data, error } = await supabase.from('todos').insert(insertPayload).select().single();

  // Graceful fallback if start_time or end_time columns are missing from Supabase schema
  if (error && (['42703', 'PGRST204'].includes(error.code) || /start_time|end_time/i.test(error.message))) {
    const fallbackPayload = {
      user_id: user.id,
      label: encodeTimeMetadata(label.trim(), startTime, endTime),
      done,
      list_kind,
      priority: priority ?? 'MEDIUM',
      ...(due !== undefined ? { due_date: due } : {}),
      ...(time !== undefined ? { due_time: time } : {})
    };
    const fallbackRes = await supabase.from('todos').insert(fallbackPayload).select().single();
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error?.code === '23505') return NextResponse.json({ error: 'A todo with this label already exists' }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(parseTodoRow(data), { status: 201 });
}

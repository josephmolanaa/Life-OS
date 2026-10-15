import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: metrics } = await supabase.from('physique_metrics').select('*').eq('user_id', user.id).single();
  const { data: weights } = await supabase.from('physique_weight_logs').select('*').eq('user_id', user.id).order('recorded_at', { ascending: false });
  const { data: checklists } = await supabase.from('physique_checklists').select('*').eq('user_id', user.id).order('created_at', { ascending: true });

  return NextResponse.json({
    metrics: metrics || { start_weight: 40, target_weight: 70 },
    weights: weights || [],
    checklists: checklists || []
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const { type, action } = body;
  if (typeof type !== 'string' || !['metrics', 'weight', 'checklist'].includes(type) || (type !== 'metrics' && (typeof action !== 'string' || !['add', 'toggle', 'delete'].includes(action)))) {
    return NextResponse.json({ error: 'Invalid type or action' }, { status: 400 });
  }
  if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const data = body.data as Record<string, unknown>;

  if (type === 'metrics') {
    if (![data.start_weight, data.target_weight].every((v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 500)) {
      return NextResponse.json({ error: 'Weights must be numbers between 0 and 500' }, { status: 400 });
    }
    const { error } = await supabase.from('physique_metrics').upsert({
      user_id: user.id,
      start_weight: data.start_weight,
      target_weight: data.target_weight,
      updated_at: new Date().toISOString()
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (type === 'weight') {
    if (action === 'add') {
      if (typeof data.weight !== 'number' || !Number.isFinite(data.weight) || data.weight < 0 || data.weight > 500) return NextResponse.json({ error: 'Invalid weight' }, { status: 400 });
      const { error } = await supabase.from('physique_weight_logs').insert({
        user_id: user.id,
        weight: data.weight,
        recorded_at: new Date().toISOString()
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (type === 'checklist') {
    if (action === 'add') {
      if (typeof data.type !== 'string' || data.type.length > 40 || typeof data.label !== 'string' || data.label.length === 0 || data.label.length > 200 || (data.time_target !== undefined && (typeof data.time_target !== 'string' || data.time_target.length > 20))) return NextResponse.json({ error: 'Invalid checklist fields' }, { status: 400 });
      const { error } = await supabase.from('physique_checklists').insert({
        user_id: user.id,
        type: data.type,
        label: data.label,
        time_target: data.time_target,
        is_completed: false
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (action === 'toggle') {
      if (typeof data.id !== 'string' || typeof data.is_completed !== 'boolean') return NextResponse.json({ error: 'Invalid checklist toggle' }, { status: 400 });
      const { error } = await supabase.from('physique_checklists').update({
        is_completed: data.is_completed
      }).eq('id', data.id).eq('user_id', user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (action === 'delete') {
      if (typeof data.id !== 'string') return NextResponse.json({ error: 'Invalid checklist id' }, { status: 400 });
      const { error } = await supabase.from('physique_checklists').delete().eq('id', data.id).eq('user_id', user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

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

  const body = await request.json();
  const { type, action, data } = body;

  if (type === 'metrics') {
    const { error } = await supabase.from('physique_metrics').upsert({
      user_id: user.id,
      start_weight: data.start_weight,
      target_weight: data.target_weight,
      updated_at: new Date().toISOString()
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (type === 'weight') {
    if (action === 'add') {
      const { error } = await supabase.from('physique_weight_logs').insert({
        user_id: user.id,
        weight: data.weight,
        recorded_at: new Date().toISOString()
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (type === 'checklist') {
    if (action === 'add') {
      const { error } = await supabase.from('physique_checklists').insert({
        user_id: user.id,
        type: data.type,
        label: data.label,
        time_target: data.time_target,
        is_completed: false
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (action === 'toggle') {
      const { error } = await supabase.from('physique_checklists').update({
        is_completed: data.is_completed
      }).eq('id', data.id).eq('user_id', user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (action === 'delete') {
      const { error } = await supabase.from('physique_checklists').delete().eq('id', data.id).eq('user_id', user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

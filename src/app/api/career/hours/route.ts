import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSkillHoursSummary } from '@/lib/career-hours';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        error: 'Unauthorized',
        summary: [],
      }, { status: 401 });
    }

    const { data: skills, error: skillsError } = await supabase
      .from('career_skills')
      .select('*')
      .eq('user_id', user.id);

    if (skillsError) throw skillsError;

    const summary = await getSkillHoursSummary(supabase, user.id, skills || []);

    return NextResponse.json({ summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message, summary: [] }, { status: 500 });
  }
}

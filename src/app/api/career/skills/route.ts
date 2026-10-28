import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CareerBranch } from '@/lib/career-types';

const DEFAULT_SKILLS: Array<{ name: string; slug: string; branch: CareerBranch; target_hours: number }> = [
  // AI Engineer
  { name: 'Python', slug: 'python', branch: 'ai_engineer', target_hours: 200 },
  { name: 'Machine Learning Fundamentals', slug: 'machine_learning', branch: 'ai_engineer', target_hours: 250 },
  { name: 'Deep Learning & Neural Networks', slug: 'deep_learning', branch: 'ai_engineer', target_hours: 300 },
  { name: 'NLP & Transformers', slug: 'nlp', branch: 'ai_engineer', target_hours: 200 },
  { name: 'MLOps & Production', slug: 'mlops', branch: 'ai_engineer', target_hours: 150 },
  { name: 'API Development (FastAPI)', slug: 'api_development', branch: 'ai_engineer', target_hours: 100 },
  { name: 'Database (SQL + NoSQL)', slug: 'database', branch: 'ai_engineer', target_hours: 80 },
  { name: 'Git & Version Control', slug: 'git_version_control', branch: 'ai_engineer', target_hours: 60 },
  { name: 'Cloud Basics (AWS/GCP/Azure)', slug: 'cloud_basics', branch: 'ai_engineer', target_hours: 120 },
  // Economics
  { name: 'Fundamental Analysis', slug: 'fundamental_analysis', branch: 'economics', target_hours: 200 },
  { name: 'Technical Analysis', slug: 'technical_analysis', branch: 'economics', target_hours: 200 },
  { name: 'Portfolio Management', slug: 'portfolio_management', branch: 'economics', target_hours: 150 },
  { name: 'Risk Management', slug: 'risk_management', branch: 'economics', target_hours: 100 },
  { name: 'Crypto Specific', slug: 'crypto_specific', branch: 'economics', target_hours: 150 },
  { name: 'Macro Literacy', slug: 'macro_literacy', branch: 'economics', target_hours: 100 },
  // Soft Skills
  { name: 'Problem Decomposition', slug: 'problem_decomposition', branch: 'soft_skills', target_hours: 80 },
  { name: 'Self-Directed Learning', slug: 'self_directed_learning', branch: 'soft_skills', target_hours: 100 },
  { name: 'Documentation & Writing', slug: 'documentation', branch: 'soft_skills', target_hours: 80 },
  { name: 'Time Estimation', slug: 'time_estimation', branch: 'soft_skills', target_hours: 60 },
];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json([]);

    const { data, error } = await supabase
      .from('career_skills')
      .select('*')
      .eq('user_id', user.id)
      .order('branch', { ascending: true })
      .order('name', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = DEFAULT_SKILLS.map((skill) => ({
      user_id: user.id,
      ...skill,
      status: 'want_to_learn',
    }));

    const { data, error } = await supabase
      .from('career_skills')
      .upsert(rows, { onConflict: 'user_id,slug' })
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

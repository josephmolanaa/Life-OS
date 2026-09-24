import type { SupabaseClient } from '@supabase/supabase-js';
import type { CareerSkill, SkillHoursSummary } from './career-types';

const SKILL_APP_MAPPING: Record<string, string> = {
  'vscode': 'python',
  'visual studio code': 'python',
  'pytorch': 'deep_learning',
  'tensorflow': 'deep_learning',
  'jupyter': 'machine_learning',
  'cursor': 'ai_engineering',
  'github': 'git_version_control',
  'fastapi': 'api_development',
  'postgresql': 'database',
  'aws': 'cloud_basics',
  'gcp': 'cloud_basics',
  'azure': 'cloud_basics',
  'notion': 'documentation',
  'tradingview': 'technical_analysis',
  'bloomberg': 'fundamental_analysis',
  'coinmarketcap': 'crypto_specific',
  'coingecko': 'crypto_specific',
  'excel': 'portfolio_management',
  'google sheets': 'portfolio_management',
  'obsidian': 'documentation',
  'slack': 'communication',
  'discord': 'communication',
  'zoom': 'communication',
};

const SKILL_TODO_MAPPING: Record<string, string> = {
  'belajar ai': 'machine_learning',
  'belajar python': 'python',
  'pytorch': 'deep_learning',
  'tensorflow': 'deep_learning',
  'github streak': 'git_version_control',
  'push github': 'git_version_control',
  'baca buku': 'self_directed_learning',
  'journal': 'documentation',
  'reflection': 'documentation',
};

function normalizeAppName(app: string): string {
  return app.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeWindowTitle(title: string): string {
  return title.toLowerCase();
}

function getSkillSlugFromApp(app: string, window: string): string | null {
  const normApp = normalizeAppName(app);
  const normWindow = normalizeWindowTitle(window);

  for (const [key, slug] of Object.entries(SKILL_APP_MAPPING)) {
    if (normApp.includes(normalizeAppName(key))) return slug;
  }
  for (const [key, slug] of Object.entries(SKILL_APP_MAPPING)) {
    if (normWindow.includes(key.toLowerCase())) return slug;
  }

  return null;
}

function getSkillSlugFromTodo(label: string): string | null {
  const normLabel = label.toLowerCase();
  for (const [key, slug] of Object.entries(SKILL_TODO_MAPPING)) {
    if (normLabel.includes(key.toLowerCase())) return slug;
  }
  return null;
}

export async function getSkillHoursSummary(
  supabase: SupabaseClient,
  userId: string,
  skills: CareerSkill[],
): Promise<SkillHoursSummary[]> {
  const result: SkillHoursSummary[] = [];

  const { data: cacheData, error: cacheError } = await supabase
    .from('activity_events_cache')
    .select('app, window, duration_seconds, event_timestamp')
    .eq('user_id', userId)
    .gte('event_timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('event_timestamp', { ascending: false });

  const skillMinutes: Record<string, { total: number; today: number; thisWeek: number }> = {};

  if (cacheData && !cacheError) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const event of cacheData) {
      const slug = getSkillSlugFromApp(event.app, event.window);
      if (!slug) continue;

      const minutes = Math.round(event.duration_seconds / 60);
      const eventDate = new Date(event.event_timestamp);

      if (!skillMinutes[slug]) {
        skillMinutes[slug] = { total: 0, today: 0, thisWeek: 0 };
      }

      skillMinutes[slug].total += minutes;

      if (eventDate >= todayStart) {
        skillMinutes[slug].today += minutes;
      }
      if (eventDate >= weekStart) {
        skillMinutes[slug].thisWeek += minutes;
      }
    }
  }

  const { data: todos, error: todosError } = await supabase
    .from('todos')
    .select('label, done, updated_at')
    .eq('user_id', userId)
    .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (todos && !todosError) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const todo of todos) {
      const slug = getSkillSlugFromTodo(todo.label);
      if (!slug) continue;

      const minutes = todo.done ? 60 : 0;
      const todoDate = new Date(todo.updated_at);

      if (!skillMinutes[slug]) {
        skillMinutes[slug] = { total: 0, today: 0, thisWeek: 0 };
      }

      skillMinutes[slug].total += minutes;

      if (todoDate >= todayStart) {
        skillMinutes[slug].today += minutes;
      }
      if (todoDate >= weekStart) {
        skillMinutes[slug].thisWeek += minutes;
      }
    }
  }

  for (const skill of skills) {
    const minutes = skillMinutes[skill.slug] || { total: 0, today: 0, thisWeek: 0 };
    const loggedHours = skill.logged_hours + (minutes.total / 60);
    const progressPct = Math.min(100, Math.round((loggedHours / skill.target_hours) * 100));

    result.push({
      skillSlug: skill.slug,
      skillName: skill.name,
      branch: skill.branch,
      targetHours: skill.target_hours,
      loggedHours: Math.round(loggedHours * 100) / 100,
      todayHours: Math.round(minutes.today / 60 * 100) / 100,
      thisWeekHours: Math.round(minutes.thisWeek / 60 * 100) / 100,
      progressPct,
    });
  }

  return result;
}

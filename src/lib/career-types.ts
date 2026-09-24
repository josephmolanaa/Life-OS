export type CareerBranch = 'ai_engineer' | 'economics' | 'soft_skills';

export type CareerGoal = {
  id: string;
  user_id: string;
  title: string;
  branch: CareerBranch;
  target_date: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_pct: number;
  created_at: string;
  updated_at: string;
};

export type CareerSkill = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  branch: CareerBranch;
  target_hours: number;
  logged_hours: number;
  status: 'want_to_learn' | 'learning' | 'mastered';
  created_at: string;
};

export type CareerProject = {
  id: string;
  user_id: string;
  title: string;
  branch: CareerBranch;
  repo_url: string | null;
  status: 'idea' | 'building' | 'launched';
  created_at: string;
};

export type SkillHoursSummary = {
  skillSlug: string;
  skillName: string;
  branch: CareerBranch;
  targetHours: number;
  loggedHours: number;
  todayHours: number;
  thisWeekHours: number;
  progressPct: number;
};

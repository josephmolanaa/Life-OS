import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

export type WeightLog = {
  id: string;
  user_id: string;
  date: string;
  weight: number;
  height?: number;
};

export type ExerciseLog = {
  id: string;
  user_id: string;
  date: string;
  name: string;
  duration: number;
  calories: number;
};

export async function getWeightLogs(): Promise<WeightLog[]> {
  const supabase = await createClient() as SupabaseClient<any, "public", any>;
  const { data, error } = await supabase
    .from('physique_weight')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getExerciseLogs(): Promise<ExerciseLog[]> {
  const supabase = await createClient() as SupabaseClient<any, "public", any>;
  const { data, error } = await supabase
    .from('physique_exercise')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

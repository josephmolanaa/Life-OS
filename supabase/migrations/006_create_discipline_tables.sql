-- Daily Discipline Logs
CREATE TABLE IF NOT EXISTS discipline_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    total_score NUMERIC NOT NULL,
    physique_score NUMERIC,
    habits_score NUMERIC,
    social_score NUMERIC,
    career_score NUMERIC,
    UNIQUE(user_id, date)
);

ALTER TABLE discipline_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own discipline logs" ON discipline_logs
    FOR ALL USING (auth.uid() = user_id);

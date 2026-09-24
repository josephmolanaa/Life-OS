-- Physique Weight Logs
CREATE TABLE IF NOT EXISTS physique_weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    weight NUMERIC NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Physique Metrics / Goals
CREATE TABLE IF NOT EXISTS physique_metrics (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    start_weight NUMERIC,
    target_weight NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Physique Checklists (Meals & Exercises)
CREATE TABLE IF NOT EXISTS physique_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'meal' or 'exercise'
    label TEXT NOT NULL,
    time_target TEXT, -- e.g. '08:00'
    is_completed BOOLEAN DEFAULT FALSE,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE physique_weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE physique_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE physique_checklists ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own weight logs" ON physique_weight_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own metrics" ON physique_metrics
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own checklists" ON physique_checklists
    FOR ALL USING (auth.uid() = user_id);

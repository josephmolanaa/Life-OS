BEGIN;

CREATE TABLE IF NOT EXISTS public.diary_entries (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    text TEXT NOT NULL CHECK (char_length(text) <= 100000 AND btrim(text) <> ''),
    mood TEXT NOT NULL CHECK (mood IN ('Bad', 'Meh', 'Okay', 'Good', 'Great')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, date)
);

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own diary entries" ON public.diary_entries;
CREATE POLICY "Users can manage their own diary entries"
    ON public.diary_entries
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.diary_entries FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diary_entries TO authenticated;

COMMIT;

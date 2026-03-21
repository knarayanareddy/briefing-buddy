-- Table for user-defined watchlist rules per profile and module
CREATE TABLE IF NOT EXISTS public.watch_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  profile_id UUID NOT NULL REFERENCES briefing_profiles(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  rule JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookup during assembly
CREATE INDEX IF NOT EXISTS watch_rules_profile_idx ON public.watch_rules(profile_id);

-- RLS
ALTER TABLE public.watch_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own rules" ON public.watch_rules
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

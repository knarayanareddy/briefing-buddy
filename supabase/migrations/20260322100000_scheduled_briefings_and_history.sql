-- Phase 1 - Make database match the generate-script contract + add History metadata

-- 1. ALTER TABLE public.briefing_scripts
ALTER TABLE public.briefing_scripts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.briefing_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trigger text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS title text;

CREATE INDEX IF NOT EXISTS idx_briefing_scripts_user_id_created_at
  ON public.briefing_scripts (user_id, created_at desc);

CREATE INDEX IF NOT EXISTS idx_briefing_scripts_user_profile_created_at
  ON public.briefing_scripts (user_id, profile_id, created_at desc);

-- 2. Create table public.briefing_runs
CREATE TABLE IF NOT EXISTS public.briefing_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.briefing_profiles(id) ON DELETE CASCADE,
  frequency text NOT NULL,
  trigger text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','complete','failed','skipped')),
  script_id uuid REFERENCES public.briefing_scripts(id) ON DELETE SET NULL,
  render_job_id uuid REFERENCES public.render_jobs(id) ON DELETE SET NULL,
  error text,
  UNIQUE(profile_id, scheduled_for)
);

-- RLS
ALTER TABLE public.briefing_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own runs"
  ON public.briefing_runs FOR SELECT
  USING (auth.uid() = user_id);

-- Explicitly drop the policy before creating, although we don't have to if this is first run.
-- Keep direct modifications out of client hands (service role only)

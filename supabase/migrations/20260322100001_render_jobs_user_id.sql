-- Phase 0 - Schema Correctness for Render Jobs

-- 1. Add user_id to render_jobs
ALTER TABLE public.render_jobs
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create index for fast lookups by user (History tab)
CREATE INDEX IF NOT EXISTS idx_render_jobs_user_id_created
  ON public.render_jobs (user_id, created_at DESC);

-- 3. Backfill existing render_jobs from briefing_scripts
UPDATE public.render_jobs
SET user_id = briefing_scripts.user_id
FROM public.briefing_scripts
WHERE render_jobs.script_id = briefing_scripts.id
  AND render_jobs.user_id IS NULL;

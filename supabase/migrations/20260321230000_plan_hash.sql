-- Add plan_hash column to briefing_scripts for caching
ALTER TABLE public.briefing_scripts 
ADD COLUMN IF NOT EXISTS plan_hash TEXT;

-- Index for efficient lookup of cached plans
CREATE INDEX IF NOT EXISTS briefing_scripts_user_plan_hash_idx 
ON public.briefing_scripts(user_id, plan_hash);

-- Phase 1 - Briefing Shares Table for Public Links

CREATE TABLE IF NOT EXISTS public.briefing_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  script_id uuid NOT NULL REFERENCES public.briefing_scripts(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.render_jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  scope text NOT NULL DEFAULT 'render' CHECK (scope IN ('script', 'render', 'script_and_render')),
  allow_transcript boolean NOT NULL DEFAULT true,
  allow_action_cards boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_briefing_shares_user_created 
  ON public.briefing_shares (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_briefing_shares_script_id
  ON public.briefing_shares (script_id);

CREATE INDEX IF NOT EXISTS idx_briefing_shares_expires
  ON public.briefing_shares (expires_at);

-- Row Level Security
ALTER TABLE public.briefing_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own shares
CREATE POLICY "Users can view own shares" 
  ON public.briefing_shares FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own shares
CREATE POLICY "Users can insert own shares" 
  ON public.briefing_shares FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own shares (for revocation)
CREATE POLICY "Users can update own shares" 
  ON public.briefing_shares FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Explicitly NO public/anonymous policy.
-- Public access is strictly mediated by Edge Functions using service role keys.

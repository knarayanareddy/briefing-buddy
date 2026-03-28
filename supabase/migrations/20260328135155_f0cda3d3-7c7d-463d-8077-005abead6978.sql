
-- Phase 1: Create actions table for approve->execute lifecycle

CREATE TABLE public.actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_script_id uuid NULL REFERENCES public.briefing_scripts(id) ON DELETE SET NULL,
  segment_id text NULL,
  provider text NOT NULL,
  action_type text NOT NULL,
  status text NOT NULL DEFAULT 'proposed'
    CONSTRAINT actions_status_check CHECK (status IN ('proposed','approved','executing','completed','failed','canceled')),
  idempotency_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_source_ids text[] NOT NULL DEFAULT '{}'::text[],
  provider_result jsonb NULL,
  error_code text NULL,
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT actions_user_idempotency_key UNIQUE (user_id, idempotency_key)
);

-- Indexes for common query patterns
CREATE INDEX idx_actions_user_created ON public.actions (user_id, created_at DESC);
CREATE INDEX idx_actions_user_status ON public.actions (user_id, status);

-- Enable RLS
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own actions
CREATE POLICY "Users can select own actions"
  ON public.actions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own actions"
  ON public.actions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own actions"
  ON public.actions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own actions"
  ON public.actions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

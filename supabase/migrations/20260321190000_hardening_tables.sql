-- Milestone 5F: Hardening for "Almost Production"

-- 1. briefing_usage_limits: Track daily API usage per user
CREATE TABLE IF NOT EXISTS briefing_usage_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT CURRENT_DATE,
  generate_count int NOT NULL DEFAULT 0,
  render_count int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

-- RLS: Authenticated users can read their own limits
ALTER TABLE briefing_usage_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own usage limits"
  ON briefing_usage_limits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2. audit_events: Log non-sensitive system events
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- generate_script, start_render, sync_news, sync_github, sync_gmail, set_connector_secret
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- RLS: Audit events are service-role/admin only for insert/view, but let's allow users to see their own for transparency.
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own audit events"
  ON audit_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_events_user_created ON audit_events(user_id, created_at DESC);

-- 3. reading_list: Store news items for later reading
CREATE TABLE IF NOT EXISTS reading_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: Authenticated users own their reading list
ALTER TABLE reading_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own reading list"
  ON reading_list FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Unique constraint to prevent duplicate saves of the same item for the same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_list_user_source ON reading_list(user_id, source_id);

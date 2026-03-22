
-- User settings
CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY,
  display_name text,
  avatar_url text,
  timezone text NOT NULL DEFAULT 'UTC',
  location_text text,
  location_lat double precision,
  location_lon double precision,
  notification_prefs jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Briefing profiles
CREATE TABLE public.briefing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  persona text,
  timezone text,
  frequency text NOT NULL DEFAULT 'manual',
  enabled_modules text[] NOT NULL DEFAULT '{}',
  module_settings jsonb NOT NULL DEFAULT '{}',
  module_catalog_version int DEFAULT 1,
  last_triggered_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.briefing_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own profiles" ON public.briefing_profiles FOR ALL USING (auth.uid() = user_id);

-- Briefing scripts
CREATE TABLE public.briefing_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id uuid,
  script_json jsonb NOT NULL DEFAULT '{}',
  persona text,
  trigger text NOT NULL DEFAULT 'manual',
  scheduled_for timestamptz,
  title text,
  archived boolean NOT NULL DEFAULT false,
  plan_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.briefing_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own scripts" ON public.briefing_scripts FOR SELECT USING (auth.uid() = user_id);

-- Render jobs
CREATE TABLE public.render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.briefing_scripts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  segments jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own jobs" ON public.render_jobs FOR SELECT USING (auth.uid() = user_id);

-- Rendered segments
CREATE TABLE public.rendered_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.render_jobs(id) ON DELETE CASCADE,
  segment_id int NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  avatar_video_url text,
  b_roll_image_url text,
  ui_action_card jsonb,
  dialogue text,
  grounding_source_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rendered_segments ENABLE ROW LEVEL SECURITY;

-- Rendered asset cache
CREATE TABLE public.rendered_asset_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key text NOT NULL UNIQUE,
  asset_url text NOT NULL,
  provider text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rendered_asset_cache ENABLE ROW LEVEL SECURITY;

-- Briefing artifacts
CREATE TABLE public.briefing_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.briefing_scripts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  artifact_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.briefing_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own artifacts" ON public.briefing_artifacts FOR SELECT USING (auth.uid() = user_id);

-- Briefing shares
CREATE TABLE public.briefing_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.briefing_scripts(id) ON DELETE CASCADE,
  job_id uuid,
  user_id uuid NOT NULL,
  token text,
  scope text DEFAULT 'full',
  revoked boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.briefing_shares ENABLE ROW LEVEL SECURITY;

-- Briefing runs
CREATE TABLE public.briefing_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'running',
  script_id uuid,
  job_id uuid,
  completed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.briefing_runs ENABLE ROW LEVEL SECURITY;

-- Briefing usage limits
CREATE TABLE public.briefing_usage_limits (
  user_id uuid NOT NULL,
  day date NOT NULL DEFAULT CURRENT_DATE,
  generate_count int NOT NULL DEFAULT 0,
  render_count int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.briefing_usage_limits ENABLE ROW LEVEL SECURITY;

-- Briefing user state
CREATE TABLE public.briefing_user_state (
  user_id uuid PRIMARY KEY,
  latest_script_id uuid,
  latest_job_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.briefing_user_state ENABLE ROW LEVEL SECURITY;

-- Briefing module state
CREATE TABLE public.briefing_module_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id text NOT NULL,
  last_seen_at timestamptz,
  UNIQUE (user_id, module_id)
);
ALTER TABLE public.briefing_module_state ENABLE ROW LEVEL SECURITY;

-- Connector configs
CREATE TABLE public.connector_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
ALTER TABLE public.connector_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own connector configs" ON public.connector_configs FOR SELECT USING (auth.uid() = user_id);

-- Connector connections
CREATE TABLE public.connector_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'connected',
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
ALTER TABLE public.connector_connections ENABLE ROW LEVEL SECURITY;

-- Connector secrets
CREATE TABLE public.connector_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  encrypted_payload text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
ALTER TABLE public.connector_secrets ENABLE ROW LEVEL SECURITY;

-- Connector health
CREATE TABLE public.connector_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  connected boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'missing',
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error_code text,
  last_error_message text,
  consecutive_failures int NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  cooldown_until timestamptz,
  items_synced_last_run int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
ALTER TABLE public.connector_health ENABLE ROW LEVEL SECURITY;

-- Connector sync runs
CREATE TABLE public.connector_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  outcome text,
  items_found int DEFAULT 0,
  items_upserted int DEFAULT 0,
  error_code text,
  error_message text,
  meta jsonb DEFAULT '{}',
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.connector_sync_runs ENABLE ROW LEVEL SECURITY;

-- Synced items
CREATE TABLE public.synced_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  source_id text NOT NULL,
  title text,
  summary text,
  url text,
  payload jsonb DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, source_id)
);
ALTER TABLE public.synced_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own synced items" ON public.synced_items FOR SELECT USING (auth.uid() = user_id);

-- RSS feed state
CREATE TABLE public.rss_feed_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feed_url text NOT NULL,
  last_etag text,
  last_modified text,
  last_fetched_at timestamptz,
  UNIQUE (user_id, feed_url)
);
ALTER TABLE public.rss_feed_state ENABLE ROW LEVEL SECURITY;

-- Watch rules
CREATE TABLE public.watch_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.briefing_profiles(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  rule jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.watch_rules ENABLE ROW LEVEL SECURITY;

-- Reading list
CREATE TABLE public.reading_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_id text NOT NULL,
  title text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_id)
);
ALTER TABLE public.reading_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own reading list" ON public.reading_list FOR ALL USING (auth.uid() = user_id);

-- Audit events
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own audit events" ON public.audit_events FOR SELECT USING (auth.uid() = user_id);

-- User sessions
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text NOT NULL,
  user_agent text,
  device_label text,
  ip text,
  location_text text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own sessions" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);

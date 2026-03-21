CREATE TABLE IF NOT EXISTS briefing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  persona text NULL,
  timezone text NULL,
  enabled_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  module_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for scalable profile retrieval
CREATE INDEX IF NOT EXISTS idx_briefing_profiles_user_updated 
  ON briefing_profiles(user_id, updated_at DESC);

-- Granular Module Tracking
CREATE TABLE IF NOT EXISTS briefing_module_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  last_seen_at timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, module_id)
);

-- RLS Enforcement
ALTER TABLE briefing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_module_state ENABLE ROW LEVEL SECURITY;

-- briefing_profiles: Allow Authenticated Users Full CRUD on own records
CREATE POLICY "Users can fully manage their own profiles"
  ON briefing_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- briefing_module_state: Read-only for Authenticated; Service Role handles Writes globally
CREATE POLICY "Users can only read their own module states"
  ON briefing_module_state FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Edge Function / Service role operations automatically bypass RLS completely.

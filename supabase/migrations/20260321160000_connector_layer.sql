-- Connector Connections: Stores user-provider links
CREATE TABLE IF NOT EXISTS connector_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL, -- e.g., 'rss', 'github', 'google'
  status text NOT NULL DEFAULT 'active', -- 'active' | 'revoked' | 'error'
  metadata jsonb DEFAULT '{}', -- Store non-sensitive provider-specific config (e.g., selected repos)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Connector Configs: Stores provider-specific configuration (e.g., RSS feed lists)
CREATE TABLE IF NOT EXISTS connector_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  config jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Synced Items: Normalized event store for ingested items
CREATE TABLE IF NOT EXISTS synced_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'rss' | 'github' | 'google'
  item_type text NOT NULL, -- 'news' | 'email' | 'github_pr'
  external_id text NOT NULL, -- RSS guid/link hash, github node_id
  source_id text NOT NULL, -- Stable ID used in user_data grounding (e.g., 'news_123')
  occurred_at timestamptz NOT NULL, -- Published / Received time
  title text,
  author text,
  url text,
  summary text, -- Sanitized + truncated excerpt
  payload jsonb NOT NULL DEFAULT '{}', -- Sanitized structured fields
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider, item_type, external_id)
);

-- Index for efficient data assembly
CREATE INDEX IF NOT EXISTS idx_synced_items_user_retrieval 
ON synced_items (user_id, item_type, occurred_at DESC);

-- Briefing User State: Tracks 'last_briefed_at' for delta briefings
CREATE TABLE IF NOT EXISTS briefing_user_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_briefed_at timestamptz,
  last_news_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS LOCKDOWN
ALTER TABLE connector_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_user_state ENABLE ROW LEVEL SECURITY;

-- 1. No direct client access to items or state (Edge Functions only)
-- We rely on Service Role for sync and assembly.

-- 2. Allow Authenticated users to manage their own connector_configs (for UI setup)
CREATE POLICY "Users can manage their own connector_configs" 
ON connector_configs 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own connector_connections" 
ON connector_connections 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

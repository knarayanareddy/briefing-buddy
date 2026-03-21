-- 1. connector_health
CREATE TABLE IF NOT EXISTS connector_health (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider text NOT NULL,
    status text NOT NULL DEFAULT 'missing', -- active|missing|error|revoked
    connected boolean NOT NULL DEFAULT false,
    last_attempt_at timestamptz NULL,
    last_success_at timestamptz NULL,
    last_error_code text NULL,
    last_error_message text NULL, -- sanitized + truncated to <= 300 chars
    consecutive_failures int NOT NULL DEFAULT 0,
    next_retry_at timestamptz NULL,
    cooldown_until timestamptz NULL,
    items_synced_last_run int NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, provider)
);

-- 2. connector_sync_runs
CREATE TABLE IF NOT EXISTS connector_sync_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz NULL,
    outcome text NOT NULL DEFAULT 'running', -- running|success|partial|failed|skipped
    items_found int NOT NULL DEFAULT 0,
    items_upserted int NOT NULL DEFAULT 0,
    error_code text NULL,
    error_message text NULL, -- sanitized + truncated
    meta jsonb NOT NULL DEFAULT '{}'::jsonb, -- non-sensitive metrics only
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_runs_user_provider_started ON connector_sync_runs (user_id, provider, started_at DESC);

-- RLS
ALTER TABLE connector_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_sync_runs ENABLE ROW LEVEL SECURITY;

-- connector_health: allow authenticated user to SELECT their own rows (read only)
CREATE POLICY "Users can view their own connector health" 
ON connector_health FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- connector_sync_runs: allow authenticated user to SELECT their own rows (read only)
CREATE POLICY "Users can view their own sync runs" 
ON connector_sync_runs FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- All writes via Edge Functions (Service Role) are allowed by default as RLS doesn't block Service Role bypass.

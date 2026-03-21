-- Table for caching rendered assets (avatar videos, b-roll images)
CREATE TABLE IF NOT EXISTS public.rendered_asset_cache (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  asset_key TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('avatar_video', 'b_roll_image')),
  provider TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, asset_key, asset_type)
);

-- Index for garbage collection/TTL
CREATE INDEX IF NOT EXISTS rendered_asset_cache_last_used_idx ON public.rendered_asset_cache(last_used_at);

-- RLS: Only accessible via service role (Edge Functions)
ALTER TABLE public.rendered_asset_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.rendered_asset_cache
  USING (auth.role() = 'service_role');

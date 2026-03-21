-- RSS Feed State for Conditional GET (ETag/Last-Modified)
CREATE TABLE IF NOT EXISTS public.rss_feed_state (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feed_url TEXT NOT NULL,
    etag TEXT,
    last_modified TEXT,
    last_fetch_at TIMESTAMPTZ DEFAULT NOW(),
    last_success_at TIMESTAMPTZ,
    consecutive_failures INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, feed_url)
);

-- RLS Policies
ALTER TABLE public.rss_feed_state ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access on rss_feed_state" ON public.rss_feed_state
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Users can read their own feed state
CREATE POLICY "Users can view their own rss_feed_state" ON public.rss_feed_state
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rss_feed_state_user_id ON public.rss_feed_state(user_id);

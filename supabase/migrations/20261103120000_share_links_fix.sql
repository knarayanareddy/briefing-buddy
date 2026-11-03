-- Share links: align briefing_shares schema with the edge-function code.
-- The functions get-shared-briefing / list-share-links / revoke-share-link
-- reference revoked_at, view_count, last_viewed_at and increment_share_view,
-- none of which existed before this migration — every share fetch failed.

ALTER TABLE public.briefing_shares
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS include_transcript boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_action_cards boolean NOT NULL DEFAULT false;

-- Backfill revocations from the legacy boolean column, then drop it.
UPDATE public.briefing_shares
SET revoked_at = created_at
WHERE revoked = true AND revoked_at IS NULL;

ALTER TABLE public.briefing_shares DROP COLUMN IF EXISTS revoked;

-- Atomic view counter: only counts views of live (unrevoked, unexpired) shares.
CREATE OR REPLACE FUNCTION public.increment_share_view(share_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.briefing_shares
  SET view_count = view_count + 1,
      last_viewed_at = now()
  WHERE id = share_id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());
$$;

REVOKE ALL ON FUNCTION public.increment_share_view(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_share_view(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.increment_share_view(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_share_view(uuid) TO service_role;

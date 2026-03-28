-- Create a private table for cron secrets (no RLS grants to anon/authenticated)
CREATE TABLE IF NOT EXISTS public.cron_secrets (
  key text PRIMARY KEY,
  value text NOT NULL
);

-- Revoke all access from public roles
REVOKE ALL ON public.cron_secrets FROM anon, authenticated;

-- Only postgres (cron context) and service_role can read
GRANT SELECT ON public.cron_secrets TO service_role;

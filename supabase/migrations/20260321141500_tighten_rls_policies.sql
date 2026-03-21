-- Tighten RLS policies for Executive Briefing app
-- Edge Functions use service role; tables locked down for AppSec.

-- DROP wide-open policies
DROP POLICY IF EXISTS "Allow all access to briefing_scripts" ON public.briefing_scripts;
DROP POLICY IF EXISTS "Allow all access to render_jobs" ON public.render_jobs;
DROP POLICY IF EXISTS "Allow all access to rendered_segments" ON public.rendered_segments;

-- Ensure RLS is still enabled (it was enabled in previous migration, but being explicit)
ALTER TABLE public.briefing_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rendered_segments ENABLE ROW LEVEL SECURITY;

-- No public read/write policies added.
-- Only service role (bypassing RLS) can access these tables.
-- If read-only access for authenticated users is needed for debugging, it can be added here.
-- For now, we follow 'Strict Zero-Trust' and keep them completely locked to the API.

COMMENT ON TABLE public.briefing_scripts IS 'Edge Functions use service role; tables locked down for AppSec.';
COMMENT ON TABLE public.render_jobs IS 'Edge Functions use service role; tables locked down for AppSec.';
COMMENT ON TABLE public.rendered_segments IS 'Edge Functions use service role; tables locked down for AppSec.';

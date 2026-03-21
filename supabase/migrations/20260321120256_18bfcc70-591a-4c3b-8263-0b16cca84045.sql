
-- Create briefing_scripts table
CREATE TABLE public.briefing_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  persona TEXT,
  script_json JSONB
);

-- Create render_jobs table
CREATE TABLE public.render_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  script_id UUID NOT NULL REFERENCES public.briefing_scripts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'rendering', 'complete', 'failed')),
  error TEXT
);

-- Create rendered_segments table
CREATE TABLE public.rendered_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.render_jobs(id) ON DELETE CASCADE,
  segment_id INT NOT NULL,
  dialogue TEXT,
  grounding_source_id TEXT,
  ui_action_card JSONB,
  avatar_video_url TEXT,
  b_roll_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'rendering', 'complete', 'failed')),
  error TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.briefing_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rendered_segments ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for hackathon demo (no auth required)
CREATE POLICY "Allow all access to briefing_scripts" ON public.briefing_scripts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to render_jobs" ON public.render_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to rendered_segments" ON public.rendered_segments FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_render_jobs_script_id ON public.render_jobs(script_id);
CREATE INDEX idx_rendered_segments_job_id ON public.rendered_segments(job_id);

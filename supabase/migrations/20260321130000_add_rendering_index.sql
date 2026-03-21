-- Create composite index for optimized segment updates
CREATE INDEX IF NOT EXISTS idx_rendered_segments_job_segment ON public.rendered_segments(job_id, segment_id);

ALTER TABLE render_jobs ADD COLUMN locked_at timestamptz DEFAULT NULL;
ALTER TABLE render_jobs ADD COLUMN locked_by text DEFAULT NULL;
ALTER TABLE render_jobs ADD COLUMN heartbeat_at timestamptz DEFAULT NULL;

CREATE INDEX idx_render_jobs_locked_at ON render_jobs(locked_at);

CREATE OR REPLACE FUNCTION acquire_job_lock(p_job_id uuid, p_request_id text, p_stale_interval interval)
RETURNS boolean AS $$
DECLARE
  v_updated bigint;
BEGIN
  UPDATE render_jobs
  SET locked_at = now(),
      locked_by = p_request_id,
      heartbeat_at = now()
  WHERE id = p_job_id
    AND (locked_at IS NULL OR locked_at < now() - p_stale_interval);
    
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

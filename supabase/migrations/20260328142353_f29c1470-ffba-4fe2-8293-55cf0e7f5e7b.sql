
-- Deep Dive Runs: stores agentic deep-dive/verify results with tool traces
CREATE TABLE public.deep_dive_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  script_id UUID REFERENCES public.briefing_scripts(id),
  segment_id INTEGER,
  evidence_source_ids TEXT[] NOT NULL DEFAULT '{}',
  run_type TEXT NOT NULL DEFAULT 'deep_dive', -- 'deep_dive' or 'verify'
  question TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  output_summary TEXT,
  citations JSONB NOT NULL DEFAULT '[]', -- [{url, title, snippet}]
  tool_trace JSONB NOT NULL DEFAULT '[]', -- [{step, tool, input_summary, output_summary, duration_ms}]
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deep_dive_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own deep dive runs"
  ON public.deep_dive_runs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deep dive runs"
  ON public.deep_dive_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_deep_dive_runs_user ON public.deep_dive_runs (user_id, created_at DESC);

-- TTS Audio Cache: keyed by text hash + voice for dedup
CREATE TABLE public.tts_audio_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  voice_id TEXT NOT NULL DEFAULT 'JBFqnCBsd6RMkjVDRZzb',
  text_hash TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'mp3',
  storage_path TEXT NOT NULL,
  duration_seconds REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, voice_id, text_hash, format)
);

ALTER TABLE public.tts_audio_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tts cache"
  ON public.tts_audio_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tts cache"
  ON public.tts_audio_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

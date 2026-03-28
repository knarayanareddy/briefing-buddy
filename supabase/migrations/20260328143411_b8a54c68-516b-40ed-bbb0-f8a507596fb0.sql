-- Allow authenticated users to read their own TTS audio files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own tts audio' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can read own tts audio"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'tts-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- Enable pg_net extension for scheduled sync
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

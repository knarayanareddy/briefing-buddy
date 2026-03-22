# Scheduled Briefings via pg_cron

To execute the `scheduled-briefings` Edge Function automatically on a schedule, we rely on Supabase's `pg_cron` and `pg_net` extensions alongside Supabase Vault for secure credential storage.

## Installation Steps

Run the following SQL in your Supabase SQL Editor to configure the cron job. Be sure to replace `<project-ref>` and `<INTERNAL_API_KEY>` with your actual project values.

```sql
-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- 2. Store Secrets Securely in Vault
-- Replace <project-ref> with your actual Supabase project reference
SELECT vault.create_secret(
  'https://<project-ref>.supabase.co',
  'project_url',
  'Base URL for the Supabase project Edge Functions'
);

-- Replace <INTERNAL_API_KEY> with your environment's matching x-internal-api-key
SELECT vault.create_secret(
  '<INTERNAL_API_KEY>',
  'internal_api_key',
  'Internal API Key for authenticating scheduled edge functions'
);

-- 3. Schedule the Cron Job
-- Runs every minute. The Edge Function logic determines if a profile is actually due.
SELECT cron.schedule(
  'scheduled-briefings-every-minute',
  '* * * * *',
  $$
  WITH 
    url AS (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1),
    key AS (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_api_key' LIMIT 1)
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM url) || '/functions/v1/scheduled-briefings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-api-key', (SELECT decrypted_secret FROM key)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Un-scheduling
If you ever need to stop the cron job, you can remove it using the job name:
```sql
SELECT cron.unschedule('scheduled-briefings-every-minute');
```

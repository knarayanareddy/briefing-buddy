-- Add frequency column to briefing_profiles to support scheduled briefings
-- Supported values: 'manual', 'daily', 'twice_daily', 'hourly'
ALTER TABLE briefing_profiles 
ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'manual';

-- Also add a last_triggered_at to help with scheduling logic if needed in the future
ALTER TABLE briefing_profiles 
ADD COLUMN IF NOT EXISTS last_triggered_at timestamptz;

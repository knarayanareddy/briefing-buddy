-- Migration: Add module_catalog_version to briefing_profiles
ALTER TABLE briefing_profiles ADD COLUMN IF NOT EXISTS module_catalog_version int NOT NULL DEFAULT 1;

-- Update RLS to ensure new column is visible/writable
-- (Existing policies usually cover all columns, but good to keep in mind)

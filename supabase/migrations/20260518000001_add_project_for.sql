-- Add project_for field to lead_requests
-- Tracks whether the design request is for a residential or business/workplace kitchen.
ALTER TABLE lead_requests
  ADD COLUMN IF NOT EXISTS project_for TEXT NOT NULL DEFAULT 'myself';

ALTER TABLE lead_requests
  DROP CONSTRAINT IF EXISTS lead_requests_project_for_check;

ALTER TABLE lead_requests
  ADD CONSTRAINT lead_requests_project_for_check
  CHECK (project_for IN ('myself', 'business'));

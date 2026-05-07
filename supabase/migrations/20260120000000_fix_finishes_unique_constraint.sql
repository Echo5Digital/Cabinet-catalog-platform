-- Fix finishes unique constraint to be per (tenant, catalog_line, code)
-- instead of per (tenant, code) — allows same finish code across different catalog lines
-- e.g. American and Euro can both have "white-shaker"

-- Drop the old global constraint
ALTER TABLE finishes DROP CONSTRAINT IF EXISTS finishes_tenant_id_code_key;

-- Add new constraint scoped to catalog line
ALTER TABLE finishes ADD CONSTRAINT finishes_tenant_id_catalog_line_id_code_key
  UNIQUE (tenant_id, catalog_line_id, code);

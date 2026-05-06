-- ============================================================
-- ai_settings
-- Stores OpenAI API credentials per tenant.
-- Managed from the Admin Panel > Branding & Settings page.
-- One row per tenant (enforced by UNIQUE on tenant_id).
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_settings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  openai_api_key text        NOT NULL,
  openai_model   text        NOT NULL DEFAULT 'gpt-4o-mini',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION _set_ai_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_settings_updated_at ON ai_settings;
CREATE TRIGGER ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW EXECUTE FUNCTION _set_ai_settings_updated_at();

-- RLS: enable but block direct anon/authenticated access.
-- All reads/writes go through the service-role admin client in API routes.
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- No public policies — only the service role (createAdminClient) can access.

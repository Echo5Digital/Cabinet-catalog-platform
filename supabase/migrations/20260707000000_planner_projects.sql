-- Planner projects: save/load kitchen planner sessions
-- Uses session_token for unauthenticated (public) project ownership.
-- Authenticated admin/tenant users are identified via auth.uid().

CREATE TABLE IF NOT EXISTS planner_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_token   TEXT,                    -- public user ownership token (from localStorage)
  name            TEXT NOT NULL DEFAULT 'My Kitchen',
  layout          TEXT,
  cabinet_style   TEXT,
  room_dimensions JSONB,                   -- { width, length, height }
  scene           JSONB,                   -- { items, zones }
  settings        JSONB,                   -- { viewMode, planLayer, upperCabinetColor, lowerCabinetColor }
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_project_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES planner_projects(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  scene       JSONB NOT NULL,
  settings    JSONB,
  label       TEXT,                        -- optional snapshot label e.g. "After L-Shape change"
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient per-tenant + per-token queries
CREATE INDEX IF NOT EXISTS planner_projects_tenant_idx        ON planner_projects(tenant_id);
CREATE INDEX IF NOT EXISTS planner_projects_session_token_idx ON planner_projects(session_token);
CREATE INDEX IF NOT EXISTS planner_project_versions_project_idx ON planner_project_versions(project_id);

-- ── Row Level Security ──────────────────────────────────────────────────────────

ALTER TABLE planner_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_project_versions ENABLE ROW LEVEL SECURITY;

-- Projects: readable/writable by owner token OR by tenant members
CREATE POLICY "planner_projects_owner"
  ON planner_projects
  USING (
    session_token = current_setting('app.session_token', true)
    OR tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Versions: accessible if the parent project is accessible
CREATE POLICY "planner_project_versions_owner"
  ON planner_project_versions
  USING (
    project_id IN (
      SELECT id FROM planner_projects
      WHERE session_token = current_setting('app.session_token', true)
         OR tenant_id IN (
           SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
         )
    )
  );

-- Auto-update updated_at on project changes
CREATE OR REPLACE FUNCTION update_planner_project_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planner_projects_updated_at ON planner_projects;
CREATE TRIGGER planner_projects_updated_at
  BEFORE UPDATE ON planner_projects
  FOR EACH ROW EXECUTE FUNCTION update_planner_project_updated_at();

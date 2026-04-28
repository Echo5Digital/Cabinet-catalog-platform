-- ============================================================
-- Colors & Structures — Part 2 of 2
-- Run AFTER 20260428_colors_structures.sql has been committed
-- ============================================================

-- colors table (Countertop / Floor categories)
CREATE TABLE IF NOT EXISTS colors (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  code        text NOT NULL,           -- filename key: "white-quartz"
  color_type  text NOT NULL DEFAULT 'countertop', -- 'countertop' | 'floor'
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_colors_tenant      ON colors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_colors_tenant_type ON colors(tenant_id, color_type);

-- structures table
CREATE TABLE IF NOT EXISTS structures (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  code        text NOT NULL,           -- filename key: "shaker-door"
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_structures_tenant ON structures(tenant_id);

-- Extend assets table with new FK + parsed columns
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS color_id              uuid REFERENCES colors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS structure_id          uuid REFERENCES structures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parsed_color_code     text,
  ADD COLUMN IF NOT EXISTS parsed_structure_code text;

CREATE INDEX IF NOT EXISTS idx_assets_color_id     ON assets(color_id)     WHERE color_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_structure_id ON assets(structure_id) WHERE structure_id IS NOT NULL;

-- CHECK constraints (new enum values are now committed, safe to use)
ALTER TABLE assets
  ADD CONSTRAINT chk_color_swatch_needs_color
    CHECK (status != 'confirmed' OR asset_type != 'color_swatch' OR color_id IS NOT NULL),
  ADD CONSTRAINT chk_structure_image_needs_structure
    CHECK (status != 'confirmed' OR asset_type != 'structure_image' OR structure_id IS NOT NULL);

-- RLS — colors
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colors_tenant_read" ON colors
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "colors_tenant_write" ON colors
  FOR ALL USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- RLS — structures
ALTER TABLE structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "structures_tenant_read" ON structures
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "structures_tenant_write" ON structures
  FOR ALL USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

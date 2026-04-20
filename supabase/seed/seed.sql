-- ================================================================
-- Seed v2: Cabinet & Remodeling Depot
-- Run AFTER 002_full_schema.sql
-- ================================================================

-- ── Tenant ────────────────────────────────────────────────────
insert into tenants (id, name, slug, primary_color, accent_color, contact_email, status, settings)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Cabinet & Remodeling Depot',
  'cabinet-depot',
  '#2C3E50',
  '#3B82F6',
  'info@cabinetdepot.com',
  'active',
  '{ "ai_enabled": false, "max_users": 5 }'
)
on conflict (id) do nothing;

-- ── Manufacturer ──────────────────────────────────────────────
insert into manufacturers (id, tenant_id, name, slug, country_of_origin, is_active)
values (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'American Cabinetry Co.',
  'american-cabinetry',
  'USA',
  true
)
on conflict (id) do nothing;

-- ── Catalog Lines ─────────────────────────────────────────────
insert into catalog_lines (id, tenant_id, manufacturer_id, name, slug, description, status, sort_order)
values
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'American Collection',
    'american',
    'Traditional American-style cabinetry with classic proportions and durable construction.',
    'draft',
    1
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'Euro Collection',
    'euro',
    'Contemporary European-style frameless cabinetry with clean lines and modern hardware.',
    'draft',
    2
  )
on conflict (id) do nothing;

-- ── Categories ────────────────────────────────────────────────
insert into categories (id, tenant_id, name, slug, sort_order)
values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Base',      'base',      1),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Wall',      'wall',      2),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Tall',      'tall',      3),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Specialty', 'specialty', 4),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Vanity',    'vanity',    5),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Drawer',    'drawer',    6),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Corner',    'corner',    7)
on conflict (id) do nothing;

-- ── Finishes: American Collection ─────────────────────────────
insert into finishes (tenant_id, catalog_line_id, name, code, finish_family, sort_order, is_active)
values
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'White Shaker',  'white-shaker',  'painted', 1, true),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Gray Shaker',   'gray-shaker',   'painted', 2, true),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Espresso',      'espresso',      'stained', 3, true),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Natural Maple', 'natural-maple', 'stained', 4, true)
on conflict (tenant_id, code) do nothing;

-- ── Finishes: Euro Collection ─────────────────────────────────
insert into finishes (tenant_id, catalog_line_id, name, code, finish_family, sort_order, is_active)
values
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Matte White',     'matte-white',     'painted',    1, true),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Matte Black',     'matte-black',     'painted',    2, true),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'High Gloss Gray', 'high-gloss-gray', 'thermofoil', 3, true),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Walnut Veneer',   'walnut-veneer',   'stained',    4, true)
on conflict (tenant_id, code) do nothing;

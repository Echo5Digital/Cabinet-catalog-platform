-- ================================================================
-- Seed v2: Cabinet & Remodeling Depot
-- Run AFTER schema.sql
-- Idempotent: all inserts use ON CONFLICT DO NOTHING
-- ================================================================

-- ── Tenant ────────────────────────────────────────────────────
insert into tenants (id, name, slug, primary_color, accent_color, contact_email, contact_phone, website_url, status, settings)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Cabinet & Remodeling Depot',
  'cabinet-depot',
  '#2C3E50',
  '#3B82F6',
  'sales@cabinetdepot.com',
  '(555) 867-5309',
  'https://cabinetdepot.com',
  'active',
  '{ "ai_enabled": true, "max_users": 5 }'
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
    'Traditional American-style framed cabinetry with classic proportions, solid wood face frames, and durable dovetail drawer boxes. Available in painted and stained finishes.',
    'draft',
    1
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'Euro Collection',
    'euro',
    'Contemporary European-style frameless cabinetry with full-access interiors, clean flat-front profiles, and concealed European hinges. Available in matte and high-gloss finishes.',
    'draft',
    2
  )
on conflict (id) do nothing;

-- ── Categories ────────────────────────────────────────────────
insert into categories (id, tenant_id, name, slug, description, sort_order)
values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Base',      'base',      'Standard base cabinets, 34.5" tall, 24" deep', 1),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Wall',      'wall',      'Wall-mounted cabinets, 12" deep', 2),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Tall',      'tall',      'Pantry and utility cabinets, 84"–96" tall', 3),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Specialty', 'specialty', 'Corner solutions, blind corners, and specialty configurations', 4),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Vanity',    'vanity',    'Bathroom vanity base cabinets', 5),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Drawer',    'drawer',    'All-drawer base cabinets', 6),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Corner',    'corner',    'Corner base and wall cabinets', 7)
on conflict (id) do nothing;

-- ── Finishes: American Collection ─────────────────────────────
-- Use explicit IDs so product_finish_map can reference them
insert into finishes (id, tenant_id, catalog_line_id, name, code, finish_family, sort_order, is_active)
values
  ('f0000000-0000-0000-0001-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'White Shaker',  'white-shaker',  'painted', 1, true),
  ('f0000000-0000-0000-0001-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Gray Shaker',   'gray-shaker',   'painted', 2, true),
  ('f0000000-0000-0000-0001-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Espresso',      'espresso',      'stained', 3, true),
  ('f0000000-0000-0000-0001-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Natural Maple', 'natural-maple', 'stained', 4, true)
on conflict (id) do nothing;

-- ── Finishes: Euro Collection ─────────────────────────────────
insert into finishes (id, tenant_id, catalog_line_id, name, code, finish_family, sort_order, is_active)
values
  ('f0000000-0000-0000-0002-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Matte White',     'matte-white',     'painted',    1, true),
  ('f0000000-0000-0000-0002-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Matte Black',     'matte-black',     'painted',    2, true),
  ('f0000000-0000-0000-0002-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'High Gloss Gray', 'high-gloss-gray', 'thermofoil', 3, true),
  ('f0000000-0000-0000-0002-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Walnut Veneer',   'walnut-veneer',   'stained',    4, true)
on conflict (id) do nothing;

-- ================================================================
-- PRODUCTS: American Collection
-- Standard framed construction. Face frame: 1.5" stile, 1.5" rail.
-- All base cabinets: 34.5" tall, 24" deep
-- All wall cabinets: 12" deep
-- All tall cabinets: 24" deep
-- ================================================================

-- ── American: Base Cabinets ───────────────────────────────────
insert into products (id, tenant_id, catalog_line_id, category_id, sku, name, description,
  width_in, height_in, depth_in, box_width_in, box_height_in, box_depth_in,
  door_count, drawer_count, is_active, sort_order)
values
  ('e0000000-0000-0000-0001-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'B09', 'Base Cabinet 9"',
   'Narrow base cabinet with 1 door and 1 adjustable shelf. Ideal for filling small gaps or housing spice pull-outs.',
   9, 34.5, 24, 7.5, 33, 23, 1, 0, true, 10),

  ('e0000000-0000-0000-0001-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'B12', 'Base Cabinet 12"',
   'Compact base cabinet with 1 door and 1 adjustable shelf.',
   12, 34.5, 24, 10.5, 33, 23, 1, 0, true, 20),

  ('e0000000-0000-0000-0001-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'B15', 'Base Cabinet 15"',
   '15" base cabinet with 1 door and 1 adjustable shelf.',
   15, 34.5, 24, 13.5, 33, 23, 1, 0, true, 30),

  ('e0000000-0000-0000-0001-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'B18', 'Base Cabinet 18"',
   '18" base cabinet with 1 door and 1 adjustable shelf.',
   18, 34.5, 24, 16.5, 33, 23, 1, 0, true, 40),

  ('e0000000-0000-0000-0001-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'B21', 'Base Cabinet 21"',
   '21" base cabinet with 1 door and 1 adjustable shelf.',
   21, 34.5, 24, 19.5, 33, 23, 1, 0, true, 50),

  ('e0000000-0000-0000-0001-000000000006', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'B24', 'Base Cabinet 24"',
   '24" base cabinet with 1 door and 1 adjustable shelf. The most common base cabinet width.',
   24, 34.5, 24, 22.5, 33, 23, 1, 0, true, 60),

  ('e0000000-0000-0000-0001-000000000007', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'B27', 'Base Cabinet 27"',
   '27" base cabinet with 1 door and 1 adjustable shelf.',
   27, 34.5, 24, 25.5, 33, 23, 1, 0, true, 70),

  ('e0000000-0000-0000-0001-000000000008', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'B30', 'Base Cabinet 30"',
   '30" double-door base cabinet with 1 adjustable shelf. Popular for sink runs.',
   30, 34.5, 24, 28.5, 33, 23, 2, 0, true, 80),

  ('e0000000-0000-0000-0001-000000000009', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'B33', 'Base Cabinet 33"',
   '33" double-door base cabinet with 1 adjustable shelf.',
   33, 34.5, 24, 31.5, 33, 23, 2, 0, true, 90),

  ('e0000000-0000-0000-0001-000000000010', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'B36', 'Base Cabinet 36"',
   '36" double-door base cabinet with 1 adjustable shelf. Ideal for ranges and cooktops.',
   36, 34.5, 24, 34.5, 33, 23, 2, 0, true, 100)
on conflict (id) do nothing;

-- ── American: Wall Cabinets ───────────────────────────────────
insert into products (id, tenant_id, catalog_line_id, category_id, sku, name, description,
  width_in, height_in, depth_in, door_count, is_active, sort_order)
values
  ('e0000000-0000-0000-0001-000000000011', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
   'W0930', 'Wall Cabinet 9"×30"',
   'Narrow 9" wall cabinet, 30" tall, 1 door with 2 adjustable shelves.',
   9, 30, 12, 1, true, 10),

  ('e0000000-0000-0000-0001-000000000012', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
   'W1230', 'Wall Cabinet 12"×30"',
   '12" wall cabinet, 30" tall, 1 door with 2 adjustable shelves.',
   12, 30, 12, 1, true, 20),

  ('e0000000-0000-0000-0001-000000000013', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
   'W1530', 'Wall Cabinet 15"×30"',
   '15" wall cabinet, 30" tall, 1 door with 2 adjustable shelves.',
   15, 30, 12, 1, true, 30),

  ('e0000000-0000-0000-0001-000000000014', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
   'W1830', 'Wall Cabinet 18"×30"',
   '18" wall cabinet, 30" tall, 1 door with 2 adjustable shelves.',
   18, 30, 12, 1, true, 40),

  ('e0000000-0000-0000-0001-000000000015', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
   'W2130', 'Wall Cabinet 21"×30"',
   '21" wall cabinet, 30" tall, 1 door with 2 adjustable shelves.',
   21, 30, 12, 1, true, 50),

  ('e0000000-0000-0000-0001-000000000016', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
   'W2430', 'Wall Cabinet 24"×30"',
   '24" wall cabinet, 30" tall, 1 door with 2 adjustable shelves.',
   24, 30, 12, 1, true, 60),

  ('e0000000-0000-0000-0001-000000000017', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
   'W3030', 'Wall Cabinet 30"×30"',
   '30" double-door wall cabinet, 30" tall, 2 adjustable shelves.',
   30, 30, 12, 2, true, 70),

  ('e0000000-0000-0000-0001-000000000018', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
   'W3630', 'Wall Cabinet 36"×30"',
   '36" double-door wall cabinet, 30" tall, 2 adjustable shelves.',
   36, 30, 12, 2, true, 80),

  ('e0000000-0000-0000-0001-000000000019', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
   'W3624', 'Wall Cabinet 36"×24"',
   '36" double-door wall cabinet, 24" tall. Used above refrigerators and windows.',
   36, 24, 12, 2, true, 90)
on conflict (id) do nothing;

-- ── American: Tall Cabinets ───────────────────────────────────
insert into products (id, tenant_id, catalog_line_id, category_id, sku, name, description,
  width_in, height_in, depth_in, door_count, is_active, sort_order)
values
  ('e0000000-0000-0000-0001-000000000020', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003',
   'T1884', 'Tall Cabinet 18"×84"',
   '18" pantry/utility cabinet, 84" tall, 24" deep. Includes 4 adjustable shelves.',
   18, 84, 24, 2, true, 10),

  ('e0000000-0000-0000-0001-000000000021', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003',
   'T2484', 'Tall Cabinet 24"×84"',
   '24" pantry cabinet, 84" tall, 24" deep. Includes 4 adjustable shelves. Most popular pantry size.',
   24, 84, 24, 2, true, 20),

  ('e0000000-0000-0000-0001-000000000022', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003',
   'T1890', 'Tall Cabinet 18"×90"',
   '18" pantry cabinet, 90" tall, 24" deep. Includes 5 adjustable shelves.',
   18, 90, 24, 2, true, 30),

  ('e0000000-0000-0000-0001-000000000023', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003',
   'T2490', 'Tall Cabinet 24"×90"',
   '24" pantry cabinet, 90" tall, 24" deep. Includes 5 adjustable shelves.',
   24, 90, 24, 2, true, 40)
on conflict (id) do nothing;

-- ── American: Specialty (Corner) ──────────────────────────────
insert into products (id, tenant_id, catalog_line_id, category_id, sku, name, description,
  width_in, height_in, depth_in, door_count, notes, is_active, sort_order)
values
  ('e0000000-0000-0000-0001-000000000024', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004',
   'SP09', 'Lazy Susan Corner Base 9"',
   'Full-access corner base cabinet with kidney-shaped lazy susan shelving system. Maximizes corner storage.',
   9, 34.5, 24, 1, 'Minimum 9" adjacent run required on each side. Lazy susan requires professional installation.', true, 10),

  ('e0000000-0000-0000-0001-000000000025', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004',
   'BL36B', 'Blind Corner Base 36"',
   'Blind corner base cabinet, 36" wide. The exposed side closes off the corner; the blind side fills the adjacent run.',
   36, 34.5, 24, 1, 'Requires 1.5" filler strip on blind side wall. Add BL36B-PULL for pull-out shelf unit.', true, 20),

  ('e0000000-0000-0000-0001-000000000026', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004',
   'BL36W', 'Blind Corner Wall 36"',
   'Blind corner wall cabinet, 36" wide, 30" tall. Matches BL36B blind corner configuration.',
   36, 30, 12, 1, 'Pair with BL36B for full corner treatment.', true, 30)
on conflict (id) do nothing;

-- ── American: Drawer Banks ────────────────────────────────────
insert into products (id, tenant_id, catalog_line_id, category_id, sku, name, description,
  width_in, height_in, depth_in, drawer_count, door_count, is_active, sort_order)
values
  ('e0000000-0000-0000-0001-000000000027', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006',
   'DB12', 'Drawer Base 12"',
   '12" all-drawer base with 3 full-extension soft-close drawers.',
   12, 34.5, 24, 3, 0, true, 10),

  ('e0000000-0000-0000-0001-000000000028', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006',
   'DB18', 'Drawer Base 18"',
   '18" all-drawer base with 3 full-extension soft-close drawers.',
   18, 34.5, 24, 3, 0, true, 20),

  ('e0000000-0000-0000-0001-000000000029', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006',
   'DB24', 'Drawer Base 24"',
   '24" all-drawer base with 3 full-extension soft-close drawers.',
   24, 34.5, 24, 3, 0, true, 30),

  ('e0000000-0000-0000-0001-000000000030', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006',
   'DB36', 'Drawer Base 36"',
   '36" all-drawer base with 3 full-extension soft-close drawers. Ideal for pots-and-pans storage.',
   36, 34.5, 24, 3, 0, true, 40)
on conflict (id) do nothing;

-- ── American: Vanity Cabinets ─────────────────────────────────
insert into products (id, tenant_id, catalog_line_id, category_id, sku, name, description,
  width_in, height_in, depth_in, door_count, drawer_count, is_active, sort_order)
values
  ('e0000000-0000-0000-0001-000000000031', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005',
   'V24', 'Vanity Cabinet 24"',
   '24" bathroom vanity base with 2 doors and 1 adjustable shelf. ADA-compatible height.',
   24, 34.5, 21, 2, 0, true, 10),

  ('e0000000-0000-0000-0001-000000000032', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005',
   'V30', 'Vanity Cabinet 30"',
   '30" bathroom vanity base with 2 doors and 1 adjustable shelf.',
   30, 34.5, 21, 2, 0, true, 20),

  ('e0000000-0000-0000-0001-000000000033', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005',
   'V36', 'Vanity Cabinet 36"',
   '36" bathroom vanity base with 2 doors and 1 adjustable shelf.',
   36, 34.5, 21, 2, 0, true, 30),

  ('e0000000-0000-0000-0001-000000000034', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005',
   'V48', 'Vanity Cabinet 48"',
   '48" bathroom vanity base with 2 doors and 1 adjustable shelf. Fits double-sink tops.',
   48, 34.5, 21, 2, 0, true, 40)
on conflict (id) do nothing;

-- ================================================================
-- PRODUCTS: Euro Collection
-- Frameless (full-access) construction. 5/8" cabinet box.
-- Base cabinets: 32.5" tall (no face frame), 22" deep
-- Wall cabinets: 11" deep
-- Tall cabinets: 24" deep
-- ================================================================

-- ── Euro: Base Cabinets ───────────────────────────────────────
insert into products (id, tenant_id, catalog_line_id, category_id, sku, name, description,
  width_in, height_in, depth_in, door_count, is_active, sort_order)
values
  ('e0000000-0000-0000-0002-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   'EB18', 'Euro Base 18"',
   '18" frameless base cabinet, 32.5" tall, 22" deep. 1 door, 2 adjustable shelves.',
   18, 32.5, 22, 1, true, 10),

  ('e0000000-0000-0000-0002-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   'EB24', 'Euro Base 24"',
   '24" frameless base cabinet, 32.5" tall, 22" deep. 1 door, 2 adjustable shelves.',
   24, 32.5, 22, 1, true, 20),

  ('e0000000-0000-0000-0002-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   'EB30', 'Euro Base 30"',
   '30" frameless base cabinet, 32.5" tall, 22" deep. 2 doors, 2 adjustable shelves.',
   30, 32.5, 22, 2, true, 30),

  ('e0000000-0000-0000-0002-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   'EB36', 'Euro Base 36"',
   '36" frameless base cabinet, 32.5" tall, 22" deep. 2 doors, 2 adjustable shelves.',
   36, 32.5, 22, 2, true, 40),

  ('e0000000-0000-0000-0002-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   'EB45', 'Euro Base 45"',
   '45" frameless base cabinet, 32.5" tall, 22" deep. 2 doors, 2 adjustable shelves.',
   45, 32.5, 22, 2, true, 50)
on conflict (id) do nothing;

-- ── Euro: Wall Cabinets ───────────────────────────────────────
insert into products (id, tenant_id, catalog_line_id, category_id, sku, name, description,
  width_in, height_in, depth_in, door_count, is_active, sort_order)
values
  ('e0000000-0000-0000-0002-000000000006', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002',
   'EW1218', 'Euro Wall 12"×18"',
   '12" frameless wall cabinet, 18" tall. Ideal above windows or as a microwave shelf.',
   12, 18, 11, 1, true, 10),

  ('e0000000-0000-0000-0002-000000000007', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002',
   'EW2418', 'Euro Wall 24"×18"',
   '24" frameless wall cabinet, 18" tall. 2 doors, 1 fixed shelf.',
   24, 18, 11, 2, true, 20),

  ('e0000000-0000-0000-0002-000000000008', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002',
   'EW2430', 'Euro Wall 24"×30"',
   '24" frameless wall cabinet, 30" tall. 2 doors, 2 adjustable shelves.',
   24, 30, 11, 2, true, 30),

  ('e0000000-0000-0000-0002-000000000009', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002',
   'EW3630', 'Euro Wall 36"×30"',
   '36" frameless wall cabinet, 30" tall. 2 doors, 2 adjustable shelves.',
   36, 30, 11, 2, true, 40)
on conflict (id) do nothing;

-- ── Euro: Tall Cabinets ───────────────────────────────────────
insert into products (id, tenant_id, catalog_line_id, category_id, sku, name, description,
  width_in, height_in, depth_in, door_count, is_active, sort_order)
values
  ('e0000000-0000-0000-0002-000000000010', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003',
   'ET1884', 'Euro Tall 18"×84"',
   '18" frameless pantry cabinet, 84" tall, 24" deep. 4 adjustable shelves, push-to-open or soft-close compatible.',
   18, 84, 24, 2, true, 10),

  ('e0000000-0000-0000-0002-000000000011', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003',
   'ET2484', 'Euro Tall 24"×84"',
   '24" frameless pantry cabinet, 84" tall, 24" deep. 5 adjustable shelves. Most popular Euro tall.',
   24, 84, 24, 2, true, 20)
on conflict (id) do nothing;

-- ── Euro: Drawer Banks ────────────────────────────────────────
insert into products (id, tenant_id, catalog_line_id, category_id, sku, name, description,
  width_in, height_in, depth_in, drawer_count, door_count, is_active, sort_order)
values
  ('e0000000-0000-0000-0002-000000000012', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000006',
   'EDB24', 'Euro Drawer Base 24"',
   '24" frameless all-drawer base with 4 full-extension soft-close drawers. Integrated Blum LEGRABOX runners.',
   24, 32.5, 22, 4, 0, true, 10),

  ('e0000000-0000-0000-0002-000000000013', 'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000006',
   'EDB36', 'Euro Drawer Base 36"',
   '36" frameless all-drawer base with 4 full-extension soft-close drawers. Integrated Blum LEGRABOX runners.',
   36, 32.5, 22, 4, 0, true, 20)
on conflict (id) do nothing;

-- ================================================================
-- PRODUCT FINISH MAP
-- American Collection: all products × all 4 American finishes
-- Euro Collection: all products × all 4 Euro finishes
-- Exceptions: B09 — stained finishes unavailable (too narrow)
-- ================================================================

-- American Collection: bulk insert all product × finish combinations
insert into product_finish_map (product_id, finish_id, is_default, is_available, sort_order)
select
  p.id                                                                   as product_id,
  f.id                                                                   as finish_id,
  case when f.code = 'white-shaker' then true else false end             as is_default,
  -- B09 cannot be stained — narrow door profile rejects stain application
  case
    when p.sku = 'B09' and f.code in ('espresso', 'natural-maple') then false
    else true
  end                                                                    as is_available,
  case f.code
    when 'white-shaker'  then 1
    when 'gray-shaker'   then 2
    when 'espresso'      then 3
    when 'natural-maple' then 4
    else 99
  end                                                                    as sort_order
from products p
join finishes f on f.catalog_line_id = 'b0000000-0000-0000-0000-000000000001'
where p.catalog_line_id = 'b0000000-0000-0000-0000-000000000001'
  and p.tenant_id        = 'a0000000-0000-0000-0000-000000000001'
  and f.tenant_id        = 'a0000000-0000-0000-0000-000000000001'
on conflict (product_id, finish_id) do nothing;

-- Euro Collection: bulk insert all product × finish combinations
insert into product_finish_map (product_id, finish_id, is_default, is_available, sort_order)
select
  p.id                                                                   as product_id,
  f.id                                                                   as finish_id,
  case when f.code = 'matte-white' then true else false end              as is_default,
  true                                                                   as is_available,
  case f.code
    when 'matte-white'    then 1
    when 'matte-black'    then 2
    when 'high-gloss-gray' then 3
    when 'walnut-veneer'  then 4
    else 99
  end                                                                    as sort_order
from products p
join finishes f on f.catalog_line_id = 'b0000000-0000-0000-0000-000000000002'
where p.catalog_line_id = 'b0000000-0000-0000-0000-000000000002'
  and p.tenant_id        = 'a0000000-0000-0000-0000-000000000001'
  and f.tenant_id        = 'a0000000-0000-0000-0000-000000000001'
on conflict (product_id, finish_id) do nothing;

-- ================================================================
-- PRODUCT RULES
-- dimension_notes and finish incompatibility rules
-- ================================================================

insert into product_rules (tenant_id, product_id, rule_type, rule_value, label, is_active)
values
  -- SP09: lazy susan installation note
  (
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0001-000000000024',
    'dimension_note',
    '{"message": "Requires a minimum 9\" adjacent cabinet run on each side. Lazy susan hardware requires professional installation. Not compatible with pull-out trash or door-mounted accessories on the adjacent side."}',
    'Professional installation required',
    true
  ),
  -- BL36B: filler strip note
  (
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0001-000000000025',
    'dimension_note',
    '{"message": "A 1.5\" x 34.5\" filler strip is required on the blind side where the cabinet meets the adjacent wall run. Order separately."}',
    'Filler strip required on blind side',
    true
  ),
  -- B09: finish_incompatible rule (also enforced via is_available=false above, this makes the reason explicit)
  (
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0001-000000000001',
    'finish_incompatible',
    '{"finish_ids": ["f0000000-0000-0000-0001-000000000003", "f0000000-0000-0000-0001-000000000004"], "reason": "Narrow 9\" door profile does not accept stain application. Available in painted finishes only."}',
    'Stain finishes not available on B09',
    true
  ),
  -- ET2484: installation note for tall Euro cabinets
  (
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0002-000000000011',
    'dimension_note',
    '{"message": "Cabinets over 84\" tall require ceiling height of at least 88\". Secure to wall studs at both top and bottom rail. Upper section ships separately."}',
    'Ceiling height minimum 88" required',
    true
  )
on conflict do nothing;

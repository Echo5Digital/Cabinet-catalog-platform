-- ============================================================
-- Colors & Structures — Part 1 of 2
-- Run this first, then run 20260428_colors_structures_part2.sql
-- ============================================================

-- Extend asset_type_enum with new asset types.
-- PostgreSQL requires these to be committed BEFORE they are
-- referenced in CHECK constraints (which are in Part 2).
ALTER TYPE asset_type_enum ADD VALUE IF NOT EXISTS 'color_swatch';
ALTER TYPE asset_type_enum ADD VALUE IF NOT EXISTS 'structure_image';

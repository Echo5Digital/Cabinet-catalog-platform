-- Add structure_reference asset type for admin-only AI layout reference images.
-- These images are used ONLY by the AI design system for layout analysis — never shown publicly.
-- Must be in a separate migration from the CHECK constraint (PostgreSQL requires enum values to commit first).

ALTER TYPE asset_type_enum ADD VALUE IF NOT EXISTS 'structure_reference';

-- Add check constraint for structure_reference assets.
-- Confirmed structure_reference assets must have structure_id set.
-- Run AFTER 20260505_structure_reference.sql has been committed.

ALTER TABLE assets
  ADD CONSTRAINT chk_structure_reference_needs_structure
    CHECK (status != 'confirmed' OR asset_type != 'structure_reference' OR structure_id IS NOT NULL);

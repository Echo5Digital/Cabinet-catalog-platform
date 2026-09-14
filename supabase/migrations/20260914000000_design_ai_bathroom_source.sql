-- Add design_ai_bathroom as a valid lead source (used by the Bathroom Design AI quote submission flow)
ALTER TYPE lead_source_enum ADD VALUE IF NOT EXISTS 'design_ai_bathroom';

-- Add design_ai as a valid lead source (used by the Design AI quote submission flow)
ALTER TYPE lead_source_enum ADD VALUE IF NOT EXISTS 'design_ai';

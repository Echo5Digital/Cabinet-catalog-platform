-- Add is_corrected flag to assets table
-- Run this in Supabase SQL Editor after schema.sql
ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_corrected boolean not null default false;

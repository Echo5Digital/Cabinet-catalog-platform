-- Add design_params column to design_quotes for storing all design form fields
alter table design_quotes
  add column if not exists design_params jsonb default '{}',
  add column if not exists tax_rate numeric default 8;

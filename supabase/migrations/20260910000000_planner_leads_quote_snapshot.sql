-- ─── Planner Leads: quote request fields ────────────────────────────────────
-- Adds a required "address" field and a full design-state snapshot so that
-- the admin dashboard can re-open the exact 2D/3D design a customer saved
-- when requesting a quote from the kitchen planner (Step 3 "Save and Get Quote").

alter table planner_leads
  add column if not exists customer_address text,
  add column if not exists cabinet_style     text,
  add column if not exists scene_json        jsonb,   -- { items, zones } — full spatial scene
  add column if not exists door_windows_json jsonb default '[]'::jsonb;

create index if not exists planner_leads_status_idx on planner_leads(status);

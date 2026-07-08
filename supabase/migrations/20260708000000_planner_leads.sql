-- ─── Planner Leads ───────────────────────────────────────────────────────────
-- Stores verified OTP leads who generated and downloaded a planner proposal PDF.
-- Each row = one verified download event (name, phone, email + plan snapshot).

create table if not exists planner_leads (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,

  -- Contact info collected before OTP verification
  customer_name   text not null,
  customer_email  text not null,
  customer_phone  text,

  -- Plan snapshot at time of download
  layout          text,
  room_width      numeric,
  room_length     numeric,
  room_height     numeric,
  items_json      jsonb default '[]'::jsonb,
  settings_json   jsonb default '{}'::jsonb,   -- door style, hardware, countertop, etc.

  -- AI image (public URL stored in Supabase Storage, or null)
  ai_image_url    text,

  -- Proposal metadata
  project_name    text,
  notes           text,

  -- Status
  status          text not null default 'new',  -- 'new' | 'contacted' | 'closed'

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes
create index if not exists planner_leads_tenant_id_idx    on planner_leads(tenant_id);
create index if not exists planner_leads_email_idx        on planner_leads(customer_email);
create index if not exists planner_leads_created_at_idx   on planner_leads(created_at desc);

-- RLS
alter table planner_leads enable row level security;

-- Only service-role (admin client) can read/write — planner is public-facing
-- so no authenticated-user policies needed; API routes use the service role key.

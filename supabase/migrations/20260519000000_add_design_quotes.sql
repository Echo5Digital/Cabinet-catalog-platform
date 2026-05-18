create table design_quotes (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid references tenants(id) on delete cascade,
  created_by       uuid references auth.users(id),
  customer_name    text not null,
  customer_email   text not null,
  room_width       numeric not null,
  room_depth       numeric not null,
  room_height      numeric not null,
  style_notes      text,
  svg_floor_plan   text,
  design_image_url text,
  quote_items      jsonb default '[]',
  quote_notes      text,
  status           text default 'draft' check (status in ('draft','sent')),
  pdf_url          text,
  sent_at          timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz not null default now()
);

-- updated_at trigger
create or replace function _set_design_quotes_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists design_quotes_updated_at on design_quotes;
create trigger design_quotes_updated_at
  before update on design_quotes
  for each row execute function _set_design_quotes_updated_at();

alter table design_quotes enable row level security;

-- RLS: scoped to tenant via tenant_users (matches this project's auth pattern)
create policy "Tenant members can access their design quotes"
on design_quotes for all
using (
  tenant_id in (
    select tenant_id from tenant_users
    where auth_user_id = auth.uid() and is_active = true
  )
);

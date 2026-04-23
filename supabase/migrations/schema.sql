-- ================================================================
-- Cabinet Catalog Platform — Full Schema (v2)
-- ================================================================
-- Run this file in Supabase SQL Editor (or supabase db push).
-- This is a COMPLETE replacement of 001_initial_schema.sql.
-- If you already ran v1, run 000_drop_v1.sql first (see below).
--
-- BREAKING CHANGES from v1:
--   asset_type_enum:  'product' → 'product_diagram'
--                     'finish'  → 'finish_swatch'
--   confidence_enum:  'mapped'           → 'matched'
--                     'partially_matched'→ 'partial'
--   Tables renamed:   ingested_assets    → assets (unified)
--                     asset_mappings     → removed (merged into assets + product_assets)
--                     product_finishes   → product_finish_map
--                     leads              → lead_requests + lead_request_items
--   Tables added:     tenant_users, manufacturers, catalog_versions,
--                     product_variants, product_rules,
--                     ai_sessions, ai_messages, ai_recommendations,
--                     audit_logs
-- ================================================================

-- ── Extensions ────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ================================================================
-- ENUM TYPES
-- ================================================================

create type tenant_status_enum   as enum ('active', 'suspended', 'trial');
create type user_role_enum       as enum ('owner', 'admin', 'editor', 'viewer');

create type line_status_enum     as enum ('draft', 'review', 'published', 'archived');
create type version_status_enum  as enum ('draft', 'published', 'archived');

create type asset_type_enum      as enum ('product_diagram', 'finish_swatch', 'lifestyle');
create type asset_status_enum    as enum ('pending_review', 'confirmed', 'flagged', 'rejected');
create type confidence_enum      as enum ('matched', 'partial', 'unmatched');

create type lead_status_enum     as enum ('new', 'contacted', 'quoted', 'closed', 'lost');
create type lead_source_enum     as enum ('catalog', 'ai_chat', 'manual', 'import');

create type ai_actor_enum        as enum ('user', 'assistant', 'system');
create type rec_status_enum      as enum ('shown', 'clicked', 'quoted', 'dismissed');

create type audit_action_enum    as enum (
  'create', 'update', 'delete',
  'publish', 'unpublish', 'archive',
  'asset_confirm', 'asset_flag', 'asset_reject',
  'lead_status_change', 'version_rollback'
);

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Reads tenant_id from auth JWT user_metadata.
-- Set this value when creating admin users via Supabase Auth.
create or replace function auth_tenant_id()
returns uuid language sql stable security definer as $$
  select (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid;
$$;

-- Reads user role from JWT user_metadata
create or replace function auth_user_role()
returns text language sql stable security definer as $$
  select auth.jwt() -> 'user_metadata' ->> 'role';
$$;

-- Auto-set updated_at on any table that has it
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ================================================================
-- TABLE 1: tenants
-- Root entity. One row per cabinet business.
-- ================================================================
create table tenants (
  id            uuid        primary key default uuid_generate_v4(),
  name          text        not null,
  slug          text        not null unique,
  logo_url      text,
  primary_color text        not null default '#1a1a1a',
  accent_color  text        not null default '#3b82f6',
  contact_email text,
  contact_phone text,
  website_url   text,
  status        tenant_status_enum not null default 'active',
  settings      jsonb       not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ================================================================
-- TABLE 2: tenant_users
-- Maps Supabase auth users to a tenant with a role.
-- ================================================================
create table tenant_users (
  id            uuid        primary key default uuid_generate_v4(),
  tenant_id     uuid        not null references tenants(id) on delete cascade,
  auth_user_id  uuid        not null unique,  -- auth.users.id
  email         text        not null,
  full_name     text,
  role          user_role_enum not null default 'editor',
  is_active     boolean     not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ================================================================
-- TABLE 3: manufacturers
-- Physical brand/maker of a cabinet line.
-- ================================================================
create table manufacturers (
  id                uuid        primary key default uuid_generate_v4(),
  tenant_id         uuid        not null references tenants(id) on delete cascade,
  name              text        not null,
  slug              text        not null,
  country_of_origin text,
  website_url       text,
  contact_name      text,
  contact_email     text,
  notes             text,
  is_active         boolean     not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (tenant_id, slug)
);

-- ================================================================
-- TABLE 4: catalog_lines
-- Top-level product collections (American, Euro, etc.)
-- cover_asset_id FK added after assets table is created (below).
-- ================================================================
create table catalog_lines (
  id              uuid        primary key default uuid_generate_v4(),
  tenant_id       uuid        not null references tenants(id) on delete cascade,
  manufacturer_id uuid        references manufacturers(id) on delete set null,
  name            text        not null,
  slug            text        not null,
  description     text,
  cover_asset_id  uuid,       -- FK to assets added via ALTER TABLE below
  status          line_status_enum not null default 'draft',
  sort_order      int         not null default 0,
  published_at    timestamptz,
  published_by    uuid        references tenant_users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, slug)
);

-- ================================================================
-- TABLE 5: catalog_versions
-- Immutable publish snapshot. Written on every publish action.
-- ================================================================
create table catalog_versions (
  id              uuid        primary key default uuid_generate_v4(),
  tenant_id       uuid        not null references tenants(id) on delete cascade,
  catalog_line_id uuid        not null references catalog_lines(id) on delete cascade,
  version_number  int         not null,
  status          version_status_enum not null default 'published',
  label           text,
  snapshot        jsonb       not null default '{}',
  product_count   int         not null default 0,
  finish_count    int         not null default 0,
  asset_count     int         not null default 0,
  notes           text,
  published_by    uuid        references tenant_users(id) on delete set null,
  published_at    timestamptz not null default now(),
  archived_at     timestamptz,
  unique (catalog_line_id, version_number)
);

-- ================================================================
-- TABLE 6: categories
-- Base, Wall, Tall, Specialty, Vanity — tenant-scoped, cross-line.
-- ================================================================
create table categories (
  id          uuid        primary key default uuid_generate_v4(),
  tenant_id   uuid        not null references tenants(id) on delete cascade,
  name        text        not null,
  slug        text        not null,
  description text,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, slug)
);

-- ================================================================
-- TABLE 7: finishes
-- Surface treatments per catalog line (White Shaker, Espresso, etc.)
-- ================================================================
create table finishes (
  id              uuid        primary key default uuid_generate_v4(),
  tenant_id       uuid        not null references tenants(id) on delete cascade,
  catalog_line_id uuid        references catalog_lines(id) on delete set null,
  name            text        not null,
  code            text        not null,   -- filename key: 'white-shaker'
  description     text,
  finish_family   text,                   -- 'painted', 'stained', 'thermofoil'
  is_active       boolean     not null default true,
  sort_order      int         not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, catalog_line_id, code)
);

-- ================================================================
-- TABLE 8: products
-- Core SKU record. Exact dimensions. One row per cabinet model.
-- ================================================================
create table products (
  id              uuid        primary key default uuid_generate_v4(),
  tenant_id       uuid        not null references tenants(id) on delete cascade,
  catalog_line_id uuid        not null references catalog_lines(id) on delete restrict,
  category_id     uuid        not null references categories(id) on delete restrict,
  sku             text        not null,
  name            text        not null,
  description     text,
  width_in        numeric(6,2),
  height_in       numeric(6,2),
  depth_in        numeric(6,2),
  box_width_in    numeric(6,2),
  box_height_in   numeric(6,2),
  box_depth_in    numeric(6,2),
  door_count      int,
  drawer_count    int,
  notes           text,
  is_active       boolean     not null default true,
  sort_order      int         not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, catalog_line_id, sku)
);

-- ================================================================
-- TABLE 9: product_variants
-- Directional/config variants of a SKU (left, right, open, double).
-- ================================================================
create table product_variants (
  id          uuid        primary key default uuid_generate_v4(),
  tenant_id   uuid        not null references tenants(id) on delete cascade,
  product_id  uuid        not null references products(id) on delete cascade,
  variant_key text        not null,   -- 'left', 'right', 'open', 'double'
  label       text        not null,   -- 'Left Hinge', 'Double Door'
  sku_suffix  text,                   -- appended to parent SKU: '-L', '-R'
  is_default  boolean     not null default false,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now(),
  unique (product_id, variant_key)
);

-- ================================================================
-- TABLE 10: product_finish_map
-- Many-to-many: which finishes are available for which SKU.
-- ================================================================
create table product_finish_map (
  product_id   uuid    not null references products(id) on delete cascade,
  finish_id    uuid    not null references finishes(id) on delete cascade,
  is_default   boolean not null default false,
  is_available boolean not null default true,
  sort_order   int     not null default 0,
  created_at   timestamptz not null default now(),
  primary key (product_id, finish_id)
);

-- ================================================================
-- TABLE 11: assets
-- UNIFIED asset table. Full pipeline from upload to confirmed.
-- Replaces both ingested_assets and asset_mappings from v1.
--
-- asset_type = 'product_diagram' → linked via product_assets join table
-- asset_type = 'finish_swatch'   → linked via assets.finish_id (direct FK)
-- asset_type = 'lifestyle'       → linked via assets.catalog_line_id (direct FK)
-- ================================================================
create table assets (
  id                  uuid          primary key default uuid_generate_v4(),
  tenant_id           uuid          not null references tenants(id) on delete cascade,
  asset_type          asset_type_enum not null,

  -- ── Storage ──────────────────────────────────────────────
  original_filename   text          not null,
  storage_bucket      text          not null,
  storage_path        text          not null,
  public_url          text,                     -- populated after confirmation
  file_size_bytes     bigint,
  mime_type           text,
  width_px            int,
  height_px           int,

  -- ── Parsed from filename ──────────────────────────────────
  parsed_line_slug    text,
  parsed_category_slug text,
  parsed_sku          text,
  parsed_finish_code  text,
  parsed_variant      text,
  parsed_sequence     int,
  parse_notes         text[],

  -- ── Confidence & status ──────────────────────────────────
  confidence          confidence_enum   not null default 'unmatched',
  status              asset_status_enum not null default 'pending_review',
  flag_reason         text,

  -- ── Resolved relationships ────────────────────────────────
  -- For finish_swatch: finish_id must be set when confirmed
  finish_id           uuid references finishes(id) on delete set null,
  -- For lifestyle: catalog_line_id must be set when confirmed
  catalog_line_id     uuid references catalog_lines(id) on delete set null,
  -- (product_diagram linkage lives in product_assets join table)

  -- ── AI ───────────────────────────────────────────────────
  ai_eligible         boolean not null default false,
  alt_text            text,
  ai_description      text,

  -- ── Review audit ─────────────────────────────────────────
  confirmed_by        uuid references tenant_users(id) on delete set null,
  confirmed_at        timestamptz,
  reviewed_by         uuid references tenant_users(id) on delete set null,
  reviewed_at         timestamptz,

  ingested_at         timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- ── Integrity constraints ─────────────────────────────────
  -- finish_swatch MUST have finish_id when confirmed
  constraint chk_finish_swatch_needs_finish
    check (
      status != 'confirmed'
      or asset_type != 'finish_swatch'
      or finish_id is not null
    ),
  -- lifestyle MUST have catalog_line_id when confirmed
  constraint chk_lifestyle_needs_line
    check (
      status != 'confirmed'
      or asset_type != 'lifestyle'
      or catalog_line_id is not null
    ),
  -- ai_eligible can only be true when confirmed
  constraint chk_ai_eligible_requires_confirmed
    check (ai_eligible = false or status = 'confirmed')
);

-- ================================================================
-- TABLE 12: product_assets
-- Links confirmed product_diagram assets to products (+ variants).
-- ================================================================
create table product_assets (
  id          uuid        primary key default uuid_generate_v4(),
  tenant_id   uuid        not null references tenants(id) on delete cascade,
  product_id  uuid        not null references products(id) on delete cascade,
  asset_id    uuid        not null references assets(id) on delete cascade,
  variant_id  uuid        references product_variants(id) on delete set null,
  is_primary  boolean     not null default false,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now(),
  unique (product_id, asset_id)
);

-- ================================================================
-- TABLE 13: product_rules
-- Compatibility and business rules (finish restrictions, notes, etc.)
-- ================================================================
create table product_rules (
  id              uuid        primary key default uuid_generate_v4(),
  tenant_id       uuid        not null references tenants(id) on delete cascade,
  product_id      uuid        references products(id) on delete cascade,
  category_id     uuid        references categories(id) on delete cascade,
  catalog_line_id uuid        references catalog_lines(id) on delete cascade,
  rule_type       text        not null,  -- 'finish_incompatible','finish_required','dimension_note'
  rule_value      jsonb       not null default '{}',
  label           text        not null,
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ================================================================
-- TABLE 14: lead_requests
-- Customer quote request container.
-- ================================================================
create table lead_requests (
  id                  uuid        primary key default uuid_generate_v4(),
  tenant_id           uuid        not null references tenants(id) on delete cascade,
  source              lead_source_enum not null default 'catalog',
  ai_session_id       uuid,                    -- FK to ai_sessions added below
  name                text        not null,
  email               text        not null,
  phone               text,
  company             text,
  project_description text,
  notes               text,
  status              lead_status_enum not null default 'new',
  assigned_to         uuid        references tenant_users(id) on delete set null,
  internal_notes      text,
  followed_up_at      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ================================================================
-- TABLE 15: lead_request_items
-- Individual SKU × finish × quantity line items per lead.
-- ================================================================
create table lead_request_items (
  id              uuid        primary key default uuid_generate_v4(),
  lead_request_id uuid        not null references lead_requests(id) on delete cascade,
  product_id      uuid        references products(id) on delete set null,
  product_sku     text        not null,   -- denormalized (survives product deletion)
  product_name    text        not null,   -- denormalized
  finish_id       uuid        references finishes(id) on delete set null,
  finish_name     text,                   -- denormalized
  variant_id      uuid        references product_variants(id) on delete set null,
  quantity        int         not null default 1,
  notes           text,
  sort_order      int         not null default 0,
  created_at      timestamptz not null default now()
);

-- ================================================================
-- TABLE 16: ai_sessions
-- One AI chat session per customer visit.
-- ================================================================
create table ai_sessions (
  id               uuid        primary key default uuid_generate_v4(),
  tenant_id        uuid        not null references tenants(id) on delete cascade,
  catalog_line_id  uuid        references catalog_lines(id) on delete set null,
  session_token    text        not null unique,
  customer_name    text,
  customer_email   text,
  lead_request_id  uuid        references lead_requests(id) on delete set null,
  total_messages   int         not null default 0,
  resolved         boolean     not null default false,
  started_at       timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  ended_at         timestamptz
);

-- ================================================================
-- TABLE 17: ai_messages
-- Every message turn (user + assistant) within a session.
-- ================================================================
create table ai_messages (
  id           uuid        primary key default uuid_generate_v4(),
  session_id   uuid        not null references ai_sessions(id) on delete cascade,
  tenant_id    uuid        not null references tenants(id) on delete cascade,
  actor        ai_actor_enum not null,
  content      text        not null,
  tool_calls   jsonb,
  tool_results jsonb,
  model        text,
  input_tokens  int,
  output_tokens int,
  latency_ms   int,
  created_at   timestamptz not null default now()
);

-- ================================================================
-- TABLE 18: ai_recommendations
-- Products/finishes surfaced by AI — tracks engagement.
-- ================================================================
create table ai_recommendations (
  id          uuid        primary key default uuid_generate_v4(),
  session_id  uuid        not null references ai_sessions(id) on delete cascade,
  tenant_id   uuid        not null references tenants(id) on delete cascade,
  message_id  uuid        references ai_messages(id) on delete set null,
  product_id  uuid        references products(id) on delete set null,
  finish_id   uuid        references finishes(id) on delete set null,
  reason      text,
  status      rec_status_enum not null default 'shown',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ================================================================
-- TABLE 19: audit_logs
-- Append-only log of every significant admin action.
-- Never updated or deleted — enforced by missing UPDATE/DELETE policy.
-- ================================================================
create table audit_logs (
  id           uuid        primary key default uuid_generate_v4(),
  tenant_id    uuid        not null references tenants(id) on delete cascade,
  performed_by uuid        references tenant_users(id) on delete set null,
  action       audit_action_enum not null,
  table_name   text        not null,
  record_id    uuid,
  old_values   jsonb,
  new_values   jsonb,
  metadata     jsonb       default '{}',
  created_at   timestamptz not null default now()
  -- NOTE: no updated_at — logs are immutable
);

-- ================================================================
-- DEFERRED FOREIGN KEYS (circular references resolved after creation)
-- ================================================================

-- catalog_lines.cover_asset_id → assets
alter table catalog_lines
  add constraint fk_catalog_lines_cover_asset
  foreign key (cover_asset_id) references assets(id) on delete set null;

-- lead_requests.ai_session_id → ai_sessions
alter table lead_requests
  add constraint fk_lead_requests_ai_session
  foreign key (ai_session_id) references ai_sessions(id) on delete set null;

-- ================================================================
-- INDEXES
-- ================================================================

-- tenants
create index idx_tenants_slug              on tenants(slug);

-- tenant_users
create index idx_tenant_users_tenant       on tenant_users(tenant_id);
create index idx_tenant_users_auth         on tenant_users(auth_user_id);

-- manufacturers
create index idx_manufacturers_tenant      on manufacturers(tenant_id);

-- catalog_lines
create index idx_catalog_lines_tenant      on catalog_lines(tenant_id);
create index idx_catalog_lines_status      on catalog_lines(status);
create index idx_catalog_lines_slug        on catalog_lines(tenant_id, slug);

-- catalog_versions
create index idx_catalog_versions_line     on catalog_versions(catalog_line_id);
create index idx_catalog_versions_tenant   on catalog_versions(tenant_id);

-- categories
create index idx_categories_tenant         on categories(tenant_id);

-- finishes
create index idx_finishes_tenant           on finishes(tenant_id);
create index idx_finishes_line             on finishes(catalog_line_id);
create index idx_finishes_code             on finishes(tenant_id, code);

-- products
create index idx_products_tenant           on products(tenant_id);
create index idx_products_line             on products(catalog_line_id);
create index idx_products_category         on products(category_id);
create index idx_products_sku              on products(tenant_id, sku);
create index idx_products_active           on products(tenant_id, is_active);

-- product_variants
create index idx_product_variants_product  on product_variants(product_id);

-- product_finish_map
create index idx_pfm_product               on product_finish_map(product_id);
create index idx_pfm_finish                on product_finish_map(finish_id);

-- assets
create index idx_assets_tenant             on assets(tenant_id);
create index idx_assets_status             on assets(status);
create index idx_assets_confidence         on assets(confidence);
create index idx_assets_type               on assets(asset_type);
create index idx_assets_finish             on assets(finish_id);
create index idx_assets_line               on assets(catalog_line_id);
create index idx_assets_ai                 on assets(tenant_id, ai_eligible) where ai_eligible = true;
create index idx_assets_confirmed          on assets(tenant_id, status) where status = 'confirmed';

-- product_assets
create index idx_product_assets_product    on product_assets(product_id);
create index idx_product_assets_asset      on product_assets(asset_id);
create index idx_product_assets_primary    on product_assets(product_id, is_primary);

-- product_rules
create index idx_product_rules_product     on product_rules(product_id);
create index idx_product_rules_tenant      on product_rules(tenant_id);

-- lead_requests
create index idx_lead_requests_tenant      on lead_requests(tenant_id);
create index idx_lead_requests_status      on lead_requests(status);
create index idx_lead_requests_email       on lead_requests(email);

-- lead_request_items
create index idx_lead_items_lead           on lead_request_items(lead_request_id);
create index idx_lead_items_product        on lead_request_items(product_id);

-- ai_sessions
create index idx_ai_sessions_tenant        on ai_sessions(tenant_id);
create index idx_ai_sessions_token         on ai_sessions(session_token);

-- ai_messages
create index idx_ai_messages_session       on ai_messages(session_id);

-- ai_recommendations
create index idx_ai_recs_session           on ai_recommendations(session_id);
create index idx_ai_recs_product           on ai_recommendations(product_id);

-- audit_logs
create index idx_audit_logs_tenant         on audit_logs(tenant_id);
create index idx_audit_logs_table          on audit_logs(table_name, record_id);
create index idx_audit_logs_actor          on audit_logs(performed_by);
create index idx_audit_logs_created        on audit_logs(created_at desc);

-- ================================================================
-- TRIGGERS — auto updated_at
-- ================================================================
create trigger trg_tenants_updated_at
  before update on tenants
  for each row execute function set_updated_at();

create trigger trg_tenant_users_updated_at
  before update on tenant_users
  for each row execute function set_updated_at();

create trigger trg_manufacturers_updated_at
  before update on manufacturers
  for each row execute function set_updated_at();

create trigger trg_catalog_lines_updated_at
  before update on catalog_lines
  for each row execute function set_updated_at();

create trigger trg_categories_updated_at
  before update on categories
  for each row execute function set_updated_at();

create trigger trg_finishes_updated_at
  before update on finishes
  for each row execute function set_updated_at();

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

create trigger trg_assets_updated_at
  before update on assets
  for each row execute function set_updated_at();

create trigger trg_product_rules_updated_at
  before update on product_rules
  for each row execute function set_updated_at();

create trigger trg_lead_requests_updated_at
  before update on lead_requests
  for each row execute function set_updated_at();

create trigger trg_ai_recommendations_updated_at
  before update on ai_recommendations
  for each row execute function set_updated_at();

-- ================================================================
-- ROW LEVEL SECURITY — Enable on all tables
-- ================================================================
alter table tenants              enable row level security;
alter table tenant_users         enable row level security;
alter table manufacturers        enable row level security;
alter table catalog_lines        enable row level security;
alter table catalog_versions     enable row level security;
alter table categories           enable row level security;
alter table finishes             enable row level security;
alter table products             enable row level security;
alter table product_variants     enable row level security;
alter table product_finish_map   enable row level security;
alter table assets               enable row level security;
alter table product_assets       enable row level security;
alter table product_rules        enable row level security;
alter table lead_requests        enable row level security;
alter table lead_request_items   enable row level security;
alter table ai_sessions          enable row level security;
alter table ai_messages          enable row level security;
alter table ai_recommendations   enable row level security;
alter table audit_logs           enable row level security;

-- ================================================================
-- RLS POLICIES
-- Pattern:
--   "admin all"   → authenticated users whose tenant_id matches
--   "public read" → anonymous can SELECT specific safe subsets
--   leads INSERT  → anonymous can submit a quote
-- ================================================================

-- ── TENANTS ──────────────────────────────────────────────────
create policy "tenants: admin read own"
  on tenants for select
  using (id = auth_tenant_id());

-- ── TENANT USERS ─────────────────────────────────────────────
create policy "tenant_users: admin all"
  on tenant_users for all
  using (tenant_id = auth_tenant_id());

-- ── MANUFACTURERS ─────────────────────────────────────────────
create policy "manufacturers: admin all"
  on manufacturers for all
  using (tenant_id = auth_tenant_id());

create policy "manufacturers: public read active"
  on manufacturers for select
  using (is_active = true);

-- ── CATALOG LINES ────────────────────────────────────────────
create policy "catalog_lines: admin all"
  on catalog_lines for all
  using (tenant_id = auth_tenant_id());

create policy "catalog_lines: public read published"
  on catalog_lines for select
  using (status = 'published');

-- ── CATALOG VERSIONS ─────────────────────────────────────────
create policy "catalog_versions: admin read"
  on catalog_versions for select
  using (tenant_id = auth_tenant_id());

create policy "catalog_versions: admin insert"
  on catalog_versions for insert
  with check (tenant_id = auth_tenant_id());

-- versions are never updated or deleted by users (service role only)

-- ── CATEGORIES ───────────────────────────────────────────────
create policy "categories: admin all"
  on categories for all
  using (tenant_id = auth_tenant_id());

create policy "categories: public read"
  on categories for select
  using (true);

-- ── FINISHES ─────────────────────────────────────────────────
create policy "finishes: admin all"
  on finishes for all
  using (tenant_id = auth_tenant_id());

create policy "finishes: public read active"
  on finishes for select
  using (is_active = true);

-- ── PRODUCTS ─────────────────────────────────────────────────
create policy "products: admin all"
  on products for all
  using (tenant_id = auth_tenant_id());

create policy "products: public read active"
  on products for select
  using (is_active = true);

-- ── PRODUCT VARIANTS ─────────────────────────────────────────
create policy "product_variants: admin all"
  on product_variants for all
  using (tenant_id = auth_tenant_id());

create policy "product_variants: public read"
  on product_variants for select
  using (
    exists (
      select 1 from products p
      where p.id = product_variants.product_id
        and p.is_active = true
    )
  );

-- ── PRODUCT FINISH MAP ───────────────────────────────────────
create policy "product_finish_map: admin all"
  on product_finish_map for all
  using (
    exists (
      select 1 from products p
      where p.id = product_finish_map.product_id
        and p.tenant_id = auth_tenant_id()
    )
  );

create policy "product_finish_map: public read available"
  on product_finish_map for select
  using (
    is_available = true
    and exists (
      select 1 from products p
      where p.id = product_finish_map.product_id
        and p.is_active = true
    )
  );

-- ── ASSETS ───────────────────────────────────────────────────
create policy "assets: admin all"
  on assets for all
  using (tenant_id = auth_tenant_id());

-- Public can only read confirmed assets
create policy "assets: public read confirmed"
  on assets for select
  using (status = 'confirmed');

-- ── PRODUCT ASSETS ───────────────────────────────────────────
create policy "product_assets: admin all"
  on product_assets for all
  using (tenant_id = auth_tenant_id());

create policy "product_assets: public read"
  on product_assets for select
  using (
    exists (
      select 1 from assets a
      where a.id = product_assets.asset_id
        and a.status = 'confirmed'
    )
  );

-- ── PRODUCT RULES ────────────────────────────────────────────
create policy "product_rules: admin all"
  on product_rules for all
  using (tenant_id = auth_tenant_id());

create policy "product_rules: public read active"
  on product_rules for select
  using (is_active = true);

-- ── LEAD REQUESTS ────────────────────────────────────────────
create policy "lead_requests: admin all"
  on lead_requests for all
  using (tenant_id = auth_tenant_id());

-- Anonymous customers can submit a quote
create policy "lead_requests: public insert"
  on lead_requests for insert
  with check (true);

-- ── LEAD REQUEST ITEMS ───────────────────────────────────────
create policy "lead_request_items: admin all"
  on lead_request_items for all
  using (
    exists (
      select 1 from lead_requests lr
      where lr.id = lead_request_items.lead_request_id
        and lr.tenant_id = auth_tenant_id()
    )
  );

-- Anonymous customers can insert items alongside their lead
create policy "lead_request_items: public insert"
  on lead_request_items for insert
  with check (true);

-- ── AI SESSIONS ──────────────────────────────────────────────
create policy "ai_sessions: admin read"
  on ai_sessions for select
  using (tenant_id = auth_tenant_id());

-- Anonymous users can create and update their own session (by token)
create policy "ai_sessions: public insert"
  on ai_sessions for insert
  with check (true);

create policy "ai_sessions: public update own"
  on ai_sessions for update
  using (true);  -- scoped by session_token in app layer

-- ── AI MESSAGES ──────────────────────────────────────────────
create policy "ai_messages: admin read"
  on ai_messages for select
  using (tenant_id = auth_tenant_id());

create policy "ai_messages: public insert"
  on ai_messages for insert
  with check (true);

-- ── AI RECOMMENDATIONS ───────────────────────────────────────
create policy "ai_recommendations: admin read"
  on ai_recommendations for select
  using (tenant_id = auth_tenant_id());

create policy "ai_recommendations: public insert"
  on ai_recommendations for insert
  with check (true);

create policy "ai_recommendations: public update status"
  on ai_recommendations for update
  using (true);  -- scoped by session in app layer

-- ── AUDIT LOGS ───────────────────────────────────────────────
-- Append-only: SELECT and INSERT only. No UPDATE, no DELETE.
create policy "audit_logs: admin read own"
  on audit_logs for select
  using (tenant_id = auth_tenant_id());

-- Insert handled by service role (server-side API routes only)
-- No public insert policy — audit logs are written by the server

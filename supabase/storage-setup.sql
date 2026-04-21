-- ================================================================
-- Storage Setup
--
-- STEP 1 — Create buckets in Supabase Dashboard (preferred):
--   Dashboard → Storage → New bucket
--
--   Bucket 1: "assets"
--     Public:          No (private)
--     File size limit: 10 MB
--     Allowed types:   image/png, image/jpeg, image/webp, image/svg+xml
--
--   Bucket 2: "logos"
--     Public:          Yes
--     File size limit: 2 MB
--     Allowed types:   image/png, image/jpeg, image/svg+xml, image/webp
--
-- STEP 2 — Run THIS file in the Supabase SQL Editor.
--   It creates RLS policies on storage.objects for both buckets.
--   The INSERT INTO storage.buckets lines below are an alternative
--   to the Dashboard UI — run them only if you skipped Step 1.
-- ================================================================

-- ── Optional: create buckets via SQL (skip if done via Dashboard) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'assets', 'assets', false, 10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
  ),
  (
    'logos', 'logos', true, 2097152,
    array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  )
on conflict (id) do nothing;

-- ================================================================
-- RLS POLICIES: assets bucket (private)
-- ================================================================

create policy "Authenticated users can upload to assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'assets');

create policy "Authenticated users can read assets"
  on storage.objects for select to authenticated
  using (bucket_id = 'assets');

create policy "Authenticated users can update assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'assets');

create policy "Authenticated users can delete assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'assets');

-- ================================================================
-- RLS POLICIES: logos bucket (public)
-- ================================================================

create policy "Public read for logos"
  on storage.objects for select to public
  using (bucket_id = 'logos');

create policy "Authenticated users can upload logos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos');

create policy "Authenticated users can update logos"
  on storage.objects for update to authenticated
  using (bucket_id = 'logos');

create policy "Authenticated users can delete logos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'logos');

-- ================================================================
-- Reference
--
-- assets bucket path convention:
--   {tenant_id}/{timestamp}-{original_filename}
--   e.g. a0000000-0000-0000-0000-000000000001/1745000000000-american-base-B24.png
--
-- logos bucket public URL:
--   {SUPABASE_URL}/storage/v1/object/public/logos/{filename}
--   stored in tenants.logo_url
--
-- Note: API routes use the service-role key (createAdminClient) which
-- bypasses RLS entirely — these policies apply to authenticated browser
-- sessions and are a defence-in-depth measure.
-- ================================================================

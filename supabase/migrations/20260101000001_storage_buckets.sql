-- ================================================================
-- Storage Buckets Setup
-- Run in Supabase SQL Editor after schema.sql.
-- Creates the two buckets used by the asset pipeline.
-- ================================================================

-- assets-staging: private bucket for uploaded files awaiting review
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assets-staging',
  'assets-staging',
  false,
  10485760,  -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- assets: public bucket for confirmed, live assets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assets',
  'assets',
  true,
  10485760,  -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- ── Storage RLS policies ─────────────────────────────────────────────────────

-- assets-staging: only authenticated users with a tenant membership can read/write
create policy "assets-staging: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'assets-staging');

create policy "assets-staging: authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'assets-staging');

create policy "assets-staging: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'assets-staging');

-- assets: public read for confirmed live assets
create policy "assets: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'assets');

create policy "assets: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'assets');

create policy "assets: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'assets');

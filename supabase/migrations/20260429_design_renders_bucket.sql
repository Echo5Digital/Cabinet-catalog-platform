-- ================================================================
-- Design Renders Storage Bucket
-- Public bucket for AI-generated kitchen design renders.
-- Images are uploaded server-side via the service role client.
-- ================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'design-renders',
  'design-renders',
  true,
  20971520,  -- 20 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Public read (renders are customer-facing)
create policy "design-renders: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'design-renders');

-- Service role only for uploads (done server-side, no user auth needed)
-- The admin client bypasses RLS, so no insert policy is required for service role.

-- ================================================================
-- Logos Storage Bucket
-- Public bucket for tenant logo images.
-- Referenced by app/api/tenant/logo/route.js
-- ================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  2097152,  -- 2 MB
  array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
on conflict (id) do nothing;

-- Public read — anyone can load the logo image in navbar/footer
create policy "logos: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'logos');

-- Authenticated upload/delete — admin only enforced at API layer
create policy "logos: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos');

create policy "logos: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos');

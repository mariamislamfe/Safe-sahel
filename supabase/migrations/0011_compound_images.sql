-- Safe Sahel — storage bucket for compound cover photos.
--
-- Public bucket (compound cards are shown to everyone browsing locations).
-- Any authenticated user can already insert a compound (0006), so uploads
-- are scoped by uploader folder the same way property-images works, not by
-- compound ownership (compounds don't have an owner_id).

insert into storage.buckets (id, name, public)
values ('compound-images', 'compound-images', true)
on conflict (id) do nothing;

create policy "Compound photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'compound-images');

create policy "Authenticated users upload compound photos under their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'compound-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete their own compound photo uploads"
  on storage.objects for delete
  using (
    bucket_id = 'compound-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

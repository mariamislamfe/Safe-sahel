-- Safe Sahel — storage bucket for property photos.
--
-- Public bucket (photos are meant to be seen by anyone browsing listings);
-- RLS on storage.objects still governs who can upload/delete. Path
-- convention: {owner_id}/{property_id}/{filename} — the owner_id segment is
-- what the policies below check against auth.uid().

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

create policy "Property photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'property-images');

create policy "Owners upload photos under their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners delete their own photos"
  on storage.objects for delete
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'driver-documents',
  'driver-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Allow authenticated uploads to driver documents" on storage.objects;
drop policy if exists "Allow owners and admins to view driver documents" on storage.objects;
drop policy if exists "Allow owners and admins to delete driver documents" on storage.objects;

create policy "Allow authenticated uploads to driver documents"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'driver-documents'
    and owner = auth.uid()
    and (storage.extension(name) = 'jpg' or
         storage.extension(name) = 'jpeg' or
         storage.extension(name) = 'png' or
         storage.extension(name) = 'webp')
  );

create policy "Allow owners and admins to view driver documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'driver-documents'
    and (
      owner = auth.uid()
      or exists (
        select 1 from public.profiles
        where id = auth.uid()
          and role in ('admin', 'moderator')
      )
    )
  );

create policy "Allow owners and admins to delete driver documents"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'driver-documents'
    and (
      owner = auth.uid()
      or exists (
        select 1 from public.profiles
        where id = auth.uid()
          and role in ('admin', 'moderator')
      )
    )
  );

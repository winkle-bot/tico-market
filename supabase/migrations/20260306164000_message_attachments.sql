alter table public.messages
  add column if not exists attachments jsonb default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Allow authenticated uploads to message attachments" on storage.objects;
drop policy if exists "Allow owners to view message attachments" on storage.objects;
drop policy if exists "Allow owners to delete message attachments" on storage.objects;

create policy "Allow authenticated uploads to message attachments"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'message-attachments'
    and owner = auth.uid()
    and (storage.extension(name) = 'jpg' or
         storage.extension(name) = 'jpeg' or
         storage.extension(name) = 'png' or
         storage.extension(name) = 'webp')
  );

create policy "Allow owners to view message attachments"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and owner = auth.uid()
  );

create policy "Allow owners to delete message attachments"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and owner = auth.uid()
  );

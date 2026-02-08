-- Supabase Storage Setup for TicoMarket
-- Run this in Supabase SQL Editor to create the listings bucket

alter table if exists storage.objects enable row level security;

-- Create the listings bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listings',
  'listings',
  true,
  2097152, -- 2MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Allow public access to listings bucket" on storage.objects;
drop policy if exists "Allow authenticated uploads to listings bucket" on storage.objects;
drop policy if exists "Allow users to delete their own images" on storage.objects;

-- Policy: Anyone can view/list images
CREATE POLICY "Allow public access to listings bucket"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'listings');

-- Policy: Authenticated users can upload images
CREATE POLICY "Allow authenticated uploads to listings bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listings'
    AND owner = auth.uid()
    AND (storage.extension(name) = 'jpg' OR 
         storage.extension(name) = 'jpeg' OR 
         storage.extension(name) = 'png' OR 
         storage.extension(name) = 'webp' OR
         storage.extension(name) = 'gif')
  );

-- Policy: Users can delete their own images
CREATE POLICY "Allow users to delete their own images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listings'
    AND owner = auth.uid()
  );

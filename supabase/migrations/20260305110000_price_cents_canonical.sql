-- Make price_cents the canonical price field
-- Set a default and make NOT NULL so all rows have a numeric price
-- The text `price` column is kept for historical data but no longer written by the app

alter table public.listings
  alter column price_cents set default 0,
  alter column price_cents set not null;

-- Backfill any nulls from existing rows (shouldn't be any after migration)
update public.listings set price_cents = 0 where price_cents is null;

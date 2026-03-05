-- Rename listings.type → listings.listing_kind for clarity
-- "type" is too generic; listing_kind distinguishes marketplace listings ('seller') from driver service listings ('driver')

alter table public.listings rename column type to listing_kind;

drop index if exists idx_listings_type;
create index if not exists idx_listings_listing_kind on public.listings(listing_kind);

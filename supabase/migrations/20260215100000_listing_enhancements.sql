-- Migration: Listing Enhancements
-- 1. Fix price data model: add price_cents (integer) + currency enum
-- 2. Add multiple image support via image_urls JSONB array
-- 3. Add condition, item_type fields
-- 4. Add fulfillment_options JSONB for expanded delivery/pickup options

-- ==================== PRICE DATA MODEL FIX ====================

-- Add numeric price field (stores price in smallest unit, e.g. centimos for CRC, cents for USD)
alter table public.listings add column if not exists price_cents integer;

-- Add currency field (default CRC for Costa Rica)
alter table public.listings add column if not exists currency text not null default 'CRC'
  check (currency in ('CRC', 'USD'));

-- Migrate existing price data: parse the text price into cents
-- Handle formats like "₡15,000", "₡5.000", "15000", "$50"
do $$
declare
  r record;
  clean_price text;
  parsed_value numeric;
  detected_currency text;
begin
  for r in select id, price from public.listings where price_cents is null loop
    detected_currency := 'CRC';
    clean_price := r.price;

    -- Detect USD
    if clean_price like '$%' or clean_price ilike '%usd%' then
      detected_currency := 'USD';
    end if;

    -- Strip currency symbols and whitespace
    clean_price := regexp_replace(clean_price, '[₡$a-zA-Z\s]', '', 'g');
    -- Remove thousands separators (both , and .)
    -- If contains both . and , treat last one as decimal
    if clean_price ~ '^\d{1,3}([.,]\d{3})+$' then
      -- Pure thousands-separated number, no decimals
      clean_price := regexp_replace(clean_price, '[.,]', '', 'g');
    else
      clean_price := replace(clean_price, ',', '');
    end if;

    begin
      parsed_value := clean_price::numeric;
    exception when others then
      parsed_value := 0;
    end;

    -- Store as integer (no sub-unit for CRC colones, cents for USD)
    if detected_currency = 'USD' then
      update public.listings set price_cents = (parsed_value * 100)::integer, currency = 'USD' where id = r.id;
    else
      update public.listings set price_cents = parsed_value::integer, currency = 'CRC' where id = r.id;
    end if;
  end loop;
end $$;

-- Set default for future inserts
alter table public.listings alter column price_cents set default 0;

-- ==================== MULTIPLE IMAGES ====================

-- Add JSONB array for multiple image URLs (up to 8)
alter table public.listings add column if not exists image_urls jsonb default '[]'::jsonb;

-- Migrate existing single image_url into the array
update public.listings
set image_urls = jsonb_build_array(image_url)
where image_url is not null
  and image_url != ''
  and (image_urls is null or image_urls = '[]'::jsonb);

-- ==================== LISTING ENHANCEMENTS ====================

-- Condition field
alter table public.listings add column if not exists condition text default 'good'
  check (condition in ('new', 'like_new', 'good', 'fair', 'for_parts'));

-- Item type field
alter table public.listings add column if not exists item_type text default 'physical'
  check (item_type in ('physical', 'food', 'service', 'rental', 'free'));

-- Fulfillment options (replaces simple boolean checkboxes)
-- Stored as JSONB: { "pickup": true, "platform_delivery": true, "seller_delivers": false, "shipping": false, "delivery_fee": null }
alter table public.listings add column if not exists fulfillment_options jsonb default '{"pickup": true, "platform_delivery": true}'::jsonb;

-- Migrate existing pickup_config booleans into fulfillment_options
update public.listings
set fulfillment_options = jsonb_build_object(
  'pickup', coalesce((pickup_config->>'pickupAvailable')::boolean, true),
  'platform_delivery', coalesce((pickup_config->>'deliveryAvailable')::boolean, true),
  'seller_delivers', false,
  'shipping', false
)
where fulfillment_options = '{"pickup": true, "platform_delivery": true}'::jsonb
  and pickup_config is not null
  and pickup_config != '{}'::jsonb;

-- Index for price sorting
create index if not exists idx_listings_price_cents on public.listings(price_cents);
create index if not exists idx_listings_currency on public.listings(currency);
create index if not exists idx_listings_item_type on public.listings(item_type);
create index if not exists idx_listings_condition on public.listings(condition);

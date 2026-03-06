import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { ApiResponse } from '@/lib/api-response';
import type { Listing } from '@/lib/supabase-types';
import type { Json } from '@/lib/database.types';
import { toFrontendListing } from '@/lib/listing-utils';
import { matchesSavedSearch } from '@/lib/saved-searches';
import { formatPrice } from '@/lib/format';
import { parseDisplayPriceToMinorUnits, type PaymentCurrency } from '@/lib/payments';
import { sanitizeText } from '@/lib/security';
import { sendPushToUser } from '@/lib/push';
import { z } from 'zod';

const LISTINGS_BUCKET = 'listings';
const createListingSchema = z.object({
  title: z.string().min(3).max(120),
  priceCents: z.number().int().min(0),
  currency: z.enum(['CRC', 'USD']).default('CRC'),
  category: z.string().min(1).max(60),
  description: z.string().max(3000).default(''),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'for_parts']).default('good'),
  itemType: z.enum(['physical', 'food', 'service', 'rental', 'free']).default('physical'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  listingKind: z.enum(['seller', 'driver']).default('seller'),
  imageUrl: z.string().url().max(2048).nullable().optional(),
});

type ListingSort = 'newest' | 'price_asc' | 'price_desc' | 'distance';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;
const DEFAULT_RADIUS_KM = 20;

function parseListingPrice(
  rawPrice: string,
  rawCurrency: string
): { currency: PaymentCurrency; priceCents: number; legacyPrice: string } {
  const currency: PaymentCurrency = rawCurrency === 'USD' ? 'USD' : 'CRC';
  const priceCents = parseDisplayPriceToMinorUnits(rawPrice, currency);

  return {
    currency,
    priceCents,
    legacyPrice: formatPrice(priceCents, currency),
  };
}

async function notifySavedSearchSubscribers(
  listing: Listing
) {
  const admin = createSupabaseAdminClient();

  const { data: savedSearches, error } = await (admin
    .from('saved_searches') as any)
    .select('*')
    .eq('alert_enabled', true);

  if (error || !savedSearches?.length) {
    return;
  }

  await Promise.allSettled(
    (savedSearches as Record<string, unknown>[])
      .filter((savedSearch) => String(savedSearch.user_id) !== listing.seller_id)
      .filter((savedSearch) =>
        matchesSavedSearch(listing, {
          query: typeof savedSearch.query_text === 'string' ? savedSearch.query_text : null,
          categories: Array.isArray(savedSearch.categories) ? (savedSearch.categories as string[]) : [],
          listingKind:
            savedSearch.listing_kind === 'seller' || savedSearch.listing_kind === 'driver'
              ? savedSearch.listing_kind
              : null,
          minPrice: typeof savedSearch.min_price === 'number' ? savedSearch.min_price : null,
          maxPrice: typeof savedSearch.max_price === 'number' ? savedSearch.max_price : null,
          sort:
            savedSearch.sort === 'price_asc' ||
            savedSearch.sort === 'price_desc' ||
            savedSearch.sort === 'distance' ||
            savedSearch.sort === 'newest'
              ? savedSearch.sort
              : 'newest',
        })
      )
      .map((savedSearch) =>
        sendPushToUser(String(savedSearch.user_id), {
          title: 'New listing match',
          body: `${listing.title} matches your saved search "${String(savedSearch.name || 'Saved search')}"`,
          url: `/listing/${listing.id}`,
        })
      )
  );
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function getDistanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

// GET listings
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const url = new URL(request.url);
    const page = Math.max(
      DEFAULT_PAGE,
      Number.parseInt(url.searchParams.get('page') || String(DEFAULT_PAGE), 10) ||
        DEFAULT_PAGE
    );
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        Number.parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT), 10) ||
          DEFAULT_LIMIT
      )
    );

    const search = (url.searchParams.get('q') || '').trim();
    const categoryValues = [
      ...url.searchParams.getAll('category'),
      ...(url.searchParams.get('categories') || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    ];
    const categories = Array.from(new Set(categoryValues));
    const listingKind = url.searchParams.get('listing_kind') ?? url.searchParams.get('type');

    const minPrice = Number.parseFloat(url.searchParams.get('minPrice') || '');
    const maxPrice = Number.parseFloat(url.searchParams.get('maxPrice') || '');
    const hasMinPrice = Number.isFinite(minPrice);
    const hasMaxPrice = Number.isFinite(maxPrice);

    const lat = Number.parseFloat(url.searchParams.get('lat') || '');
    const lng = Number.parseFloat(url.searchParams.get('lng') || '');
    const radiusKm = Number.parseFloat(url.searchParams.get('radiusKm') || '');
    const hasLocationFilter =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Number.isFinite(radiusKm) &&
      radiusKm > 0;
    const safeRadiusKm = hasLocationFilter ? radiusKm : DEFAULT_RADIUS_KM;

    const requestedSort = (url.searchParams.get('sort') || 'newest') as ListingSort;
    const sort: ListingSort =
      requestedSort === 'price_asc' ||
      requestedSort === 'price_desc' ||
      requestedSort === 'distance'
        ? requestedSort
        : 'newest';

    const hasQueryParams = url.searchParams.toString().length > 0;
    const useInMemoryFiltering =
      hasMinPrice || hasMaxPrice || hasLocationFilter || sort !== 'newest';

    let query = supabase
      .from('listings')
      .select('*', { count: 'exact' });

    if (search) {
      const escapedSearch = search.replace(/,/g, ' ');
      query = query.or(`title.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
    }
    if (categories.length > 0) {
      query = query.in('category', categories);
    }
    if (listingKind === 'seller' || listingKind === 'driver') {
      query = query.eq('listing_kind', listingKind);
    }

    // Filter out expired listings (unless ?includeExpired=true)
    if (url.searchParams.get('includeExpired') !== 'true') {
      query = query.or('expires_at.is.null,expires_at.gte.' + new Date().toISOString());
    }

    if (useInMemoryFiltering) {
      const { data: listings, error } = await query.order('created_at', { ascending: false });
      if (error) {
        return ApiResponse.error(error.message, 500);
      }

      const typedListings = (listings || []) as unknown as Listing[];
      let filtered = typedListings;

      if (hasMinPrice) {
        filtered = filtered.filter((listing) => (listing.price_cents ?? 0) >= minPrice);
      }
      if (hasMaxPrice) {
        filtered = filtered.filter((listing) => (listing.price_cents ?? 0) <= maxPrice);
      }
      if (hasLocationFilter) {
        filtered = filtered.filter((listing) => {
          const distanceKm = getDistanceKm(
            lat,
            lng,
            listing.location_lat,
            listing.location_lng
          );
          return distanceKm <= safeRadiusKm;
        });
      }

      if (sort === 'price_asc') {
        filtered = [...filtered].sort((a, b) => (a.price_cents ?? 0) - (b.price_cents ?? 0));
      } else if (sort === 'price_desc') {
        filtered = [...filtered].sort((a, b) => (b.price_cents ?? 0) - (a.price_cents ?? 0));
      } else if (sort === 'distance' && Number.isFinite(lat) && Number.isFinite(lng)) {
        filtered = [...filtered].sort((a, b) => {
          const aDistance = getDistanceKm(lat, lng, a.location_lat, a.location_lng);
          const bDistance = getDistanceKm(lat, lng, b.location_lat, b.location_lng);
          return aDistance - bDistance;
        });
      }

      const total = filtered.length;
      const start = (page - 1) * limit;
      const paged = filtered.slice(start, start + limit);
      const transformed = paged.map(toFrontendListing);

      if (!hasQueryParams) {
        return ApiResponse.cached(transformed);
      }

      return ApiResponse.cached({
        data: transformed,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          hasNextPage: start + limit < total,
          hasPrevPage: page > 1,
        },
      });
    }

    const rangeStart = (page - 1) * limit;
    const rangeEnd = rangeStart + limit - 1;
    const { data: listings, error, count } = await query
      .order('created_at', { ascending: false })
      .range(rangeStart, rangeEnd);

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    const typedListings = (listings || []) as unknown as Listing[];
    const transformed = typedListings.map(toFrontendListing);

    if (!hasQueryParams) {
      return ApiResponse.cached(transformed);
    }

    const total = count ?? transformed.length;
    return ApiResponse.cached({
      data: transformed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: rangeEnd + 1 < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// POST new listing
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return ApiResponse.unauthorized('Must be logged in to create listings');
    }

    const formData = await request.formData();
    
    // Handle file upload if present
    const image = formData.get('image') as File | null;
    let imageUrl = formData.get('imageUrl') as string | null;
    
    if (image && image.size > 0) {
      // Check file size (2MB limit)
      if (image.size > 2 * 1024 * 1024) {
        return ApiResponse.error('Image must be smaller than 2MB', 400);
      }
      
      const fileExt = image.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from(LISTINGS_BUCKET)
        .upload(fileName, image);
      
      if (uploadError) {
        return ApiResponse.error('Image upload failed', 400, uploadError.name, uploadError.message);
      }

      if (!uploadData?.path) {
        return ApiResponse.error('Image upload failed', 500, 'UPLOAD_PATH_MISSING');
      }

      const { data: { publicUrl } } = supabase
        .storage
        .from(LISTINGS_BUCKET)
        .getPublicUrl(uploadData.path);
      imageUrl = publicUrl;
    }

    // Get user profile for owner name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, verified')
      .eq('id', user.id)
      .single() as { data: { name: string; verified: boolean } | null };

    const rawTitle = String(formData.get('title') ?? '');
    const rawPrice = String(formData.get('price') ?? '');
    const rawCurrency = String(formData.get('currency') ?? 'CRC');
    const rawCategory = String(formData.get('category') ?? '');
    const rawDescription = String(formData.get('description') ?? '');
    const rawCondition = String(formData.get('condition') ?? 'good');
    const rawItemType = String(formData.get('itemType') ?? 'physical');
    const rawLat = Number(formData.get('lat') ?? 9.9281);
    const rawLng = Number(formData.get('lng') ?? -84.0907);
    const rawListingKind = String(formData.get('listing_kind') ?? formData.get('type') ?? 'seller');
    const pickupConfigStr = formData.get('pickupConfig') as string;
    const fulfillmentStr = formData.get('fulfillmentOptions') as string;

    let normalizedPrice: ReturnType<typeof parseListingPrice>;
    try {
      normalizedPrice = parseListingPrice(rawPrice, rawCurrency);
    } catch (error) {
      return ApiResponse.badRequest(
        error instanceof Error ? error.message : 'Invalid price amount'
      );
    }

    const parsed = createListingSchema.safeParse({
      title: sanitizeText(rawTitle, 120),
      priceCents: normalizedPrice.priceCents,
      currency: normalizedPrice.currency,
      category: sanitizeText(rawCategory, 60),
      description: sanitizeText(rawDescription, 3000),
      condition: rawCondition,
      itemType: rawItemType,
      lat: rawLat,
      lng: rawLng,
      listingKind: rawListingKind,
      imageUrl,
    });

    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid listing payload', parsed.error.flatten());
    }

    const { title, priceCents: validatedPriceCents, currency, category, description, condition, itemType, lat, lng, listingKind } = parsed.data;

    let pickupConfig: Record<string, unknown> = {};
    if (pickupConfigStr) {
      try {
        const parsedPickupConfig = JSON.parse(pickupConfigStr);
        if (parsedPickupConfig && typeof parsedPickupConfig === 'object') {
          pickupConfig = parsedPickupConfig as Record<string, unknown>;
        }
      } catch {
        return ApiResponse.badRequest('Invalid pickupConfig payload');
      }
    }

    let fulfillmentOptions: Record<string, unknown> = { pickup: true, platform_delivery: true };
    if (fulfillmentStr) {
      try {
        const parsedFulfillment = JSON.parse(fulfillmentStr);
        if (parsedFulfillment && typeof parsedFulfillment === 'object') {
          fulfillmentOptions = parsedFulfillment as Record<string, unknown>;
        }
      } catch {
        // Use defaults
      }
    }

    // Handle multiple images
    const imageUrlsArr: string[] = [];
    if (imageUrl) imageUrlsArr.push(imageUrl);

    // Check for additional images (image_1, image_2, etc.)
    for (let i = 1; i <= 7; i++) {
      const extraImage = formData.get(`image_${i}`) as File | null;
      if (extraImage && extraImage.size > 0) {
        if (extraImage.size > 2 * 1024 * 1024) continue;
        const ext = extraImage.name.split('.').pop();
        const name = `${user.id}/${Date.now()}_${i}.${ext}`;
        const { data: upData, error: upErr } = await supabase.storage
          .from(LISTINGS_BUCKET)
          .upload(name, extraImage);
        if (!upErr && upData?.path) {
          const { data: { publicUrl } } = supabase.storage.from(LISTINGS_BUCKET).getPublicUrl(upData.path);
          imageUrlsArr.push(publicUrl);
        }
      }
    }

    const { data: listing, error } = await (supabase
      .from('listings') as any)
      .insert({
        seller_id: user.id,
        title,
        description,
        price: normalizedPrice.legacyPrice,
        price_cents: validatedPriceCents,
        currency,
        category,
        condition,
        item_type: itemType,
        location_lat: lat,
        location_lng: lng,
        listing_kind: listingKind,
        owner: sanitizeText(profile?.name || user.email?.split('@')[0] || 'Unknown', 100),
        image_url: imageUrl,
        image_urls: imageUrlsArr,
        fulfillment_options: fulfillmentOptions as Json,
        verified: profile?.verified || false,
        pickup_config: pickupConfig as Json,
      })
      .select()
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    const typedListing = listing as unknown as Listing;
    void notifySavedSearchSubscribers(typedListing);
    return ApiResponse.success(toFrontendListing(typedListing), 201);
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/listings', method: 'POST' });
  }
}

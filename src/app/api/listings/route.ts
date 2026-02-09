import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import type { Listing, FrontendListing } from '@/lib/supabase-types';
import type { Json } from '@/lib/database.types';
import { sanitizeText } from '@/lib/security';
import { z } from 'zod';

const LISTINGS_BUCKET = 'listings';
const createListingSchema = z.object({
  title: z.string().min(3).max(120),
  price: z.string().min(1).max(50),
  category: z.string().min(1).max(60),
  description: z.string().max(3000).default(''),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: z.enum(['seller', 'driver']).default('seller'),
  imageUrl: z.string().url().max(2048).nullable().optional(),
});

type ListingSort = 'newest' | 'price_asc' | 'price_desc' | 'distance';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;
const DEFAULT_RADIUS_KM = 20;

function parsePriceValue(price: string): number {
  const normalized = price.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
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

function toFrontendListing(listing: Listing): FrontendListing {
  return {
    id: listing.id,
    sellerId: listing.seller_id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    category: listing.category,
    location: [listing.location_lat, listing.location_lng],
    rating: listing.rating,
    type: listing.type,
    owner: listing.owner,
    imageUrl: listing.image_url,
    verified: listing.verified,
    moderationStatus: listing.moderation_status ?? 'active',
    privateKey: listing.private_key,
    pickupConfig: listing.pickup_config,
    createdAt: listing.created_at,
  };
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
    const type = url.searchParams.get('type');

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
    if (type === 'seller' || type === 'driver') {
      query = query.eq('type', type);
    }

    if (useInMemoryFiltering) {
      const { data: listings, error } = await query.order('created_at', { ascending: false });
      if (error) {
        return ApiResponse.error(error.message, 500);
      }

      const typedListings = (listings || []) as unknown as Listing[];
      let filtered = typedListings;

      if (hasMinPrice) {
        filtered = filtered.filter((listing) => parsePriceValue(listing.price) >= minPrice);
      }
      if (hasMaxPrice) {
        filtered = filtered.filter((listing) => parsePriceValue(listing.price) <= maxPrice);
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
        filtered = [...filtered].sort(
          (a, b) => parsePriceValue(a.price) - parsePriceValue(b.price)
        );
      } else if (sort === 'price_desc') {
        filtered = [...filtered].sort(
          (a, b) => parsePriceValue(b.price) - parsePriceValue(a.price)
        );
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
        return ApiResponse.success(transformed);
      }

      return ApiResponse.success({
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
    const transformed: FrontendListing[] = typedListings.map(toFrontendListing);

    if (!hasQueryParams) {
      return ApiResponse.success(transformed);
    }

    const total = count ?? transformed.length;
    return ApiResponse.success({
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
    const rawCategory = String(formData.get('category') ?? '');
    const rawDescription = String(formData.get('description') ?? '');
    const rawLat = Number(formData.get('lat') ?? 9.9281);
    const rawLng = Number(formData.get('lng') ?? -84.0907);
    const rawType = String(formData.get('type') ?? 'seller');
    const pickupConfigStr = formData.get('pickupConfig') as string;

    const parsed = createListingSchema.safeParse({
      title: sanitizeText(rawTitle, 120),
      price: sanitizeText(rawPrice, 50),
      category: sanitizeText(rawCategory, 60),
      description: sanitizeText(rawDescription, 3000),
      lat: rawLat,
      lng: rawLng,
      type: rawType,
      imageUrl,
    });

    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid listing payload', parsed.error.flatten());
    }

    const { title, price, category, description, lat, lng, type } = parsed.data;

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

    const { data: listing, error } = await (supabase
      .from('listings') as any)
      .insert({
        seller_id: user.id,
        title,
        description,
        price,
        category,
        location_lat: lat,
        location_lng: lng,
        type,
        owner: sanitizeText(profile?.name || user.email?.split('@')[0] || 'Unknown', 100),
        image_url: imageUrl,
        verified: profile?.verified || false,
        pickup_config: pickupConfig as Json,
      })
      .select()
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    const typedListing = listing as unknown as Listing;
    return ApiResponse.success({
      id: typedListing.id,
      sellerId: typedListing.seller_id,
      title: typedListing.title,
      description: typedListing.description,
      price: typedListing.price,
      category: typedListing.category,
      location: [typedListing.location_lat, typedListing.location_lng],
      rating: typedListing.rating,
      type: typedListing.type,
      owner: typedListing.owner,
      imageUrl: typedListing.image_url,
      verified: typedListing.verified,
      moderationStatus: typedListing.moderation_status,
      privateKey: typedListing.private_key,
      pickupConfig: typedListing.pickup_config,
    }, 201);
  } catch (error) {
    console.error('Listings POST error:', error);
    return ApiResponse.serverError(error);
  }
}

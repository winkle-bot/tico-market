import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import type { Listing, FrontendListing } from '@/lib/supabase-types';
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

// GET all listings
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('moderation_status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    // Transform to match frontend format
    const typedListings = listings as unknown as Listing[];
    const transformed: FrontendListing[] = typedListings.map(l => ({
      id: l.id,
      sellerId: l.seller_id,
      title: l.title,
      description: l.description,
      price: l.price,
      category: l.category,
      location: [l.location_lat, l.location_lng],
      rating: l.rating,
      type: l.type,
      owner: l.owner,
      imageUrl: l.image_url,
      verified: l.verified,
      moderationStatus: l.moderation_status,
      privateKey: l.private_key,
      pickupConfig: l.pickup_config,
      createdAt: l.created_at,
    }));

    return ApiResponse.success(transformed);
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
        pickup_config: pickupConfig,
      })
      .select()
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({
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
      moderationStatus: listing.moderation_status,
      privateKey: listing.private_key,
      pickupConfig: listing.pickup_config,
    }, 201);
  } catch (error) {
    console.error('Listings POST error:', error);
    return ApiResponse.serverError(error);
  }
}

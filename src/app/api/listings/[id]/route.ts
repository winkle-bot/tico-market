import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import type { Listing } from '@/lib/supabase-types';
import { toFrontendListing } from '@/lib/listing-utils';
import { sanitizeText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const LISTINGS_BUCKET = 'listings';
const listingIdSchema = z.coerce.number().int().positive();
const updateListingSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(3000).optional(),
  priceCents: z.number().int().min(0).optional(),
  category: z.string().min(1).max(60).optional(),
  pickupConfig: z.record(z.unknown()).optional(),
  imageUrl: z.string().url().max(2048).nullable().optional(),
  location: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]).optional(),
});

// GET single listing
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const parsedListingId = listingIdSchema.safeParse(id);
    if (!parsedListingId.success) {
      return ApiResponse.badRequest('Invalid listing id');
    }
    const listingId = parsedListingId.data;

    const { data: listing, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return ApiResponse.error('Listing not found', 404);
      }
      return ApiResponse.error(error.message, 500);
    }

    const transformed = toFrontendListing(listing as unknown as Listing);

    return ApiResponse.cached(transformed, 30);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// PUT update listing
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const parsedListingId = listingIdSchema.safeParse(id);
    if (!parsedListingId.success) {
      return ApiResponse.badRequest('Invalid listing id');
    }
    const listingId = parsedListingId.data;
    
    // Check if multipart form data or JSON
    const contentType = request.headers.get('content-type') || '';
    let updates: Record<string, unknown> = {};
    let imageUrl: string | undefined;
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const image = formData.get('image') as File | null;
      
      // Handle image upload
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
      
      // Parse other form fields
      let pickupConfig: Record<string, unknown> = {};
      const pickupConfigRaw = formData.get('pickupConfig');
      if (typeof pickupConfigRaw === 'string' && pickupConfigRaw.trim().length > 0) {
        try {
          const parsedPickupConfig = JSON.parse(pickupConfigRaw);
          if (parsedPickupConfig && typeof parsedPickupConfig === 'object') {
            pickupConfig = parsedPickupConfig as Record<string, unknown>;
          }
        } catch {
          return ApiResponse.badRequest('Invalid pickupConfig payload');
        }
      }

      const rawPriceForm = formData.get('price');
      const priceNumericForm = rawPriceForm ? Number.parseInt(String(rawPriceForm).replace(/[^0-9]/g, ''), 10) : undefined;
      updates = {
        title: typeof formData.get('title') === 'string' ? sanitizeText(String(formData.get('title')), 120) : undefined,
        description: typeof formData.get('description') === 'string' ? sanitizeText(String(formData.get('description')), 3000) : undefined,
        priceCents: Number.isFinite(priceNumericForm) ? priceNumericForm : undefined,
        category: typeof formData.get('category') === 'string' ? sanitizeText(String(formData.get('category')), 60) : undefined,
        pickupConfig,
        imageUrl,
      };
    } else {
      const body = await readJsonBody(request);
      const bodyObj = (body && typeof body === 'object') ? (body as Record<string, unknown>) : {};
      updates = {
        title: typeof bodyObj.title === 'string' ? sanitizeText(bodyObj.title, 120) : bodyObj.title,
        description: typeof bodyObj.description === 'string' ? sanitizeText(bodyObj.description, 3000) : bodyObj.description,
        priceCents: typeof bodyObj.priceCents === 'number' ? bodyObj.priceCents : undefined,
        category: typeof bodyObj.category === 'string' ? sanitizeText(bodyObj.category, 60) : bodyObj.category,
        pickupConfig: bodyObj.pickupConfig,
        imageUrl: bodyObj.imageUrl,
        location: bodyObj.location,
      };
    }

    const parsedUpdates = updateListingSchema.safeParse(updates);
    if (!parsedUpdates.success) {
      return ApiResponse.badRequest('Invalid listing update payload', parsedUpdates.error.flatten());
    }
    const safeUpdates = parsedUpdates.data;

    // Verify ownership
    const { data: existing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', listingId)
      .single();

    if (!existing) {
      return ApiResponse.error('Listing not found', 404);
    }

    const typedExisting = existing as { seller_id: string };
    if (typedExisting.seller_id !== user.id) {
      return ApiResponse.unauthorized('Not authorized to update this listing');
    }

    // Build update object
    const updateData: any = {};
    if (safeUpdates.title !== undefined) updateData.title = safeUpdates.title;
    if (safeUpdates.description !== undefined) updateData.description = safeUpdates.description;
    if (safeUpdates.priceCents !== undefined) updateData.price_cents = safeUpdates.priceCents;
    if (safeUpdates.category !== undefined) updateData.category = safeUpdates.category;
    if (safeUpdates.pickupConfig !== undefined) updateData.pickup_config = safeUpdates.pickupConfig;
    if (safeUpdates.imageUrl !== undefined && safeUpdates.imageUrl !== null) updateData.image_url = safeUpdates.imageUrl;
    if (safeUpdates.location) {
      updateData.location_lat = safeUpdates.location[0];
      updateData.location_lng = safeUpdates.location[1];
    }

    const { data: listing, error } = await (supabase
      .from('listings') as any)
      .update(updateData)
      .eq('id', listingId)
      .select()
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    const transformed = toFrontendListing(listing as unknown as Listing);

    return ApiResponse.success(transformed);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

// PATCH bump listing (renew expiry)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const parsedListingId = listingIdSchema.safeParse(id);
    if (!parsedListingId.success) {
      return ApiResponse.badRequest('Invalid listing id');
    }
    const listingId = parsedListingId.data;

    const { data: existing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', listingId)
      .single();

    if (!existing) {
      return ApiResponse.error('Listing not found', 404);
    }

    const typedExisting = existing as { seller_id: string };
    if (typedExisting.seller_id !== user.id) {
      return ApiResponse.unauthorized('Not authorized to bump this listing');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { error } = await (supabase.from('listings') as any)
      .update({
        expires_at: expiresAt.toISOString(),
        last_bumped_at: now.toISOString(),
      })
      .eq('id', listingId);

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({ message: 'Listing bumped', expiresAt: expiresAt.toISOString() });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// DELETE listing
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const parsedListingId = listingIdSchema.safeParse(id);
    if (!parsedListingId.success) {
      return ApiResponse.badRequest('Invalid listing id');
    }
    const listingId = parsedListingId.data;

    // Verify ownership (check either from body or from DB)
    const { data: existing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', listingId)
      .single();

    if (!existing) {
      return ApiResponse.error('Listing not found', 404);
    }

    const typedExisting = existing as { seller_id: string };
    if (typedExisting.seller_id !== user.id) {
      return ApiResponse.unauthorized('Not authorized to delete this listing');
    }

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId);

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({ message: 'Listing deleted' });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

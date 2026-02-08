import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import type { Listing, FrontendListing } from '@/lib/supabase-types';

const LISTINGS_BUCKET = 'listings';

// GET single listing
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const listingId = parseInt(id);

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

    // Transform to match frontend format
    const typedListing = listing as unknown as Listing;
    const transformed: FrontendListing = {
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
      privateKey: typedListing.private_key,
      pickupConfig: typedListing.pickup_config,
      createdAt: typedListing.created_at,
    };

    return ApiResponse.success(transformed);
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

    const listingId = parseInt(id);
    
    // Check if multipart form data or JSON
    const contentType = request.headers.get('content-type') || '';
    let updates: any = {};
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
      updates = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        price: formData.get('price') as string,
        category: formData.get('category') as string,
        pickupConfig: JSON.parse(formData.get('pickupConfig') as string || '{}'),
        imageUrl,
      };
    } else {
      updates = await request.json();
    }

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
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.pickupConfig !== undefined) updateData.pickup_config = updates.pickupConfig;
    if (updates.imageUrl !== undefined && updates.imageUrl !== null) updateData.image_url = updates.imageUrl;
    if (updates.location) {
      updateData.location_lat = updates.location[0];
      updateData.location_lng = updates.location[1];
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

    const typedListing = listing as unknown as Listing;
    const transformed: FrontendListing = {
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
      privateKey: typedListing.private_key,
      pickupConfig: typedListing.pickup_config,
      createdAt: typedListing.created_at,
    };

    return ApiResponse.success(transformed);
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

    const listingId = parseInt(id);

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

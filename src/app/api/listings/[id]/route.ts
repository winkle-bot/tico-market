import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';

// GET single listing
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const id = parseInt(params.id);

    const { data: listing, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return ApiResponse.error('Listing not found', 404);
      }
      return ApiResponse.error(error.message, 500);
    }

    // Transform to match frontend format
    const transformed = {
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
      privateKey: listing.private_key,
      pickupConfig: listing.pickup_config,
      createdAt: listing.created_at,
    };

    return ApiResponse.success(transformed);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// PUT update listing
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const id = parseInt(params.id);
    
    // Check if multipart form data or JSON
    const contentType = request.headers.get('content-type') || '';
    let updates: any = {};
    let imageUrl: string | undefined;
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const image = formData.get('image') as File | null;
      
      // Handle image upload
      if (image && image.size > 0) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase
          .storage
          .from('listings')
          .upload(fileName, image);
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase
            .storage
            .from('listings')
            .getPublicUrl(fileName);
          imageUrl = publicUrl;
        }
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
      .eq('id', id)
      .single();

    if (!existing) {
      return ApiResponse.error('Listing not found', 404);
    }

    if (existing.seller_id !== session.user.id) {
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

    const { data: listing, error } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', id)
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
      privateKey: listing.private_key,
      pickupConfig: listing.pickup_config,
    });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// DELETE listing
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const id = parseInt(params.id);
    const { sellerId } = await request.json().catch(() => ({}));

    // Verify ownership (check either from body or from DB)
    const { data: existing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return ApiResponse.error('Listing not found', 404);
    }

    if (existing.seller_id !== session.user.id) {
      return ApiResponse.unauthorized('Not authorized to delete this listing');
    }

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({ message: 'Listing deleted' });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

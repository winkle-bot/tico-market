import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';

// GET user profile
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        favorites:favorites(listing_id)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return ApiResponse.error('User not found', 404);
      }
      return ApiResponse.error(error.message, 500);
    }

    // Format favorites as array of IDs
    const favorites = profile.favorites?.map((f: any) => f.listing_id) || [];

    return ApiResponse.success({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      bio: profile.bio,
      location: profile.location,
      rating: profile.rating,
      verified: profile.verified,
      joined: profile.joined,
      pickupLocations: profile.pickup_locations,
      acceptsDelivery: profile.accepts_delivery,
      favorites,
    });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// PATCH update user
export async function PATCH(
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

    // Users can only update their own profile
    if (session.user.id !== params.id) {
      return ApiResponse.unauthorized('Not authorized to update this profile');
    }

    const body = await request.json();

    // Handle toggleFavorite action
    if (body.action === 'toggleFavorite') {
      const { listingId } = body;
      
      // Check if favorite exists
      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', params.id)
        .eq('listing_id', listingId)
        .single();

      if (existing) {
        // Remove favorite
        await supabase
          .from('favorites')
          .delete()
          .eq('id', existing.id);
      } else {
        // Add favorite
        await supabase
          .from('favorites')
          .insert({ user_id: params.id, listing_id: listingId });
      }

      // Return updated favorites
      const { data: favorites } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', params.id);

      return ApiResponse.success({
        favorites: favorites?.map((f: any) => f.listing_id) || []
      });
    }

    // Regular profile update
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.pickupLocations !== undefined) updateData.pickup_locations = body.pickupLocations;
    if (body.acceptsDelivery !== undefined) updateData.accepts_delivery = body.acceptsDelivery;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({
      id: profile.id,
      name: profile.name,
      bio: profile.bio,
      location: profile.location,
      pickupLocations: profile.pickup_locations,
      acceptsDelivery: profile.accepts_delivery,
    });
  } catch (error) {
    console.error('User PATCH error:', error);
    return ApiResponse.serverError(error);
  }
}

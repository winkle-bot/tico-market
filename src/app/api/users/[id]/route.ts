import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import type { ProfileWithFavorites, FrontendProfile } from '@/lib/supabase-types';

// GET user profile
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        favorites:favorites(listing_id)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return ApiResponse.error('User not found', 404);
      }
      return ApiResponse.error(error.message, 500);
    }

    // Format favorites as array of IDs
    const typedProfile = profile as unknown as ProfileWithFavorites;
    const favorites = typedProfile.favorites?.map((f: { listing_id: number }) => f.listing_id) || [];

    const transformed: FrontendProfile = {
      id: typedProfile.id,
      email: typedProfile.email,
      name: typedProfile.name,
      bio: typedProfile.bio,
      location: typedProfile.location,
      rating: typedProfile.rating,
      verified: typedProfile.verified,
      joined: typedProfile.joined,
      pickupLocations: typedProfile.pickup_locations,
      acceptsDelivery: typedProfile.accepts_delivery,
      createdAt: typedProfile.created_at,
      updatedAt: typedProfile.updated_at,
      favorites,
    };

    return ApiResponse.success(transformed);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// PATCH update user
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    // Users can only update their own profile
    if (session.user.id !== id) {
      return ApiResponse.unauthorized('Not authorized to update this profile');
    }

    const body = await request.json();

    // Handle toggleFavorite action
    if (body.action === 'toggleFavorite') {
      const { listingId } = body;
      
      // Check if favorite exists
      const { data: existing } = await (supabase
        .from('favorites') as any)
        .select('id')
        .eq('user_id', id)
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
        await (supabase
          .from('favorites') as any)
          .insert({ user_id: id, listing_id: listingId });
      }

      // Return updated favorites
      const { data: favorites } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', id);

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

    const { data: profile, error } = await (supabase
      .from('profiles') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    const typedProfile = profile as unknown as ProfileWithFavorites;
    return ApiResponse.success({
      id: typedProfile.id,
      name: typedProfile.name,
      bio: typedProfile.bio,
      location: typedProfile.location,
      pickupLocations: typedProfile.pickup_locations,
      acceptsDelivery: typedProfile.accepts_delivery,
    });
  } catch (error) {
    console.error('User PATCH error:', error);
    return ApiResponse.serverError(error);
  }
}

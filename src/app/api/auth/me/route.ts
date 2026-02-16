import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import type { ProfileWithFavorites, FrontendProfile } from '@/lib/supabase-types';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return ApiResponse.unauthorized('Not authenticated');
    }

    // Get user profile with favorites
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        favorites:favorites(listing_id)
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      return ApiResponse.error(profileError.message, 500);
    }

    // Format favorites as array of IDs
    const typedProfile = profile as unknown as ProfileWithFavorites;
    const favorites = typedProfile.favorites?.map((f: { listing_id: number }) => f.listing_id) || [];

    // Transform to frontend format
    const transformed: FrontendProfile = {
      id: typedProfile.id,
      email: typedProfile.email,
      name: typedProfile.name,
      bio: typedProfile.bio,
      location: typedProfile.location,
      rating: typedProfile.rating,
      verified: typedProfile.verified,
      role: typedProfile.role as 'user' | 'admin' | 'moderator',
      joined: typedProfile.joined,
      pickupLocations: typedProfile.pickup_locations,
      acceptsDelivery: typedProfile.accepts_delivery,
      avgResponseMinutes: (typedProfile as any).avg_response_minutes ?? null,
      totalTransactions: (typedProfile as any).total_transactions ?? 0,
      landmarkDirections: (typedProfile as any).landmark_directions ?? null,
      verificationBadges: Array.isArray((typedProfile as any).verification_badges) ? (typedProfile as any).verification_badges : [],
      createdAt: typedProfile.created_at,
      updatedAt: typedProfile.updated_at,
      favorites
    };

    return ApiResponse.success(transformed);
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/auth/me', method: 'GET' });
  }
}

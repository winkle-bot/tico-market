import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import type { ProfileWithFavorites, FrontendProfile } from '@/lib/supabase-types';
import { sanitizeOptionalText, sanitizeText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const userIdSchema = z.string().uuid();
const toggleFavoriteSchema = z.object({
  action: z.literal('toggleFavorite'),
  listingId: z.coerce.number().int().positive(),
});
const profileUpdateSchema = z.object({
  action: z.string().optional(),
  name: z.string().max(100).optional(),
  bio: z.string().max(1000).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  pickupLocations: z.array(z.record(z.unknown())).optional(),
  acceptsDelivery: z.boolean().optional(),
});

// GET user profile
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const parsedUserId = userIdSchema.safeParse(id);
    if (!parsedUserId.success) {
      return ApiResponse.badRequest('Invalid user id');
    }
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        favorites:favorites(listing_id)
      `)
      .eq('id', parsedUserId.data)
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

    // Only include email when viewing own profile
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const isOwnProfile = currentUser?.id === parsedUserId.data;

    const transformed: FrontendProfile = {
      id: typedProfile.id,
      ...(isOwnProfile ? { email: typedProfile.email } : {}),
      name: typedProfile.name,
      bio: typedProfile.bio,
      location: typedProfile.location,
      rating: typedProfile.rating,
      verified: typedProfile.verified,
      role: typedProfile.role as 'user' | 'admin' | 'moderator',
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
    const parsedUserId = userIdSchema.safeParse(id);
    if (!parsedUserId.success) {
      return ApiResponse.badRequest('Invalid user id');
    }
    const safeUserId = parsedUserId.data;
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    // Users can only update their own profile
    if (user.id !== safeUserId) {
      return ApiResponse.unauthorized('Not authorized to update this profile');
    }

    const body = await readJsonBody(request);

    // Handle toggleFavorite action
    if (body && typeof body === 'object' && (body as { action?: string }).action === 'toggleFavorite') {
      const parsedToggle = toggleFavoriteSchema.safeParse(body);
      if (!parsedToggle.success) {
        return ApiResponse.badRequest('Invalid toggle favorite payload', parsedToggle.error.flatten());
      }
      const { listingId } = parsedToggle.data;
      
      // Check if favorite exists
      const { data: existing } = await (supabase
        .from('favorites') as any)
        .select('id')
        .eq('user_id', safeUserId)
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
          .insert({ user_id: safeUserId, listing_id: listingId });
      }

      // Return updated favorites
      const { data: favorites } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', safeUserId);

      return ApiResponse.success({
        favorites: favorites?.map((f: any) => f.listing_id) || []
      });
    }

    // Regular profile update
    const parsedProfileUpdate = profileUpdateSchema.safeParse(body);
    if (!parsedProfileUpdate.success) {
      return ApiResponse.badRequest('Invalid profile update payload', parsedProfileUpdate.error.flatten());
    }

    const updateData: Record<string, unknown> = {};
    const payload = parsedProfileUpdate.data;
    if (payload.name !== undefined) updateData.name = sanitizeText(payload.name, 100);
    if (payload.bio !== undefined) updateData.bio = sanitizeOptionalText(payload.bio, 1000);
    if (payload.location !== undefined) updateData.location = sanitizeOptionalText(payload.location, 120);
    if (payload.pickupLocations !== undefined) updateData.pickup_locations = payload.pickupLocations;
    if (payload.acceptsDelivery !== undefined) updateData.accepts_delivery = payload.acceptsDelivery;

    const { data: profile, error } = await (supabase
      .from('profiles') as any)
      .update(updateData)
      .eq('id', safeUserId)
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
      role: typedProfile.role as 'user' | 'admin' | 'moderator',
      pickupLocations: typedProfile.pickup_locations,
      acceptsDelivery: typedProfile.accepts_delivery,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    console.error('User PATCH error:', error);
    return ApiResponse.serverError(error);
  }
}

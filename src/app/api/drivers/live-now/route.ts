/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const liveNowSchema = z.object({
  isOnline: z.boolean(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await readJsonBody(request);
    const parsed = liveNowSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid payload', parsed.error.flatten());
    }

    const { isOnline, lat, lng } = parsed.data;

    // When going live, location is required
    if (isOnline && (lat === undefined || lng === undefined)) {
      return ApiResponse.badRequest('Location is required when going live');
    }

    const { data: driverProfile } = await (supabase
      .from('driver_profiles') as any)
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!driverProfile) {
      return ApiResponse.badRequest('You must become a driver first');
    }

    const updateData: Record<string, unknown> = {
      is_online: isOnline,
      updated_at: new Date().toISOString(),
    };

    if (isOnline && lat !== undefined && lng !== undefined) {
      updateData.current_lat = lat;
      updateData.current_lng = lng;
    }

    if (!isOnline) {
      updateData.current_lat = null;
      updateData.current_lng = null;
    }

    const { error } = await (supabase
      .from('driver_profiles') as any)
      .update(updateData)
      .eq('id', driverProfile.id);

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({
      isOnline,
      message: isOnline ? 'You are now live and accepting deliveries!' : 'You are now offline.',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/drivers/live-now', method: 'POST' });
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import type { Database } from '@/lib/database.types';
import { createSignedDriverDocumentUrl } from '@/lib/driver-documents';
import { sanitizeOptionalText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const updateDriverSchema = z.object({
  vehicleType: z.enum(['motorcycle', 'car', 'pickup', 'bike', 'walker']).nullable().optional(),
  capacityDescription: z.string().max(200).nullable().optional(),
  specialties: z.array(z.string().min(1).max(32)).max(20).optional(),
  serviceRadiusKm: z.number().int().min(1).max(200).optional(),
  baseLocationLat: z.number().min(-90).max(90).nullable().optional(),
  baseLocationLng: z.number().min(-180).max(180).nullable().optional(),
  currentLat: z.number().min(-90).max(90).nullable().optional(),
  currentLng: z.number().min(-180).max(180).nullable().optional(),
  isOnline: z.boolean().optional(),
  liveNow: z.boolean().optional(),
});

type DriverProfileRow = Database['public']['Tables']['driver_profiles']['Row'];

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const { data, error } = await (supabase
      .from('driver_profiles') as any)
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return ApiResponse.notFound('Driver profile not found');
    }

    const typedData = data as DriverProfileRow;
    const signedFaceImageUrl = await createSignedDriverDocumentUrl(
      supabase,
      typedData.face_image_url
    );
    return ApiResponse.success({
      id: typedData.id,
      userId: typedData.user_id,
      vehicleType: typedData.vehicle_type,
      capacityDescription: typedData.capacity_description,
      specialties: typedData.specialties || [],
      serviceRadiusKm: typedData.service_radius_km ?? 10,
      baseLocationLat: typedData.base_location_lat,
      baseLocationLng: typedData.base_location_lng,
      currentLat: typedData.current_lat,
      currentLng: typedData.current_lng,
      isOnline: Boolean(typedData.is_online || typedData.live_now),
      liveNow: Boolean(typedData.live_now),
      isVerified: Boolean(typedData.is_verified),
      verificationStatus: typedData.verification_status,
      totalDeliveries: typedData.total_deliveries ?? 0,
      rating: typedData.rating ?? 5,
      baseRate: typedData.base_rate,
      faceImageUrl: signedFaceImageUrl,
      createdAt: typedData.created_at,
      updatedAt: typedData.updated_at,
    });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/drivers/me', method: 'GET' });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await readJsonBody(request);
    const parsed = updateDriverSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid driver profile payload', parsed.error.flatten());
    }

    const payload = parsed.data;
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.vehicleType !== undefined) updateData.vehicle_type = payload.vehicleType;
    if (payload.capacityDescription !== undefined) {
      updateData.capacity_description = sanitizeOptionalText(payload.capacityDescription, 200);
    }
    if (payload.specialties !== undefined) {
      updateData.specialties = payload.specialties
        .map((item) => item.trim())
        .filter((item, index, self) => item.length > 0 && self.indexOf(item) === index);
    }
    if (payload.serviceRadiusKm !== undefined) updateData.service_radius_km = payload.serviceRadiusKm;
    if (payload.baseLocationLat !== undefined) updateData.base_location_lat = payload.baseLocationLat;
    if (payload.baseLocationLng !== undefined) updateData.base_location_lng = payload.baseLocationLng;
    if (payload.currentLat !== undefined) updateData.current_lat = payload.currentLat;
    if (payload.currentLng !== undefined) updateData.current_lng = payload.currentLng;
    if (payload.isOnline !== undefined) updateData.is_online = payload.isOnline;
    if (payload.liveNow !== undefined) updateData.live_now = payload.liveNow;

    if (payload.liveNow !== undefined && payload.isOnline === undefined) {
      updateData.is_online = payload.liveNow;
    }
    if (payload.isOnline !== undefined && payload.liveNow === undefined) {
      updateData.live_now = payload.isOnline;
    }

    const { data: existing } = await (supabase
      .from('driver_profiles') as any)
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      const { data, error } = await (supabase
        .from('driver_profiles') as any)
        .update(updateData)
        .eq('id', existing.id as string)
        .select('*')
        .single();

      if (error) {
        return ApiResponse.error(error.message, 500);
      }

      const typedData = data as DriverProfileRow;
      return ApiResponse.success({ id: typedData.id, updatedAt: typedData.updated_at });
    }

    const { data, error } = await (supabase
      .from('driver_profiles') as any)
      .insert({
        user_id: user.id,
        ...updateData,
      })
      .select('*')
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    const typedData = data as DriverProfileRow;
    return ApiResponse.success({ id: typedData.id, updatedAt: typedData.updated_at }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/drivers/me', method: 'PATCH' });
  }
}

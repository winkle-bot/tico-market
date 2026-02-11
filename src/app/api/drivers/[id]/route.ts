import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { z } from 'zod';

const driverIdSchema = z.string().uuid();

type DriverRow = {
  id: string;
  user_id: string;
  vehicle_type: 'motorcycle' | 'car' | 'pickup' | 'bike' | 'walker' | null;
  capacity_description: string | null;
  specialties: string[] | null;
  service_radius_km: number | null;
  base_location_lat: number | null;
  base_location_lng: number | null;
  current_lat: number | null;
  current_lng: number | null;
  is_online: boolean | null;
  total_deliveries: number | null;
  rating: number | null;
  face_image_url: string | null;
  is_verified: boolean | null;
  verification_status: 'none' | 'pending' | 'approved' | 'rejected' | null;
  base_rate: number | null;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    name: string;
    rating: number;
    verified: boolean;
    location: string | null;
  } | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedDriverId = driverIdSchema.safeParse(id);
    if (!parsedDriverId.success) {
      return ApiResponse.badRequest('Invalid driver id');
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('*, profiles:user_id(id, name, rating, verified, location)')
      .eq('id', parsedDriverId.data)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return ApiResponse.notFound('Driver not found');
      }
      return ApiResponse.error(error.message, 500);
    }

    const driver = data as DriverRow;

    return ApiResponse.success({
      id: driver.id,
      userId: driver.user_id,
      name: driver.profiles?.name || 'Driver',
      rating: driver.rating ?? driver.profiles?.rating ?? 5,
      verified: driver.profiles?.verified ?? false,
      location: driver.profiles?.location || undefined,
      vehicleType: driver.vehicle_type,
      capacityDescription: driver.capacity_description,
      specialties: driver.specialties || [],
      serviceRadiusKm: driver.service_radius_km ?? 10,
      baseLocationLat: driver.base_location_lat ?? undefined,
      baseLocationLng: driver.base_location_lng ?? undefined,
      currentLat: driver.current_lat ?? undefined,
      currentLng: driver.current_lng ?? undefined,
      isOnline: Boolean(driver.is_online),
      isVerified: Boolean(driver.is_verified),
      verificationStatus: driver.verification_status ?? 'none',
      totalDeliveries: driver.total_deliveries ?? 0,
      baseRate: driver.base_rate ?? undefined,
      faceImageUrl: driver.face_image_url ?? undefined,
      createdAt: driver.created_at,
      updatedAt: driver.updated_at,
    });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/drivers/[id]', method: 'GET' });
  }
}

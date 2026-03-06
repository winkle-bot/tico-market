import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { z } from 'zod';

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
  live_now: boolean | null;
  total_deliveries: number | null;
  rating: number | null;
  face_image_url: string | null;
  is_verified: boolean | null;
  verification_status: string | null;
  base_rate: number | null;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    name: string;
    rating: number;
    verified: boolean;
  } | null;
};

const vehicleTypeSchema = z.enum(['motorcycle', 'car', 'pickup', 'bike', 'walker']);

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function getDistanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function toDriverResponse(driver: DriverRow, viewerLat?: number, viewerLng?: number) {
  const distanceKm =
    Number.isFinite(viewerLat) &&
    Number.isFinite(viewerLng) &&
    Number.isFinite(driver.current_lat) &&
    Number.isFinite(driver.current_lng)
      ? getDistanceKm(viewerLat as number, viewerLng as number, driver.current_lat as number, driver.current_lng as number)
      : undefined;

  return {
    id: driver.id,
    userId: driver.user_id,
    name: driver.profiles?.name || 'Driver',
    rating: driver.rating ?? driver.profiles?.rating ?? 5,
    verified: driver.profiles?.verified ?? false,
    vehicleType: driver.vehicle_type,
    capacityDescription: driver.capacity_description,
    specialties: driver.specialties || [],
    serviceRadiusKm: driver.service_radius_km ?? 10,
    baseLocationLat: driver.base_location_lat ?? undefined,
    baseLocationLng: driver.base_location_lng ?? undefined,
    currentLat: driver.current_lat ?? undefined,
    currentLng: driver.current_lng ?? undefined,
    isOnline: Boolean(driver.is_online || driver.live_now),
    liveNow: Boolean(driver.live_now),
    isVerified: Boolean(driver.is_verified),
    verificationStatus: driver.verification_status ?? 'none',
    totalDeliveries: driver.total_deliveries ?? 0,
    baseRate: driver.base_rate ?? undefined,
    distanceKm,
    createdAt: driver.created_at,
    updatedAt: driver.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const url = new URL(request.url);

    const onlyOnline = url.searchParams.get('online') !== 'false';
    const lat = Number.parseFloat(url.searchParams.get('lat') || '');
    const lng = Number.parseFloat(url.searchParams.get('lng') || '');
    const radiusKm = Number.parseFloat(url.searchParams.get('radiusKm') || '');
    const vehicleType = url.searchParams.get('vehicleType');
    const specialty = url.searchParams.get('specialty');

    let query = supabase
      .from('driver_profiles')
      .select('*, profiles:user_id(id, name, rating, verified)');

    if (onlyOnline) {
      query = query.or('is_online.eq.true,live_now.eq.true');
    }

    const parsedVehicleType = vehicleTypeSchema.safeParse(vehicleType);
    if (vehicleType && parsedVehicleType.success) {
      query = query.eq('vehicle_type', parsedVehicleType.data);
    }

    if (specialty) {
      query = query.contains('specialties', [specialty]);
    }

    const { data, error } = await query.order('is_online', { ascending: false }).order('updated_at', { ascending: false });

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    let transformed = ((data || []) as DriverRow[]).map((driver) => toDriverResponse(driver, lat, lng));

    if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm) && radiusKm > 0) {
      transformed = transformed.filter(
        (driver) => driver.distanceKm === undefined || driver.distanceKm <= radiusKm
      );
    }

    transformed = transformed.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return Number(b.isOnline) - Number(a.isOnline);
      }
      if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
        return a.distanceKm - b.distanceKm;
      }
      return b.rating - a.rating;
    });

    return ApiResponse.success({ data: transformed });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/drivers', method: 'GET' });
  }
}

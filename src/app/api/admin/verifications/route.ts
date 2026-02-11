/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized();
    }

    // Check admin role
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
      return ApiResponse.forbidden('Admin access required');
    }

    // Get all driver profiles with pending/approved/rejected verification
    const { data: drivers, error } = await (supabase
      .from('driver_profiles') as any)
      .select('*, profiles:user_id(id, name, email)')
      .neq('verification_status', 'none')
      .order('updated_at', { ascending: false });

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    const transformed = (drivers || []).map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      name: d.profiles?.name || 'Unknown',
      email: d.profiles?.email || '',
      vehicleType: d.vehicle_type,
      faceImageUrl: d.face_image_url,
      licenseImageKey: d.license_image_key,
      verificationStatus: d.verification_status,
      isVerified: d.is_verified,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    return ApiResponse.success({ data: transformed });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/admin/verifications', method: 'GET' });
  }
}

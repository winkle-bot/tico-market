/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await readJsonBody(request);
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid review action', parsed.error.flatten());
    }

    const { action } = parsed.data;
    const isApproved = action === 'approve';

    const { data: updated, error } = await (supabase
      .from('driver_profiles') as any)
      .update({
        verification_status: isApproved ? 'approved' : 'rejected',
        is_verified: isApproved,
      })
      .eq('id', id)
      .select('id, verification_status, is_verified')
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    if (!updated) {
      return ApiResponse.notFound('Driver profile not found');
    }

    return ApiResponse.success({
      message: `Driver verification ${isApproved ? 'approved' : 'rejected'}.`,
      driverProfileId: updated.id,
      verificationStatus: updated.verification_status,
      isVerified: updated.is_verified,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/admin/verifications/[id]', method: 'PATCH' });
  }
}

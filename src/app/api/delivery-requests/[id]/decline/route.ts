/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const { id } = await params;

    const { data: deliveryRequest, error: fetchError } = await (supabase
      .from('delivery_requests') as any)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !deliveryRequest) {
      return ApiResponse.notFound('Delivery request not found');
    }

    if (deliveryRequest.status !== 'open') {
      return ApiResponse.badRequest('This request is no longer open');
    }

    // Verify the user is a driver
    const { data: driverProfile } = await (supabase
      .from('driver_profiles') as any)
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!driverProfile) {
      return ApiResponse.badRequest('You must be a registered driver to decline requests');
    }

    // For auto/manual requests targeted at this driver, mark as cancelled so system can pass to next
    if (
      (deliveryRequest.request_type === 'auto' || deliveryRequest.request_type === 'manual') &&
      deliveryRequest.target_driver_id === driverProfile.id
    ) {
      await (supabase.from('delivery_requests') as any)
        .update({ status: 'cancelled', target_driver_id: null })
        .eq('id', id);
    }

    return ApiResponse.success({
      message: 'Delivery request declined.',
      deliveryRequestId: id,
    });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/delivery-requests/[id]/decline', method: 'POST' });
  }
}

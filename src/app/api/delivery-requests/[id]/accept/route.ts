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

    // Get the delivery request
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

    // Check expiry for auto/manual requests
    if (deliveryRequest.expires_at && new Date(deliveryRequest.expires_at) < new Date()) {
      // Mark as expired
      await (supabase.from('delivery_requests') as any)
        .update({ status: 'cancelled' })
        .eq('id', id);
      return ApiResponse.badRequest('This request has expired');
    }

    // Verify the user is a driver
    const { data: driverProfile } = await (supabase
      .from('driver_profiles') as any)
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!driverProfile) {
      return ApiResponse.badRequest('You must be a registered driver to accept requests');
    }

    // For manual requests, verify this driver is the target
    if (deliveryRequest.request_type === 'manual' && deliveryRequest.target_driver_id !== driverProfile.id) {
      return ApiResponse.forbidden('This request was sent to a different driver');
    }

    const now = new Date().toISOString();

    // Accept the request
    const { data: updated, error: updateError } = await (supabase
      .from('delivery_requests') as any)
      .update({
        status: 'assigned',
        assigned_driver_id: user.id,
        assigned_at: now,
        final_amount: deliveryRequest.offered_price || deliveryRequest.budget_amount,
      })
      .eq('id', id)
      .eq('status', 'open')
      .select('*')
      .single();

    if (updateError) {
      return ApiResponse.error(updateError.message, 500);
    }
    if (!updated) {
      return ApiResponse.badRequest('This request is no longer open');
    }

    return ApiResponse.success({
      message: 'Delivery request accepted!',
      deliveryRequestId: updated.id,
      status: updated.status,
    });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/delivery-requests/[id]/accept', method: 'POST' });
  }
}

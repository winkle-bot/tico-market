/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const { id } = await params;

    const { data: deliveryRequest, error: requestError } = await (supabase
      .from('delivery_requests') as any)
      .select('id, requester_id, assigned_driver_id, target_driver_id, status')
      .eq('id', id)
      .single();

    if (requestError || !deliveryRequest) {
      return ApiResponse.notFound('Delivery request not found');
    }

    const { data: driverProfile } = await (supabase
      .from('driver_profiles') as any)
      .select('id')
      .eq('user_id', user.id)
      .single();

    const isDriverParticipant =
      Boolean(driverProfile) &&
      (
        deliveryRequest.status === 'open' ||
        deliveryRequest.assigned_driver_id === user.id ||
        deliveryRequest.target_driver_id === driverProfile?.id
      );

    const isParticipant =
      deliveryRequest.requester_id === user.id ||
      deliveryRequest.assigned_driver_id === user.id ||
      isDriverParticipant;

    if (!isParticipant) {
      return ApiResponse.forbidden('Not authorized to view negotiations for this request');
    }

    const { data, error } = await (supabase
      .from('delivery_negotiations') as any)
      .select('id, delivery_request_id, proposed_by, amount, status, created_at, profiles:proposed_by(name)')
      .eq('delivery_request_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({
      data: (data || []).map((item: any) => ({
        id: item.id,
        deliveryRequestId: item.delivery_request_id,
        proposedBy: item.proposed_by,
        proposedByName: item.profiles?.name || null,
        amount: item.amount,
        status: item.status,
        createdAt: item.created_at,
      })),
    });
  } catch (error) {
    return ApiResponse.serverError(error, {
      route: '/api/delivery-requests/[id]/negotiations',
      method: 'GET',
    });
  }
}

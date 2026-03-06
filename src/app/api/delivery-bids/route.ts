import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';

function toBidResponse(row: Record<string, unknown>) {
  return {
    id: row.id,
    deliveryRequestId: row.delivery_request_id,
    driverId: row.driver_id,
    amount: row.amount,
    etaMinutes: row.eta_minutes,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // Require authentication to view bids
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in to view bids');
    }

    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const deliveryRequestId = searchParams.get('deliveryRequestId');
    const status = searchParams.get('status');
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '40', 10)));

    if (!driverId && !deliveryRequestId) {
      return ApiResponse.badRequest('driverId or deliveryRequestId is required');
    }

    let query = supabase
      .from('delivery_bids')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (driverId) {
      if (driverId !== user.id) {
        return ApiResponse.forbidden('Not authorized to view these bids');
      }
      query = query.eq('driver_id', driverId);
    }
    if (deliveryRequestId) {
      const { data: requestRow, error: requestError } = await (supabase
        .from('delivery_requests') as any)
        .select('requester_id, assigned_driver_id')
        .eq('id', deliveryRequestId)
        .single();

      if (requestError || !requestRow) {
        return ApiResponse.notFound('Delivery request not found');
      }

      const canViewRequestBids =
        requestRow.requester_id === user.id ||
        requestRow.assigned_driver_id === user.id ||
        driverId === user.id;
      if (!canViewRequestBids) {
        return ApiResponse.forbidden('Not authorized to view bids for this request');
      }
      query = query.eq('delivery_request_id', deliveryRequestId);
    }
    if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
      query = query.eq('status', status as 'pending' | 'accepted' | 'rejected');
    }

    const { data, error } = await query;
    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({ data: (data || []).map((row) => toBidResponse(row as Record<string, unknown>)) });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/delivery-bids', method: 'GET' });
  }
}

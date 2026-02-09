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
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const deliveryRequestId = searchParams.get('deliveryRequestId');
    const status = searchParams.get('status');
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '40', 10)));

    let query = supabase
      .from('delivery_bids')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (driverId) {
      query = query.eq('driver_id', driverId);
    }
    if (deliveryRequestId) {
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

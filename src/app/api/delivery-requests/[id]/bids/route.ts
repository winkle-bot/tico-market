/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { sanitizeOptionalText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const requestIdSchema = z.string().uuid();
const createBidSchema = z.object({
  amount: z.number().int().min(0),
  etaMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
  message: z.string().max(500).nullable().optional(),
});

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedRequestId = requestIdSchema.safeParse(id);
    if (!parsedRequestId.success) {
      return ApiResponse.badRequest('Invalid delivery request id');
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const { data: requestRow, error: requestError } = await (supabase
      .from('delivery_requests') as any)
      .select('id, status')
      .eq('id', parsedRequestId.data)
      .single();

    if (requestError || !requestRow) {
      return ApiResponse.notFound('Delivery request not found');
    }
    if (requestRow.status !== 'open') {
      return ApiResponse.badRequest('Bids are only allowed on open requests');
    }

    const body = await readJsonBody(request);
    const parsed = createBidSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid bid payload', parsed.error.flatten());
    }

    const payload = parsed.data;
    const { data, error } = await (supabase
      .from('delivery_bids') as any)
      .upsert({
        delivery_request_id: parsedRequestId.data,
        driver_id: user.id,
        amount: payload.amount,
        eta_minutes: payload.etaMinutes,
        message: sanitizeOptionalText(payload.message, 500),
        status: 'pending',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'delivery_request_id,driver_id',
      })
      .select('*')
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success(toBidResponse(data as unknown as Record<string, unknown>), 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/delivery-requests/[id]/bids', method: 'POST' });
  }
}

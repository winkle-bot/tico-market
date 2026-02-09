/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const bidIdSchema = z.string().uuid();
const patchBidSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected']),
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedBidId = bidIdSchema.safeParse(id);
    if (!parsedBidId.success) {
      return ApiResponse.badRequest('Invalid delivery bid id');
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await readJsonBody(request);
    const parsed = patchBidSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid bid update payload', parsed.error.flatten());
    }

    const { data: existingBid, error: existingBidError } = await (supabase
      .from('delivery_bids') as any)
      .select('*')
      .eq('id', parsedBidId.data)
      .single();

    if (existingBidError || !existingBid) {
      return ApiResponse.notFound('Delivery bid not found');
    }

    const { data: requestRow, error: requestError } = await (supabase
      .from('delivery_requests') as any)
      .select('*')
      .eq('id', existingBid.delivery_request_id)
      .single();

    if (requestError || !requestRow) {
      return ApiResponse.notFound('Delivery request not found');
    }

    const isRequester = requestRow.requester_id === user.id;
    const isBidDriver = existingBid.driver_id === user.id;

    if (!isRequester && !isBidDriver) {
      return ApiResponse.forbidden('Not authorized to update this bid');
    }

    if (!isRequester && parsed.data.status !== 'rejected') {
      return ApiResponse.forbidden('Only requester can accept bids');
    }

    const { data: updatedBid, error: updateError } = await (supabase
      .from('delivery_bids') as any)
      .update({
        status: parsed.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsedBidId.data)
      .select('*')
      .single();

    if (updateError) {
      return ApiResponse.error(updateError.message, 500);
    }

    if (isRequester && parsed.data.status === 'accepted') {
      const now = new Date().toISOString();
      await (supabase
        .from('delivery_bids') as any)
        .update({ status: 'rejected', updated_at: now })
        .eq('delivery_request_id', existingBid.delivery_request_id)
        .neq('id', parsedBidId.data)
        .eq('status', 'pending');

      await (supabase
        .from('delivery_requests') as any)
        .update({
          status: 'assigned',
          assigned_driver_id: existingBid.driver_id,
          assigned_at: now,
          final_amount: existingBid.amount,
          updated_at: now,
        })
        .eq('id', existingBid.delivery_request_id);
    }

    return ApiResponse.success(toBidResponse(updatedBid as unknown as Record<string, unknown>));
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/delivery-bids/[id]', method: 'PATCH' });
  }
}

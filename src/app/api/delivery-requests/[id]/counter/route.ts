/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const counterSchema = z.object({
  amount: z.number().int().min(100), // minimum ₡100
});

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
    const body = await readJsonBody(request);
    const parsed = counterSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid counter offer', parsed.error.flatten());
    }

    const { amount } = parsed.data;

    // Fetch the delivery request
    const { data: deliveryRequest, error: fetchError } = await (supabase
      .from('delivery_requests') as any)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !deliveryRequest) {
      return ApiResponse.notFound('Delivery request not found');
    }

    if (deliveryRequest.status !== 'open') {
      return ApiResponse.badRequest('This request is no longer open for negotiation');
    }

    const isRequester = deliveryRequest.requester_id === user.id;
    if (!isRequester) {
      const { data: driverProfile } = await (supabase
        .from('driver_profiles') as any)
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driverProfile) {
        return ApiResponse.forbidden('Only the buyer or a registered driver can counter');
      }

      if (
        (deliveryRequest.request_type === 'manual' || deliveryRequest.request_type === 'auto') &&
        deliveryRequest.target_driver_id &&
        deliveryRequest.target_driver_id !== driverProfile.id
      ) {
        return ApiResponse.forbidden('This request was sent to a different driver');
      }
    }

    // Mark any existing proposals as 'countered'
    await (supabase.from('delivery_negotiations') as any)
      .update({ status: 'countered' })
      .eq('delivery_request_id', id)
      .eq('status', 'proposed');

    // Create the new negotiation entry
    const { data: negotiation, error: insertError } = await (supabase
      .from('delivery_negotiations') as any)
      .insert({
        delivery_request_id: id,
        proposed_by: user.id,
        amount,
        status: 'proposed',
      })
      .select('*')
      .single();

    if (insertError) {
      return ApiResponse.error(insertError.message, 500);
    }

    // Update the offered_price on the request
    await (supabase.from('delivery_requests') as any)
      .update({ offered_price: amount })
      .eq('id', id);

    return ApiResponse.success({
      message: 'Counter offer submitted',
      negotiation: {
        id: negotiation.id,
        amount: negotiation.amount,
        proposedBy: negotiation.proposed_by,
        status: negotiation.status,
        createdAt: negotiation.created_at,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/delivery-requests/[id]/counter', method: 'POST' });
  }
}

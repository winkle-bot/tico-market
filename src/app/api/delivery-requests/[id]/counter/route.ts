/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const requestIdSchema = z.string().uuid();
const counterSchema = z.object({
  amount: z.number().int().min(100),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedId = requestIdSchema.safeParse(id);
    if (!parsedId.success) {
      return ApiResponse.badRequest('Invalid delivery request id');
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await readJsonBody(request);
    const parsedBody = counterSchema.safeParse(body);
    if (!parsedBody.success) {
      return ApiResponse.badRequest('Invalid counter payload', parsedBody.error.flatten());
    }

    const [{ data: requestRow, error: requestError }, { data: driverProfile }] = await Promise.all([
      (supabase.from('delivery_requests') as any)
        .select('id, requester_id, assigned_driver_id, target_driver_id, request_type, status')
        .eq('id', parsedId.data)
        .single(),
      (supabase.from('driver_profiles') as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (requestError || !requestRow) {
      return ApiResponse.notFound('Delivery request not found');
    }

    if (requestRow.status !== 'open') {
      return ApiResponse.badRequest('Negotiation is only available while the request is open');
    }

    const driverProfileId = driverProfile?.id as string | undefined;
    const isRequester = requestRow.requester_id === user.id;
    const canParticipateAsDriver =
      Boolean(driverProfileId) &&
      (requestRow.request_type === 'broadcast' ||
        requestRow.target_driver_id === driverProfileId);

    if (!isRequester && !canParticipateAsDriver) {
      return ApiResponse.forbidden('Not authorized to counter this delivery request');
    }

    const now = new Date().toISOString();

    await (supabase
      .from('delivery_negotiations') as any)
      .update({
        status: 'countered',
        updated_at: now,
      })
      .eq('delivery_request_id', parsedId.data)
      .eq('status', 'proposed');

    const { data: inserted, error: insertError } = await (supabase
      .from('delivery_negotiations') as any)
      .insert({
        delivery_request_id: parsedId.data,
        proposed_by: user.id,
        amount: parsedBody.data.amount,
        status: 'proposed',
        updated_at: now,
      })
      .select('id, proposed_by, amount, status, created_at, updated_at')
      .single();

    if (insertError || !inserted) {
      return ApiResponse.error(insertError?.message || 'Failed to save counter offer', 500);
    }

    const { error: requestUpdateError } = await (supabase
      .from('delivery_requests') as any)
      .update({
        offered_price: parsedBody.data.amount,
        updated_at: now,
      })
      .eq('id', parsedId.data);

    if (requestUpdateError) {
      return ApiResponse.error(requestUpdateError.message, 500);
    }

    return ApiResponse.success({
      id: inserted.id,
      proposedBy: inserted.proposed_by,
      amount: inserted.amount,
      status: inserted.status,
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, {
      route: '/api/delivery-requests/[id]/counter',
      method: 'POST',
    });
  }
}

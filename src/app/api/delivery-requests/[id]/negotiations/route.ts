/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { z } from 'zod';

const requestIdSchema = z.string().uuid();

function toNegotiationResponse(row: Record<string, unknown>) {
  return {
    id: row.id,
    proposedBy: row.proposed_by,
    proposedByName:
      row.profiles && typeof row.profiles === 'object' && 'name' in row.profiles
        ? (row.profiles as { name?: string | null }).name ?? null
        : null,
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(
  _request: Request,
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

    const driverProfileId = driverProfile?.id as string | undefined;
    const isRequester = requestRow.requester_id === user.id;
    const isAssignedDriver = requestRow.assigned_driver_id === user.id;
    const canParticipateAsDriver =
      Boolean(driverProfileId) &&
      (requestRow.assigned_driver_id === user.id ||
        (requestRow.status === 'open' &&
          (requestRow.request_type === 'broadcast' ||
            requestRow.target_driver_id === driverProfileId)));

    if (!isRequester && !isAssignedDriver && !canParticipateAsDriver) {
      return ApiResponse.forbidden('Not authorized to view negotiations for this request');
    }

    const { data, error } = await (supabase
      .from('delivery_negotiations') as any)
      .select('id, proposed_by, amount, status, created_at, updated_at, profiles:proposed_by(name)')
      .eq('delivery_request_id', parsedId.data)
      .order('created_at', { ascending: false });

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({
      data: (data || []).map((row: Record<string, unknown>) => toNegotiationResponse(row)),
    });
  } catch (error) {
    return ApiResponse.serverError(error, {
      route: '/api/delivery-requests/[id]/negotiations',
      method: 'GET',
    });
  }
}

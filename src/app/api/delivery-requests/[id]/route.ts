/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const requestIdSchema = z.string().uuid();
const updateSchema = z.object({
  status: z.enum(['open', 'assigned', 'in_transit', 'completed', 'cancelled']).optional(),
  assignedDriverId: z.string().uuid().nullable().optional(),
  finalAmount: z.number().int().min(0).nullable().optional(),
  pickedUpAt: z.string().datetime().nullable().optional(),
  deliveredAt: z.string().datetime().nullable().optional(),
});

function toRequestResponse(row: Record<string, unknown>) {
  return {
    id: row.id,
    requesterId: row.requester_id,
    status: row.status,
    pickupAddress: row.pickup_address,
    pickupLat: row.pickup_lat,
    pickupLng: row.pickup_lng,
    pickupInstructions: row.pickup_instructions,
    pickupWindowStart: row.pickup_window_start,
    pickupWindowEnd: row.pickup_window_end,
    dropoffAddress: row.dropoff_address,
    dropoffLat: row.dropoff_lat,
    dropoffLng: row.dropoff_lng,
    dropoffInstructions: row.dropoff_instructions,
    dropoffWindowStart: row.dropoff_window_start,
    dropoffWindowEnd: row.dropoff_window_end,
    itemDescription: row.item_description,
    itemPhotos: row.item_photos || [],
    estimatedWeightKg: row.estimated_weight_kg,
    isFragile: row.is_fragile,
    budgetAmount: row.budget_amount,
    finalAmount: row.final_amount,
    assignedDriverId: row.assigned_driver_id,
    assignedAt: row.assigned_at,
    pickedUpAt: row.picked_up_at,
    deliveredAt: row.delivered_at,
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
    const { data, error } = await (supabase
      .from('delivery_requests') as any)
      .select('*')
      .eq('id', parsedId.data)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return ApiResponse.notFound('Delivery request not found');
      }
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success(toRequestResponse(data as Record<string, unknown>));
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/delivery-requests/[id]', method: 'GET' });
  }
}

export async function PATCH(
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

    const { data: existing, error: existingError } = await (supabase
      .from('delivery_requests') as any)
      .select('*')
      .eq('id', parsedId.data)
      .single();

    if (existingError || !existing) {
      return ApiResponse.notFound('Delivery request not found');
    }

    const isRequester = existing.requester_id === user.id;
    const isAssignedDriver = existing.assigned_driver_id === user.id;
    if (!isRequester && !isAssignedDriver) {
      return ApiResponse.forbidden('Not authorized to update this request');
    }

    const body = await readJsonBody(request);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid delivery request update payload', parsed.error.flatten());
    }

    const payload = parsed.data;
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (payload.status) updateData.status = payload.status;

    if (payload.assignedDriverId !== undefined) {
      if (!isRequester) {
        return ApiResponse.forbidden('Only requester can assign driver');
      }
      updateData.assigned_driver_id = payload.assignedDriverId;
      updateData.assigned_at = payload.assignedDriverId ? new Date().toISOString() : null;
      if (payload.assignedDriverId && !payload.status) {
        updateData.status = 'assigned';
      }
    }

    if (payload.finalAmount !== undefined) {
      if (!isRequester) {
        return ApiResponse.forbidden('Only requester can set final amount');
      }
      updateData.final_amount = payload.finalAmount;
    }

    if (payload.pickedUpAt !== undefined) {
      if (!isAssignedDriver && !isRequester) {
        return ApiResponse.forbidden('Only assigned driver can set pickup timestamp');
      }
      updateData.picked_up_at = payload.pickedUpAt;
    }

    if (payload.deliveredAt !== undefined) {
      if (!isAssignedDriver && !isRequester) {
        return ApiResponse.forbidden('Only assigned driver can set delivery timestamp');
      }
      updateData.delivered_at = payload.deliveredAt;
    }

    const { data, error } = await (supabase
      .from('delivery_requests') as any)
      .update(updateData)
      .eq('id', parsedId.data)
      .select('*')
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success(toRequestResponse(data as unknown as Record<string, unknown>));
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/delivery-requests/[id]', method: 'PATCH' });
  }
}

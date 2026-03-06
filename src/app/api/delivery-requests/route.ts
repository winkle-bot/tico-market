/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { sanitizeOptionalText, sanitizeText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const DRIVER_REQUEST_EXPIRY_MS = 3 * 60 * 1000; // 3 minutes

const createDeliveryRequestSchema = z.object({
  requestType: z.enum(['auto', 'manual', 'broadcast']).optional().default('broadcast'),
  targetDriverId: z.string().uuid().nullable().optional(),
  offeredPrice: z.number().int().min(0).nullable().optional(),
  pickupAddress: z.string().min(5).max(300),
  pickupLat: z.number().min(-90).max(90).nullable().optional(),
  pickupLng: z.number().min(-180).max(180).nullable().optional(),
  pickupInstructions: z.string().max(500).nullable().optional(),
  pickupWindowStart: z.string().datetime().nullable().optional(),
  pickupWindowEnd: z.string().datetime().nullable().optional(),
  dropoffAddress: z.string().min(5).max(300),
  dropoffLat: z.number().min(-90).max(90).nullable().optional(),
  dropoffLng: z.number().min(-180).max(180).nullable().optional(),
  dropoffInstructions: z.string().max(500).nullable().optional(),
  dropoffWindowStart: z.string().datetime().nullable().optional(),
  dropoffWindowEnd: z.string().datetime().nullable().optional(),
  itemDescription: z.string().min(3).max(1000),
  itemPhotos: z.array(z.string().url()).max(8).optional(),
  estimatedWeightKg: z.number().min(0).max(1000).nullable().optional(),
  isFragile: z.boolean().optional(),
  budgetAmount: z.number().int().min(0).nullable().optional(),
  vehicleTypeFilter: z.enum(['motorcycle', 'car', 'pickup']).nullable().optional(),
});

const requestStatusValues = ['open', 'assigned', 'in_transit', 'completed', 'cancelled'] as const;
type RequestStatus = (typeof requestStatusValues)[number];

function toRequestResponse(row: Record<string, unknown>) {
  return {
    id: row.id,
    requesterId: row.requester_id,
    status: row.status,
    requestType: row.request_type || 'broadcast',
    targetDriverId: row.target_driver_id,
    offeredPrice: row.offered_price,
    expiresAt: row.expires_at,
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

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }
    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get('status');
    const status = statusParam === 'pending' ? 'open' : statusParam;
    const requesterId = searchParams.get('requesterId');
    const assignedDriverId = searchParams.get('assignedDriverId');
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '30', 10)));
    const { data: driverProfile } = await (supabase
      .from('driver_profiles') as any)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    const driverProfileId = driverProfile?.id as string | undefined;

    let query = (supabase
      .from('delivery_requests') as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (requesterId) {
      if (requesterId !== user.id) {
        return ApiResponse.forbidden('Not authorized to view these delivery requests');
      }
      query = query.eq('requester_id', requesterId);
    }

    if (assignedDriverId) {
      if (assignedDriverId !== user.id) {
        return ApiResponse.forbidden('Not authorized to view these delivery tasks');
      }
      query = query.eq('assigned_driver_id', assignedDriverId);
    }

    const isDriverBrowse = !requesterId && !assignedDriverId;
    if (isDriverBrowse) {
      if (!driverProfileId) {
        return ApiResponse.forbidden('Driver access required');
      }

      query = query.eq('status', 'open');
      query = query.or(
        `request_type.eq.broadcast,and(request_type.eq.manual,target_driver_id.eq.${driverProfileId}),and(request_type.eq.auto,target_driver_id.eq.${driverProfileId})`
      );
    }

    if (status && requestStatusValues.includes(status as RequestStatus)) {
      query = query.eq('status', status as RequestStatus);
    }

    const { data, error } = await query;
    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    const transformed = (data || []).map((row: unknown) =>
      toRequestResponse(row as Record<string, unknown>)
    );
    return ApiResponse.success({ data: transformed });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/delivery-requests', method: 'GET' });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await readJsonBody(request);
    const parsed = createDeliveryRequestSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid delivery request payload', parsed.error.flatten());
    }

    const payload = parsed.data;
    const requestType = payload.requestType || 'broadcast';
    if (requestType === 'manual' && !payload.targetDriverId) {
      return ApiResponse.badRequest('Manual requests require a target driver.');
    }

    // For auto/manual requests, set 3 minute expiry
    const expiresAt = requestType !== 'broadcast'
      ? new Date(Date.now() + DRIVER_REQUEST_EXPIRY_MS).toISOString()
      : null;

    const { data, error } = await (supabase
      .from('delivery_requests') as any)
      .insert({
        requester_id: user.id,
        request_type: requestType,
        target_driver_id: requestType === 'broadcast' ? null : (payload.targetDriverId ?? null),
        offered_price: payload.offeredPrice ?? null,
        expires_at: expiresAt,
        pickup_address: sanitizeText(payload.pickupAddress, 300),
        pickup_lat: payload.pickupLat,
        pickup_lng: payload.pickupLng,
        pickup_instructions: sanitizeOptionalText(payload.pickupInstructions, 500),
        pickup_window_start: payload.pickupWindowStart,
        pickup_window_end: payload.pickupWindowEnd,
        dropoff_address: sanitizeText(payload.dropoffAddress, 300),
        dropoff_lat: payload.dropoffLat,
        dropoff_lng: payload.dropoffLng,
        dropoff_instructions: sanitizeOptionalText(payload.dropoffInstructions, 500),
        dropoff_window_start: payload.dropoffWindowStart,
        dropoff_window_end: payload.dropoffWindowEnd,
        item_description: sanitizeText(payload.itemDescription, 1000),
        item_photos: payload.itemPhotos || [],
        estimated_weight_kg: payload.estimatedWeightKg,
        is_fragile: payload.isFragile ?? false,
        budget_amount: payload.budgetAmount,
      })
      .select('*')
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success(toRequestResponse(data as unknown as Record<string, unknown>), 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/delivery-requests', method: 'POST' });
  }
}

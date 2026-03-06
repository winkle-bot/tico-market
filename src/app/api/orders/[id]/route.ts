import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { sanitizeOptionalText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { sendPushToUser, sendWhatsAppToUser } from '@/lib/push';
import { z } from 'zod';

const orderIdSchema = z.string().min(3).max(120).regex(/^[a-zA-Z0-9-_]+$/);
const terminalStatuses = new Set(['completed', 'cancelled']);
const orderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'in_transit', 'completed', 'cancelled']).optional(),
  driverAssignment: z.object({
    driverId: z.string().uuid(),
    driverName: z.string().max(100).optional(),
  }).optional(),
  trackingEvent: z.object({
    message: z.string().max(240).optional(),
    phase: z.enum(['awaiting_confirmation', 'awaiting_pickup', 'picked_up', 'near_buyer', 'delivered']).optional(),
    etaMinutes: z.number().int().min(0).max(240).nullable().optional(),
    driverLocationLabel: z.string().max(120).nullable().optional(),
  }).optional(),
}).refine((value) => Boolean(value.status || value.driverAssignment || value.trackingEvent), {
  message: 'At least one update field is required',
});

type OrderRole = 'buyer' | 'seller' | 'driver';
type OrderStatusValue = 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled';
type OrderTypeValue = 'delivery' | 'pickup';
type TrackingPayload = {
  message?: string;
  phase?: 'awaiting_confirmation' | 'awaiting_pickup' | 'picked_up' | 'near_buyer' | 'delivered';
  etaMinutes?: number | null;
  driverLocationLabel?: string | null;
};
type QueryError = {
  message: string;
  code?: string;
};
type OrderRecord = {
  id: string;
  listing_id: number;
  listing_snapshot: Record<string, unknown> | null;
  buyer_id: string;
  buyer_name: string;
  seller_id: string;
  seller_name: string;
  type: OrderTypeValue;
  status: OrderStatusValue;
  driver_id: string | null;
  driver_name: string | null;
  delivery_address: string | null;
  delivery_fee: number | null;
  pickup_location_id: string | null;
  pickup_location: Record<string, unknown> | null;
  scheduled_window: string | null;
  notes: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  payment_currency: string | null;
  created_at: string;
  updated_at: string;
};
type DisputeRecord = {
  id: string;
  status: string;
};
type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function getDeliveryPhaseFromStatus(
  status: OrderStatusValue,
  orderType: OrderTypeValue
): TrackingPayload['phase'] | undefined {
  if (status === 'completed') return 'delivered';
  if (orderType !== 'delivery') return undefined;

  const phaseByStatus: Partial<Record<OrderStatusValue, TrackingPayload['phase']>> = {
    pending: 'awaiting_confirmation',
    confirmed: 'awaiting_pickup',
    in_transit: 'picked_up',
  };

  return phaseByStatus[status];
}

function getTrackingFallbackMessage(trackingEvent: TrackingPayload | undefined): string | undefined {
  if (!trackingEvent) return undefined;

  const parts: string[] = [];
  const phaseMessages: Record<NonNullable<TrackingPayload['phase']>, string> = {
    awaiting_confirmation: 'Order is awaiting confirmation.',
    awaiting_pickup: 'Order is ready for driver pickup.',
    picked_up: 'Driver picked up the order.',
    near_buyer: 'Driver is getting close to the buyer.',
    delivered: 'Delivery reached the buyer.',
  };

  if (trackingEvent.phase) {
    parts.push(phaseMessages[trackingEvent.phase]);
  }

  if (trackingEvent.etaMinutes !== undefined && trackingEvent.etaMinutes !== null) {
    parts.push(
      trackingEvent.etaMinutes === 0
        ? 'ETA updated: arriving now.'
        : `ETA updated: about ${trackingEvent.etaMinutes} min away.`
    );
  }

  if (trackingEvent.driverLocationLabel) {
    parts.push(`Driver location: ${sanitizeOptionalText(trackingEvent.driverLocationLabel, 120)}.`);
  }

  return parts.length > 0 ? parts.join(' ') : undefined;
}

async function getOrderById(
  supabase: SupabaseServerClient,
  orderId: string
): Promise<{ data: OrderRecord | null; error: QueryError | null }> {
  const ordersTable = supabase.from('orders') as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<{ data: OrderRecord | null; error: QueryError | null }>;
      };
    };
  };

  return ordersTable.select('*').eq('id', orderId).single();
}

async function getActiveDisputeForOrder(
  supabase: SupabaseServerClient,
  orderId: string
): Promise<{ data: DisputeRecord | null; error: QueryError | null }> {
  const disputesTable = supabase.from('disputes') as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        not: (column: string, operator: string, value: string) => {
          limit: (count: number) => {
            maybeSingle: () => Promise<{ data: DisputeRecord | null; error: QueryError | null }>;
          };
        };
      };
    };
  };

  return disputesTable
    .select('id, status')
    .eq('order_id', orderId)
    .not('status', 'in', '("closed")')
    .limit(1)
    .maybeSingle();
}

async function updateOrderRow(
  supabase: SupabaseServerClient,
  orderId: string,
  payload: Record<string, unknown>
): Promise<{ data: OrderRecord | null; error: QueryError | null }> {
  const ordersTable = supabase.from('orders') as unknown as {
    update: (nextPayload: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        select: () => {
          single: () => Promise<{ data: OrderRecord | null; error: QueryError | null }>;
        };
      };
    };
  };

  return ordersTable.update(payload).eq('id', orderId).select().single();
}

function getAllowedStatuses(
  role: OrderRole,
  currentStatus: OrderStatusValue,
  orderType: OrderTypeValue
): OrderStatusValue[] {
  if (role === 'buyer') {
    if (currentStatus === 'pending') return ['cancelled'];
    if (currentStatus === 'in_transit') return ['completed'];
    return [];
  }

  if (role === 'seller') {
    if (currentStatus === 'pending') return ['confirmed', 'cancelled'];
    if (currentStatus === 'confirmed') {
      return orderType === 'delivery' ? ['in_transit', 'completed'] : ['completed'];
    }
    if (currentStatus === 'in_transit') return ['completed'];
    return [];
  }

  if (currentStatus === 'confirmed') return ['in_transit'];
  if (currentStatus === 'in_transit') return ['completed'];
  return [];
}

function validateTrackingEvent(
  trackingEvent: TrackingPayload | undefined,
  role: OrderRole,
  currentStatus: OrderStatusValue,
  nextStatus: OrderStatusValue,
  orderType: OrderTypeValue
): string | null {
  if (!trackingEvent) return null;

  if (terminalStatuses.has(currentStatus) || terminalStatuses.has(nextStatus)) {
    const hasSignalBeyondCompletion =
      trackingEvent.phase !== undefined ||
      trackingEvent.etaMinutes !== undefined ||
      trackingEvent.driverLocationLabel !== undefined;
    if (hasSignalBeyondCompletion) {
      return 'Tracking updates are not allowed on completed or cancelled orders';
    }
  }

  if (
    (trackingEvent.etaMinutes !== undefined || trackingEvent.driverLocationLabel !== undefined) &&
    role !== 'driver'
  ) {
    return 'Only the assigned driver can update ETA or live location';
  }

  if (!trackingEvent.phase) return null;

  if (orderType !== 'delivery' && trackingEvent.phase !== 'delivered') {
    return 'Pickup orders do not support delivery tracking phases';
  }

  const allowedPhasesByRole: Record<OrderRole, TrackingPayload['phase'][]> = {
    buyer: ['delivered'],
    seller: ['awaiting_pickup', 'picked_up', 'delivered'],
    driver: ['picked_up', 'near_buyer', 'delivered'],
  };

  if (!allowedPhasesByRole[role].includes(trackingEvent.phase)) {
    return 'Not authorized to post this tracking update';
  }

  return null;
}

// GET single order
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const parsedOrderId = orderIdSchema.safeParse(id);
    if (!parsedOrderId.success) {
      return ApiResponse.badRequest('Invalid order id');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const { data: order, error } = await getOrderById(supabase, parsedOrderId.data);

    if (error) {
      if (error.code === 'PGRST116') {
        return ApiResponse.error('Order not found', 404);
      }
      return ApiResponse.error(error.message, 500);
    }
    if (!order) {
      return ApiResponse.error('Order not found', 404);
    }

    // Check if user is part of this order
    if (order.buyer_id !== user.id &&
        order.seller_id !== user.id &&
        order.driver_id !== user.id) {
      return ApiResponse.unauthorized('Not authorized to view this order');
    }

    // Check for active dispute
    const { data: activeDispute } = await getActiveDisputeForOrder(supabase, parsedOrderId.data);

    return ApiResponse.success({
      id: order.id,
      listingId: order.listing_id,
      listingSnapshot: order.listing_snapshot,
      buyerId: order.buyer_id,
      buyerName: order.buyer_name,
      sellerId: order.seller_id,
      sellerName: order.seller_name,
      type: order.type,
      status: order.status,
      driverId: order.driver_id,
      driverName: order.driver_name,
      deliveryAddress: order.delivery_address,
      deliveryFee: order.delivery_fee,
      pickupLocationId: order.pickup_location_id,
      pickupLocation: order.pickup_location,
      scheduledWindow: order.scheduled_window,
      notes: order.notes,
      paymentStatus: order.payment_status,
      paymentAmount: order.payment_amount,
      paymentCurrency: order.payment_currency,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      hasDispute: !!activeDispute,
      disputeId: activeDispute?.id || null,
      disputeStatus: activeDispute?.status || null,
    });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// PATCH update order status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const parsedOrderId = orderIdSchema.safeParse(id);
    if (!parsedOrderId.success) {
      return ApiResponse.badRequest('Invalid order id');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await readJsonBody(request);
    const parsedBody = orderStatusSchema.safeParse(body);
    if (!parsedBody.success) {
      return ApiResponse.badRequest('Invalid status payload', parsedBody.error.flatten());
    }
    const { status, driverAssignment, trackingEvent } = parsedBody.data;

    // Verify user is part of this order
    const { data: existing } = await getOrderById(supabase, parsedOrderId.data);

    if (!existing) {
      return ApiResponse.error('Order not found', 404);
    }

    const isBuyer = existing.buyer_id === user.id;
    const isSeller = existing.seller_id === user.id;
    const isDriver = existing.driver_id === user.id;
    if (!isBuyer && !isSeller && !isDriver) {
      return ApiResponse.unauthorized('Not authorized to update this order');
    }

    if (driverAssignment && !isSeller) {
      return ApiResponse.forbidden('Only the seller can assign a driver');
    }

    const actorRole: OrderRole = isSeller ? 'seller' : isDriver ? 'driver' : 'buyer';
    const currentStatus = existing.status as OrderStatusValue;
    const orderType = existing.type as OrderTypeValue;
    const nextStatus = (status ?? currentStatus) as OrderStatusValue;

    if (status) {
      const allowedStatuses = getAllowedStatuses(actorRole, currentStatus, orderType);
      if (!allowedStatuses.includes(status)) {
        return ApiResponse.forbidden('Not authorized to set this order status');
      }
    }

    if (driverAssignment) {
      if (orderType !== 'delivery') {
        return ApiResponse.badRequest('Driver assignment is only supported for delivery orders');
      }
      if (!['pending', 'confirmed'].includes(currentStatus)) {
        return ApiResponse.badRequest('Driver assignment is only allowed before delivery starts');
      }
    }

    const trackingValidationError = validateTrackingEvent(
      trackingEvent,
      actorRole,
      currentStatus,
      nextStatus,
      orderType
    );
    if (trackingValidationError) {
      return ApiResponse.forbidden(trackingValidationError);
    }

    const nextSnapshot = (existing.listing_snapshot ?? {}) as Record<string, unknown>;
    const previousDeliveryMeta = (nextSnapshot.deliveryMeta ?? {}) as Record<string, unknown>;
    const previousUpdates = Array.isArray(previousDeliveryMeta.updates)
      ? previousDeliveryMeta.updates
      : [];

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updatePayload.status = status;
    }
    if (driverAssignment) {
      updatePayload.driver_id = driverAssignment.driverId;
      updatePayload.driver_name = sanitizeOptionalText(driverAssignment.driverName, 100);
    }

    const messageFromStatus: Record<string, string> = {
      pending: 'Order is pending confirmation.',
      confirmed: 'Seller confirmed the order.',
      in_transit: 'Delivery is now in transit.',
      completed: 'Order was marked as completed.',
      cancelled: 'Order was cancelled.',
    };

    const newUpdateMessage =
      sanitizeOptionalText(trackingEvent?.message, 240) ||
      getTrackingFallbackMessage(trackingEvent) ||
      (status ? messageFromStatus[status] : undefined);

    if (trackingEvent || status || driverAssignment) {
      const updates = [...previousUpdates];
      if (newUpdateMessage) {
        updates.push({
          id: `upd-${Date.now()}`,
          byUserId: user.id,
          byRole: actorRole,
          message: newUpdateMessage,
          createdAt: new Date().toISOString(),
        });
      }
      const nextDeliveryMeta: Record<string, unknown> = {
        ...previousDeliveryMeta,
        updates,
      };
      const nextPhase = trackingEvent?.phase || (status ? getDeliveryPhaseFromStatus(status, orderType) : undefined);
      if (nextPhase) {
        nextDeliveryMeta.phase = nextPhase;
      }
      if (trackingEvent?.etaMinutes !== undefined) {
        nextDeliveryMeta.estimatedEtaMinutes = trackingEvent.etaMinutes;
      }
      if (trackingEvent?.driverLocationLabel !== undefined) {
        nextDeliveryMeta.driverLocationLabel = sanitizeOptionalText(trackingEvent.driverLocationLabel, 120);
      }
      if (driverAssignment) {
        nextDeliveryMeta.driverAssignedAt = new Date().toISOString();
      }

      updatePayload.listing_snapshot = {
        ...nextSnapshot,
        deliveryMeta: nextDeliveryMeta,
      };
    }

    const { data: order, error } = await updateOrderRow(supabase, parsedOrderId.data, updatePayload);

    if (error) {
      return ApiResponse.error(error.message, 500);
    }
    if (!order) {
      return ApiResponse.error('Order not found', 404);
    }

    // Fire-and-forget push notifications for status changes
    if (status) {
      const title =
        typeof existing.listing_snapshot?.title === 'string'
          ? existing.listing_snapshot.title
          : 'Order';
      const pushMsg = newUpdateMessage || `Order status: ${status}`;
      const notifyIds: string[] = [];
      if (!isBuyer) notifyIds.push(existing.buyer_id);
      if (!isSeller) notifyIds.push(existing.seller_id);
      if (existing.driver_id && !isDriver) notifyIds.push(existing.driver_id);
      for (const uid of notifyIds) {
        sendPushToUser(uid, {
          title: `${title} — ${status.replace('_', ' ')}`,
          body: pushMsg,
          url: `/account?tab=orders`,
        }).catch(() => {});
        sendWhatsAppToUser(uid, `Tico Market: ${title} — ${pushMsg}`).catch(() => {});
      }
    }

    return ApiResponse.success({
      id: order.id,
      status: order.status,
      driverId: order.driver_id,
      driverName: order.driver_name,
      listingSnapshot: order.listing_snapshot,
      paymentStatus: order.payment_status,
      updatedAt: order.updated_at,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

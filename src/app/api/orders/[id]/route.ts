import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const orderIdSchema = z.string().uuid();
const orderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'in_transit', 'completed', 'cancelled']),
});

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

    const { data: order, error } = await (supabase
      .from('orders') as any)
      .select('*')
      .eq('id', parsedOrderId.data)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return ApiResponse.error('Order not found', 404);
      }
      return ApiResponse.error(error.message, 500);
    }

    // Check if user is part of this order
    if (order.buyer_id !== user.id && 
        order.seller_id !== user.id && 
        order.driver_id !== user.id) {
      return ApiResponse.unauthorized('Not authorized to view this order');
    }

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
    const { status } = parsedBody.data;

    // Verify user is buyer or seller
    const { data: existing } = await (supabase
      .from('orders') as any)
      .select('buyer_id, seller_id')
      .eq('id', parsedOrderId.data)
      .single();

    if (!existing) {
      return ApiResponse.error('Order not found', 404);
    }

    if (existing.buyer_id !== user.id && existing.seller_id !== user.id) {
      return ApiResponse.unauthorized('Not authorized to update this order');
    }

    const { data: order, error } = await (supabase
      .from('orders') as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', parsedOrderId.data)
      .select()
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({
      id: order.id,
      status: order.status,
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

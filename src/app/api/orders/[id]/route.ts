import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';

// GET single order
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const { data: order, error } = await (supabase
      .from('orders') as any)
      .select('*')
      .eq('id', id)
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
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const { status } = await request.json();
    
    if (!status) {
      return ApiResponse.badRequest('Status is required');
    }

    // Verify user is buyer or seller
    const { data: existing } = await (supabase
      .from('orders') as any)
      .select('buyer_id, seller_id')
      .eq('id', id)
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
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({
      id: order.id,
      status: order.status,
      updatedAt: order.updated_at,
    });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';

// GET orders for a user
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return ApiResponse.badRequest('userId is required');
    }
    if (userId !== user.id) {
      return ApiResponse.forbidden('Not authorized to view these orders');
    }

    const { data: orders, error } = await (supabase
      .from('orders') as any)
      .select('*')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id},driver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    // Transform to match frontend format
    const typedOrders = orders as unknown as Array<{
      id: string;
      listing_id: number;
      listing_snapshot: any;
      buyer_id: string;
      buyer_name: string;
      seller_id: string;
      seller_name: string;
      type: 'delivery' | 'pickup';
      status: 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled';
      driver_id: string | null;
      driver_name: string | null;
      delivery_address: string | null;
      delivery_fee: number | null;
      pickup_location_id: string | null;
      pickup_location: any | null;
      scheduled_window: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>;
    
    const transformed = (typedOrders || []).map(o => ({
      id: o.id,
      listingId: o.listing_id,
      listingSnapshot: o.listing_snapshot,
      buyerId: o.buyer_id,
      buyerName: o.buyer_name,
      sellerId: o.seller_id,
      sellerName: o.seller_name,
      type: o.type,
      status: o.status,
      driverId: o.driver_id,
      driverName: o.driver_name,
      deliveryAddress: o.delivery_address,
      deliveryFee: o.delivery_fee,
      pickupLocationId: o.pickup_location_id,
      pickupLocation: o.pickup_location,
      scheduledWindow: o.scheduled_window,
      notes: o.notes,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    }));

    return ApiResponse.success(transformed);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// POST new order
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await request.json();
    const { 
      listingId, 
      listingSnapshot,
      buyerId, 
      buyerName, 
      sellerId, 
      sellerName, 
      type,
      driverId,
      driverName,
      deliveryAddress,
      deliveryFee,
      pickupLocationId,
      pickupLocation,
      scheduledWindow,
      notes
    } = body;

    if (!listingId || !buyerId || !sellerId || !type) {
      return ApiResponse.badRequest('Missing required fields');
    }
    if (buyerId !== user.id) {
      return ApiResponse.forbidden('Not authorized to create this order');
    }

    const { data: order, error } = await (supabase
      .from('orders') as any)
      .insert({
        listing_id: listingId,
        listing_snapshot: listingSnapshot,
        buyer_id: buyerId,
        buyer_name: buyerName,
        seller_id: sellerId,
        seller_name: sellerName,
        type,
        driver_id: driverId,
        driver_name: driverName,
        delivery_address: deliveryAddress,
        delivery_fee: deliveryFee,
        pickup_location_id: pickupLocationId,
        pickup_location: pickupLocation,
        scheduled_window: scheduledWindow,
        notes,
      })
      .select()
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
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
    }, 201);
  } catch (error) {
    console.error('Orders POST error:', error);
    return ApiResponse.serverError(error);
  }
}

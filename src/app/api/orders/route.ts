import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { sanitizeOptionalText, sanitizeText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const userIdSchema = z.string().uuid();
const orderCreateSchema = z.object({
  listingId: z.coerce.number().int().positive(),
  listingSnapshot: z.record(z.unknown()),
  buyerId: z.string().uuid(),
  buyerName: z.string().min(1).max(100),
  sellerId: z.string().uuid(),
  sellerName: z.string().min(1).max(100),
  type: z.enum(['delivery', 'pickup']),
  driverId: z.string().uuid().nullable().optional(),
  driverName: z.string().max(100).nullable().optional(),
  deliveryAddress: z.string().max(500).nullable().optional(),
  deliveryFee: z.coerce.number().min(0).nullable().optional(),
  pickupLocationId: z.string().max(100).nullable().optional(),
  pickupLocation: z.record(z.unknown()).nullable().optional(),
  scheduledWindow: z.string().max(120).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

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
    
    const parsedUserId = userIdSchema.safeParse(userId);
    if (!parsedUserId.success) {
      return ApiResponse.badRequest('userId is required');
    }
    if (parsedUserId.data !== user.id) {
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
      payment_status: 'pending' | 'requires_payment' | 'paid' | 'failed' | 'refunded';
      payment_amount: number | null;
      payment_currency: string | null;
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
      paymentStatus: o.payment_status,
      paymentAmount: o.payment_amount,
      paymentCurrency: o.payment_currency,
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

    const body = await readJsonBody(request);
    const parsed = orderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid order payload', parsed.error.flatten());
    }
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
      notes,
    } = parsed.data;

    if (buyerId !== user.id) {
      return ApiResponse.forbidden('Not authorized to create this order');
    }

    const { data: order, error } = await (supabase
      .from('orders') as any)
      .insert({
        listing_id: listingId,
        listing_snapshot: listingSnapshot,
        buyer_id: buyerId,
        buyer_name: sanitizeText(buyerName, 100),
        seller_id: sellerId,
        seller_name: sanitizeText(sellerName, 100),
        type,
        driver_id: driverId,
        driver_name: sanitizeOptionalText(driverName, 100),
        delivery_address: sanitizeOptionalText(deliveryAddress, 500),
        delivery_fee: deliveryFee,
        pickup_location_id: pickupLocationId,
        pickup_location: pickupLocation,
        scheduled_window: sanitizeOptionalText(scheduledWindow, 120),
        notes: sanitizeOptionalText(notes, 1000),
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
      paymentStatus: order.payment_status,
      paymentAmount: order.payment_amount,
      paymentCurrency: order.payment_currency,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    console.error('Orders POST error:', error);
    return ApiResponse.serverError(error);
  }
}

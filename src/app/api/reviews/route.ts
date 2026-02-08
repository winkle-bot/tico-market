import { ApiResponse } from '@/lib/api-response';
import { sanitizeOptionalText, sanitizeText } from '@/lib/security';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const createReviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1500).optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    const buyerId = searchParams.get('buyerId');
    const listingId = searchParams.get('listingId');

    let query = supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (sellerId) query = query.eq('seller_id', sellerId);
    if (buyerId) query = query.eq('buyer_id', buyerId);
    if (listingId) query = query.eq('listing_id', Number(listingId));

    const { data, error } = await query;
    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    const transformed = (data || []).map((review: any) => ({
      id: review.id,
      orderId: review.order_id,
      listingId: review.listing_id,
      sellerId: review.seller_id,
      buyerId: review.buyer_id,
      buyerName: review.buyer_name,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
    }));

    return ApiResponse.success(transformed);
  } catch (error) {
    return ApiResponse.serverError(error);
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
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid review payload', parsed.error.flatten());
    }

    const { orderId, rating, comment } = parsed.data;

    const { data: order, error: orderError } = await (supabase
      .from('orders') as any)
      .select('id, listing_id, buyer_id, buyer_name, seller_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return ApiResponse.notFound('Order not found');
    }

    if (order.buyer_id !== user.id) {
      return ApiResponse.forbidden('Only the buyer can leave a review');
    }

    if (order.status !== 'completed') {
      return ApiResponse.badRequest('Reviews can only be left for completed orders');
    }

    const { data: existingReview } = await (supabase
      .from('reviews') as any)
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existingReview) {
      return ApiResponse.badRequest('Review already exists for this order');
    }

    const { data: inserted, error: insertError } = await (supabase
      .from('reviews') as any)
      .insert({
        order_id: order.id,
        listing_id: order.listing_id,
        seller_id: order.seller_id,
        buyer_id: order.buyer_id,
        buyer_name: sanitizeText(order.buyer_name || 'Buyer', 100),
        rating,
        comment: sanitizeOptionalText(comment, 1500),
      })
      .select('*')
      .single();

    if (insertError) {
      return ApiResponse.error(insertError.message, 500);
    }

    return ApiResponse.success({
      id: inserted.id,
      orderId: inserted.order_id,
      listingId: inserted.listing_id,
      sellerId: inserted.seller_id,
      buyerId: inserted.buyer_id,
      buyerName: inserted.buyer_name,
      rating: inserted.rating,
      comment: inserted.comment,
      createdAt: inserted.created_at,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

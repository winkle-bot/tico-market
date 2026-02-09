import { ApiResponse } from '@/lib/api-response';
import { calculateIvaCents, parseColonPriceToCents } from '@/lib/payments';
import { getStripeClient, getStripeCurrency } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const checkoutSchema = z.object({
  orderId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await readJsonBody(request);
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid checkout payload', parsed.error.flatten());
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', parsed.data.orderId)
      .single();

    if (orderError || !order) {
      return ApiResponse.notFound('Order not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderRecord = order as any;
    if (orderRecord.buyer_id !== user.id) {
      return ApiResponse.forbidden('Not authorized to checkout this order');
    }

    const itemAmount = parseColonPriceToCents(orderRecord.listing_snapshot?.price || '');
    const deliveryFee = Number.isFinite(orderRecord.delivery_fee) ? Number(orderRecord.delivery_fee) : 0;
    const deliveryAmount = deliveryFee > 0 ? deliveryFee * 100 : 0;
    const subtotalAmount = itemAmount + deliveryAmount;
    const ivaAmount = calculateIvaCents(subtotalAmount);
    const totalAmount = subtotalAmount + ivaAmount;

    if (totalAmount <= 0) {
      return ApiResponse.badRequest('Order amount must be greater than zero');
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) {
      return ApiResponse.serverError('NEXT_PUBLIC_SITE_URL is required for Stripe checkout redirects');
    }

    const stripe = getStripeClient();
    const currency = getStripeCurrency();
    const listingTitle = String(orderRecord.listing_snapshot?.title || `Order ${orderRecord.id}`);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: listingTitle,
            },
            unit_amount: itemAmount,
          },
          quantity: 1,
        },
        ...(deliveryAmount > 0 ? [{
          price_data: {
            currency,
            product_data: {
              name: 'Delivery fee',
            },
            unit_amount: deliveryAmount,
          },
          quantity: 1,
        }] : []),
        ...(ivaAmount > 0 ? [{
          price_data: {
            currency,
            product_data: {
              name: 'IVA (13%)',
            },
            unit_amount: ivaAmount,
          },
          quantity: 1,
        }] : []),
      ],
      metadata: {
        orderId: orderRecord.id,
        buyerId: orderRecord.buyer_id,
        sellerId: orderRecord.seller_id,
      },
      success_url: `${origin}/account?payment=success&orderId=${orderRecord.id}`,
      cancel_url: `${origin}/listing/${orderRecord.listing_id}?payment=cancelled&orderId=${orderRecord.id}`,
    });

    if (!session.url) {
      return ApiResponse.serverError('Stripe checkout session URL missing');
    }

    await supabase
      .from('orders')
      .update({
        payment_status: 'requires_payment',
        stripe_checkout_session_id: session.id,
        payment_amount: totalAmount,
        payment_currency: currency,
      } as never)
      .eq('id', orderRecord.id);

    return ApiResponse.success({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

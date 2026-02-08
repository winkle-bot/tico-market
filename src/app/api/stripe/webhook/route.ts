import Stripe from 'stripe';
import { ApiResponse } from '@/lib/api-response';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { getStripeClient } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return ApiResponse.badRequest('Missing Stripe webhook signature');
    }

    const payload = await request.text();
    const stripe = getStripeClient();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid webhook signature';
      return ApiResponse.badRequest(message);
    }

    const admin = createSupabaseAdminClient();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await (admin
          .from('orders') as any)
          .update({
            payment_status: 'paid',
            status: 'confirmed',
            stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await (admin
          .from('orders') as any)
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);
      }
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
      if (paymentIntentId) {
        await (admin
          .from('orders') as any)
          .update({
            payment_status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntentId);
      }
    }

    return ApiResponse.success({ received: true });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

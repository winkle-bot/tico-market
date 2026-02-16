import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const subscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
});

// POST save push subscription
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return ApiResponse.unauthorized('Must be logged in');

    const body = await readJsonBody(request);
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid subscription data', parsed.error.flatten());
    }

    const { endpoint, p256dh, auth } = parsed.data;

    // Upsert subscription (unique on user_id + endpoint)
    const { error } = await (supabase
      .from('push_subscriptions') as any)
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
        },
        { onConflict: 'user_id,endpoint' }
      );

    if (error) return ApiResponse.error(error.message, 500);

    return ApiResponse.success({ subscribed: true }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

// DELETE remove push subscription
export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return ApiResponse.unauthorized('Must be logged in');

    const body = await readJsonBody(request);
    const parsed = unsubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid unsubscribe data');
    }

    await (supabase
      .from('push_subscriptions') as any)
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', parsed.data.endpoint);

    return ApiResponse.success({ unsubscribed: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

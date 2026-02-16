import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const prefsSchema = z.object({
  pushMessages: z.boolean().optional(),
  pushOrders: z.boolean().optional(),
  pushDelivery: z.boolean().optional(),
  whatsappMessages: z.boolean().optional(),
  whatsappOrders: z.boolean().optional(),
  phoneNumber: z.string().max(20).regex(/^\+?[0-9\s-]+$/).optional().nullable(),
  whatsappOptedIn: z.boolean().optional(),
});

// GET notification preferences
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return ApiResponse.unauthorized('Must be logged in');

    const { data: profile } = await (supabase
      .from('profiles') as any)
      .select('notification_prefs, phone_number, whatsapp_opted_in')
      .eq('id', user.id)
      .single();

    const prefs = profile?.notification_prefs || {};

    return ApiResponse.success({
      pushMessages: prefs.push_messages ?? true,
      pushOrders: prefs.push_orders ?? true,
      pushDelivery: prefs.push_delivery ?? true,
      whatsappMessages: prefs.whatsapp_messages ?? false,
      whatsappOrders: prefs.whatsapp_orders ?? false,
      phoneNumber: profile?.phone_number || null,
      whatsappOptedIn: profile?.whatsapp_opted_in || false,
    });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// PATCH update notification preferences
export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return ApiResponse.unauthorized('Must be logged in');

    const body = await readJsonBody(request);
    const parsed = prefsSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid preferences', parsed.error.flatten());
    }

    const updates: Record<string, unknown> = {};

    // Build notification_prefs JSONB update
    const { data: profile } = await (supabase
      .from('profiles') as any)
      .select('notification_prefs')
      .eq('id', user.id)
      .single();

    const currentPrefs = profile?.notification_prefs || {};
    const newPrefs = { ...currentPrefs };

    if (parsed.data.pushMessages !== undefined) newPrefs.push_messages = parsed.data.pushMessages;
    if (parsed.data.pushOrders !== undefined) newPrefs.push_orders = parsed.data.pushOrders;
    if (parsed.data.pushDelivery !== undefined) newPrefs.push_delivery = parsed.data.pushDelivery;
    if (parsed.data.whatsappMessages !== undefined) newPrefs.whatsapp_messages = parsed.data.whatsappMessages;
    if (parsed.data.whatsappOrders !== undefined) newPrefs.whatsapp_orders = parsed.data.whatsappOrders;

    updates.notification_prefs = newPrefs;

    if (parsed.data.phoneNumber !== undefined) {
      updates.phone_number = parsed.data.phoneNumber;
    }
    if (parsed.data.whatsappOptedIn !== undefined) {
      updates.whatsapp_opted_in = parsed.data.whatsappOptedIn;
    }

    const { error } = await (supabase
      .from('profiles') as any)
      .update(updates)
      .eq('id', user.id);

    if (error) return ApiResponse.error(error.message, 500);

    return ApiResponse.success({ updated: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

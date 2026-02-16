import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { sanitizeText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const DISPUTABLE_STATUSES = ['confirmed', 'in_transit', 'completed'];

const disputeCreateSchema = z.object({
  orderId: z.string().min(3).max(120),
  reason: z.enum([
    'item_not_received', 'item_not_as_described', 'damaged',
    'wrong_item', 'seller_unresponsive', 'other',
  ]),
  description: z.string().min(10).max(2000),
  evidenceUrls: z.array(z.string().url().max(500)).max(5).optional(),
});

// GET disputes for current user
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return ApiResponse.unauthorized('Must be logged in');

    const { data: disputes, error } = await supabase
      .from('disputes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return ApiResponse.error(error.message, 500);

    const formatted = (disputes || []).map((d: any) => ({
      id: d.id,
      orderId: d.order_id,
      openedBy: d.opened_by,
      reason: d.reason,
      description: d.description,
      status: d.status,
      resolutionNotes: d.resolution_notes,
      resolvedBy: d.resolved_by,
      resolvedAt: d.resolved_at,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    return ApiResponse.success(formatted);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// POST open a dispute
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return ApiResponse.unauthorized('Must be logged in');

    const body = await readJsonBody(request);
    const parsed = disputeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid dispute data', parsed.error.flatten());
    }

    const { orderId, reason, description, evidenceUrls } = parsed.data;

    // Verify order exists and user is a party
    const { data: order } = await (supabase
      .from('orders') as any)
      .select('id, buyer_id, seller_id, status')
      .eq('id', orderId)
      .single();

    if (!order) return ApiResponse.error('Order not found', 404);

    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;
    if (!isBuyer && !isSeller) {
      return ApiResponse.forbidden('Not authorized to dispute this order');
    }

    if (!DISPUTABLE_STATUSES.includes(order.status)) {
      return ApiResponse.badRequest(`Cannot dispute an order with status "${order.status}"`);
    }

    // Check no active dispute exists
    const { data: existing } = await (supabase
      .from('disputes') as any)
      .select('id')
      .eq('order_id', orderId)
      .not('status', 'in', '("resolved_buyer","resolved_seller","resolved_refund","closed")')
      .limit(1);

    if (existing && existing.length > 0) {
      return ApiResponse.badRequest('An active dispute already exists for this order');
    }

    // Create dispute
    const { data: dispute, error } = await (supabase
      .from('disputes') as any)
      .insert({
        order_id: orderId,
        opened_by: user.id,
        reason,
        description: sanitizeText(description, 2000),
      })
      .select()
      .single();

    if (error) return ApiResponse.error(error.message, 500);

    // Add initial evidence as first message if provided
    if (evidenceUrls && evidenceUrls.length > 0) {
      await (supabase.from('dispute_messages') as any).insert({
        dispute_id: dispute.id,
        sender_id: user.id,
        sender_role: isBuyer ? 'buyer' : 'seller',
        text: 'Initial evidence attached.',
        evidence_urls: evidenceUrls,
      });
    }

    return ApiResponse.success({
      id: dispute.id,
      orderId: dispute.order_id,
      openedBy: dispute.opened_by,
      reason: dispute.reason,
      description: dispute.description,
      status: dispute.status,
      createdAt: dispute.created_at,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

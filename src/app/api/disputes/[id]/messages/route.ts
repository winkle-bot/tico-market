import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { sanitizeText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const disputeIdSchema = z.string().uuid();

const messageSchema = z.object({
  text: z.string().min(1).max(2000),
  evidenceUrls: z.array(z.string().url().max(500)).max(5).optional(),
});

// POST add message to dispute
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return ApiResponse.unauthorized('Must be logged in');

    const parsedId = disputeIdSchema.safeParse(id);
    if (!parsedId.success) return ApiResponse.badRequest('Invalid dispute id');

    const body = await readJsonBody(request);
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid message', parsed.error.flatten());
    }

    // Fetch dispute and order to determine sender role
    const { data: dispute } = await (supabase
      .from('disputes') as any)
      .select('id, order_id, status')
      .eq('id', parsedId.data)
      .single();

    if (!dispute) return ApiResponse.error('Dispute not found', 404);

    if (dispute.status === 'closed' || dispute.status.startsWith('resolved_')) {
      return ApiResponse.badRequest('Cannot add messages to a resolved dispute');
    }

    const { data: order } = await (supabase
      .from('orders') as any)
      .select('buyer_id, seller_id')
      .eq('id', dispute.order_id)
      .single();

    if (!order) return ApiResponse.error('Order not found', 404);

    // Determine role
    let senderRole: 'buyer' | 'seller' | 'admin';
    if (order.buyer_id === user.id) {
      senderRole = 'buyer';
    } else if (order.seller_id === user.id) {
      senderRole = 'seller';
    } else {
      // Check if admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if ((profile as any)?.role === 'admin' || (profile as any)?.role === 'moderator') {
        senderRole = 'admin';
      } else {
        return ApiResponse.forbidden('Not authorized to message in this dispute');
      }
    }

    const { data: message, error } = await (supabase
      .from('dispute_messages') as any)
      .insert({
        dispute_id: parsedId.data,
        sender_id: user.id,
        sender_role: senderRole,
        text: sanitizeText(parsed.data.text, 2000),
        evidence_urls: parsed.data.evidenceUrls || [],
      })
      .select()
      .single();

    if (error) return ApiResponse.error(error.message, 500);

    return ApiResponse.success({
      id: message.id,
      disputeId: message.dispute_id,
      senderId: message.sender_id,
      senderRole: message.sender_role,
      text: message.text,
      evidenceUrls: message.evidence_urls || [],
      createdAt: message.created_at,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { z } from 'zod';

const disputeIdSchema = z.string().uuid();

// GET single dispute with messages
export async function GET(
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

    // Fetch dispute (RLS handles access control)
    const { data: dispute, error } = await (supabase
      .from('disputes') as any)
      .select('*')
      .eq('id', parsedId.data)
      .single();

    if (error || !dispute) return ApiResponse.error('Dispute not found', 404);

    // Fetch messages
    const { data: messages } = await (supabase
      .from('dispute_messages') as any)
      .select('*, profiles:sender_id(name)')
      .eq('dispute_id', parsedId.data)
      .order('created_at', { ascending: true });

    // Fetch order summary for context
    const { data: order } = await (supabase
      .from('orders') as any)
      .select('id, buyer_id, buyer_name, seller_id, seller_name, status, listing_snapshot')
      .eq('id', dispute.order_id)
      .single();

    return ApiResponse.success({
      dispute: {
        id: dispute.id,
        orderId: dispute.order_id,
        openedBy: dispute.opened_by,
        reason: dispute.reason,
        description: dispute.description,
        status: dispute.status,
        resolutionNotes: dispute.resolution_notes,
        resolvedBy: dispute.resolved_by,
        resolvedAt: dispute.resolved_at,
        createdAt: dispute.created_at,
        updatedAt: dispute.updated_at,
      },
      messages: (messages || []).map((m: any) => ({
        id: m.id,
        disputeId: m.dispute_id,
        senderId: m.sender_id,
        senderRole: m.sender_role,
        senderName: m.profiles?.name || 'Unknown',
        text: m.text,
        evidenceUrls: m.evidence_urls || [],
        createdAt: m.created_at,
      })),
      order: order ? {
        id: order.id,
        buyerId: order.buyer_id,
        buyerName: order.buyer_name,
        sellerId: order.seller_id,
        sellerName: order.seller_name,
        status: order.status,
        listingTitle: (order.listing_snapshot as any)?.title || 'Unknown',
      } : null,
    });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

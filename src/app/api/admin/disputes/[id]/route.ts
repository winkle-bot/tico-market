import { ApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/lib/admin';
import { sanitizeText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const disputeIdSchema = z.string().uuid();

const resolveSchema = z.object({
  status: z.enum(['resolved_buyer', 'resolved_seller', 'resolved_refund', 'closed']),
  resolutionNotes: z.string().min(1).max(2000),
});

// PATCH resolve a dispute (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error, supabase, user } = await requireAdmin();
    if (error) return error;

    const parsedId = disputeIdSchema.safeParse(id);
    if (!parsedId.success) return ApiResponse.badRequest('Invalid dispute id');

    const body = await readJsonBody(request);
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid resolution data', parsed.error.flatten());
    }

    // Verify dispute exists
    const { data: dispute } = await (supabase
      .from('disputes') as any)
      .select('id, order_id, status')
      .eq('id', parsedId.data)
      .single();

    if (!dispute) return ApiResponse.error('Dispute not found', 404);

    if (dispute.status.startsWith('resolved_') || dispute.status === 'closed') {
      return ApiResponse.badRequest('Dispute is already resolved');
    }

    const now = new Date().toISOString();

    // Update dispute
    const { data: updated, error: updateError } = await (supabase
      .from('disputes') as any)
      .update({
        status: parsed.data.status,
        resolution_notes: sanitizeText(parsed.data.resolutionNotes, 2000),
        resolved_by: user!.id,
        resolved_at: now,
        updated_at: now,
      })
      .eq('id', parsedId.data)
      .select()
      .single();

    if (updateError) return ApiResponse.error(updateError.message, 500);

    // If resolved as refund, update order payment_status
    if (parsed.data.status === 'resolved_refund') {
      await (supabase
        .from('orders') as any)
        .update({ payment_status: 'refunded', updated_at: now })
        .eq('id', dispute.order_id);
    }

    return ApiResponse.success({
      id: updated.id,
      orderId: updated.order_id,
      status: updated.status,
      resolutionNotes: updated.resolution_notes,
      resolvedBy: updated.resolved_by,
      resolvedAt: updated.resolved_at,
      updatedAt: updated.updated_at,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

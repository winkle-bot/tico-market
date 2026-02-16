import { ApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/lib/admin';

export async function GET() {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { data: disputes, error: queryError } = await (supabase
      .from('disputes') as any)
      .select('*, orders!inner(id, buyer_id, buyer_name, seller_id, seller_name, status, listing_snapshot)')
      .order('created_at', { ascending: false });

    if (queryError) {
      return ApiResponse.error(queryError.message, 500);
    }

    return ApiResponse.success((disputes || []).map((d: any) => ({
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
      order: d.orders ? {
        id: d.orders.id,
        buyerId: d.orders.buyer_id,
        buyerName: d.orders.buyer_name,
        sellerId: d.orders.seller_id,
        sellerName: d.orders.seller_name,
        status: d.orders.status,
        listingTitle: d.orders.listing_snapshot?.title || 'Unknown',
      } : null,
    })));
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

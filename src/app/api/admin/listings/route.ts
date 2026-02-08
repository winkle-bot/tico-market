import { ApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/lib/admin';

export async function GET() {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { data, error: queryError } = await supabase
      .from('listings')
      .select('id, title, seller_id, owner, price, category, moderation_status, created_at')
      .order('created_at', { ascending: false });

    if (queryError) {
      return ApiResponse.error(queryError.message, 500);
    }

    const transformed = ((data || []) as Array<any>).map((listing) => ({
      id: listing.id,
      title: listing.title,
      sellerId: listing.seller_id,
      owner: listing.owner,
      price: listing.price,
      category: listing.category,
      moderationStatus: listing.moderation_status,
      createdAt: listing.created_at,
    }));

    return ApiResponse.success(transformed);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

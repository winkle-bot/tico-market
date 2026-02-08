import { ApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/lib/admin';

export async function GET() {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { data, error: queryError } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (queryError) {
      return ApiResponse.error(queryError.message, 500);
    }

    return ApiResponse.success((data || []).map((report: any) => ({
      id: report.id,
      reporterId: report.reporter_id,
      targetType: report.target_type,
      targetListingId: report.target_listing_id,
      targetUserId: report.target_user_id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      reviewedBy: report.reviewed_by,
      reviewedAt: report.reviewed_at,
      createdAt: report.created_at,
    })));
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

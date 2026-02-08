import { ApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/lib/admin';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const reportStatusSchema = z.object({
  status: z.enum(['open', 'resolved', 'dismissed']),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reportId = Number(id);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return ApiResponse.badRequest('Invalid report id');
    }

    const { error, supabase, user } = await requireAdmin();
    if (error || !user) return error || ApiResponse.forbidden('Admin access required');

    const body = await readJsonBody(request);
    const parsed = reportStatusSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid report update payload', parsed.error.flatten());
    }

    const { data, error: updateError } = await (supabase.from('reports') as any)
      .update({
        status: parsed.data.status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select('id, status, reviewed_at')
      .single();

    if (updateError) {
      return ApiResponse.error(updateError.message, 500);
    }

    return ApiResponse.success({
      id: data.id,
      status: data.status,
      reviewedAt: data.reviewed_at,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

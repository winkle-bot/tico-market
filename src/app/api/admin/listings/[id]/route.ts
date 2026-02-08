import { ApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/lib/admin';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const listingModerationSchema = z.object({
  moderationStatus: z.enum(['active', 'hidden']),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listingId = Number(id);
    if (!Number.isInteger(listingId) || listingId <= 0) {
      return ApiResponse.badRequest('Invalid listing id');
    }

    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const body = await readJsonBody(request);
    const parsed = listingModerationSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid moderation payload', parsed.error.flatten());
    }

    const { data, error: updateError } = await (supabase.from('listings') as any)
      .update({ moderation_status: parsed.data.moderationStatus })
      .eq('id', listingId)
      .select('id, moderation_status')
      .single();

    if (updateError) {
      return ApiResponse.error(updateError.message, 500);
    }

    return ApiResponse.success({
      id: data.id,
      moderationStatus: data.moderation_status,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

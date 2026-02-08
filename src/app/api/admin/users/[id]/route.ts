import { ApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/lib/admin';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const userModerationSchema = z.object({
  role: z.enum(['user', 'admin', 'moderator']).optional(),
  verified: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return ApiResponse.badRequest('Invalid user id');
    }

    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const body = await readJsonBody(request);
    const parsed = userModerationSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid user moderation payload', parsed.error.flatten());
    }

    if (!parsed.data.role && parsed.data.verified === undefined) {
      return ApiResponse.badRequest('No updates provided');
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.role) updateData.role = parsed.data.role;
    if (parsed.data.verified !== undefined) updateData.verified = parsed.data.verified;

    const { data, error: updateError } = await (supabase.from('profiles') as any)
      .update(updateData)
      .eq('id', id)
      .select('id, role, verified')
      .single();

    if (updateError) {
      return ApiResponse.error(updateError.message, 500);
    }

    return ApiResponse.success({
      id: data.id,
      role: data.role,
      verified: data.verified,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

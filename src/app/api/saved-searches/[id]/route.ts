import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { z } from 'zod';

const savedSearchIdSchema = z.string().uuid();

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const { id } = await params;
    const parsedId = savedSearchIdSchema.safeParse(id);
    if (!parsedId.success) {
      return ApiResponse.badRequest('Invalid saved search id');
    }

    const { error } = await (supabase
      .from('saved_searches') as any)
      .delete()
      .eq('id', parsedId.data)
      .eq('user_id', user.id);

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({ deleted: true, id: parsedId.data });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/saved-searches/[id]', method: 'DELETE' });
  }
}

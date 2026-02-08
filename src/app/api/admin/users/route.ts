import { ApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/lib/admin';

export async function GET() {
  try {
    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('id, email, name, role, verified, created_at')
      .order('created_at', { ascending: false });

    if (queryError) {
      return ApiResponse.error(queryError.message, 500);
    }

    return ApiResponse.success(((data || []) as Array<any>).map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      verified: user.verified,
      createdAt: user.created_at,
    })));
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

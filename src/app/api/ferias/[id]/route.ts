import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';

// GET single feria by id or slug
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Try by UUID first, then by slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const { data: feria, error } = await supabase
      .from('ferias')
      .select('*')
      .eq(isUuid ? 'id' : 'slug', id)
      .single();

    if (error || !feria) {
      return ApiResponse.error('Feria not found', 404);
    }

    // Also fetch vendors
    const { data: vendors } = await supabase
      .from('feria_vendors')
      .select('*, profiles:vendor_id(name, rating, verified)')
      .eq('feria_id', (feria as any).id)
      .eq('status', 'approved');

    // Fetch follower count
    const { count: followerCount } = await supabase
      .from('feria_followers')
      .select('*', { count: 'exact', head: true })
      .eq('feria_id', (feria as any).id);

    let isFollowing = false;

    if (user) {
      const { data: follower } = await supabase
        .from('feria_followers')
        .select('id')
        .eq('feria_id', (feria as any).id)
        .eq('user_id', user.id)
        .maybeSingle();

      isFollowing = Boolean(follower);
    }

    const payload = {
      ...(feria as Record<string, unknown>),
      vendors: vendors || [],
      follower_count: followerCount || 0,
      is_following: isFollowing,
    };

    if (!user) {
      return ApiResponse.cached(payload);
    }

    return ApiResponse.success(payload);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

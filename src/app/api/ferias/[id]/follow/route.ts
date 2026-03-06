import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';

async function resolveFeriaId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  identifier: string
) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  const { data: feria, error } = await supabase
    .from('ferias')
    .select('id')
    .eq(isUuid ? 'id' : 'slug', identifier)
    .single();

  if (error || !feria) {
    return null;
  }

  return (feria as { id: string }).id;
}

async function buildFollowResponse(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  feriaId: string,
  isFollowing: boolean
) {
  const { count, error } = await supabase
    .from('feria_followers')
    .select('*', { count: 'exact', head: true })
    .eq('feria_id', feriaId);

  if (error) {
    return ApiResponse.error(error.message, 500);
  }

  return ApiResponse.success({
    feriaId,
    isFollowing,
    followerCount: count || 0,
  });
}

export async function POST(
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
    const feriaId = await resolveFeriaId(supabase, id);
    if (!feriaId) {
      return ApiResponse.notFound('Feria not found');
    }

    const { error } = await (supabase
      .from('feria_followers') as any)
      .upsert(
        {
          feria_id: feriaId,
          user_id: user.id,
        },
        { onConflict: 'feria_id,user_id', ignoreDuplicates: true }
      );

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return buildFollowResponse(supabase, feriaId, true);
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/ferias/[id]/follow', method: 'POST' });
  }
}

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
    const feriaId = await resolveFeriaId(supabase, id);
    if (!feriaId) {
      return ApiResponse.notFound('Feria not found');
    }

    const { error } = await (supabase
      .from('feria_followers') as any)
      .delete()
      .eq('feria_id', feriaId)
      .eq('user_id', user.id);

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return buildFollowResponse(supabase, feriaId, false);
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/ferias/[id]/follow', method: 'DELETE' });
  }
}

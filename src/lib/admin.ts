import { ApiResponse } from '@/lib/api-response';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: ApiResponse.unauthorized('Must be logged in'), supabase, user: null };
  }

  const { data: profile, error } = await (supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as { data: { role: string } | null; error: any };

  if (error || !profile) {
    return { error: ApiResponse.forbidden('Admin access required'), supabase, user };
  }

  const role = profile.role as string;
  if (role !== 'admin' && role !== 'moderator') {
    return { error: ApiResponse.forbidden('Admin access required'), supabase, user };
  }

  return { error: null, supabase, user };
}

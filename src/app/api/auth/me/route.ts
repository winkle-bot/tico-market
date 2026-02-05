import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return ApiResponse.unauthorized('Not authenticated');
    }

    // Get user profile with favorites
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        favorites:favorites(listing_id)
      `)
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return ApiResponse.error(profileError.message, 500);
    }

    // Format favorites as array of IDs
    const favorites = profile.favorites?.map((f: any) => f.listing_id) || [];

    return ApiResponse.success({
      ...profile,
      favorites
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return ApiResponse.serverError(error);
  }
}

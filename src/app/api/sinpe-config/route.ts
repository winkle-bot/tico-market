/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await (supabase
      .from('sinpe_config') as any)
      .select('*')
      .eq('is_enabled', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    if (!data) {
      return ApiResponse.success({ data: null });
    }

    return ApiResponse.success({
      data: {
        id: data.id,
        label: data.label,
        phoneNumber: data.phone_number,
        accountHolder: data.account_holder,
        instructions: data.instructions || undefined,
        isEnabled: data.is_enabled,
      },
    });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/sinpe-config', method: 'GET' });
  }
}

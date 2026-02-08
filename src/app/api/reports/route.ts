import { ApiResponse } from '@/lib/api-response';
import { sanitizeOptionalText, sanitizeText } from '@/lib/security';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const reportSchema = z.object({
  targetType: z.enum(['listing', 'user']),
  targetListingId: z.coerce.number().int().positive().optional(),
  targetUserId: z.string().uuid().optional(),
  reason: z.string().min(5).max(500),
  details: z.string().max(1500).optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    let query = supabase.from('reports').select('*').order('created_at', { ascending: false });

    if (all) {
      const { data: profile } = await (supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()) as { data: { role: string } | null };
      const role = profile?.role;
      if (role !== 'admin' && role !== 'moderator') {
        return ApiResponse.forbidden('Admin access required');
      }
    } else {
      query = query.eq('reporter_id', user.id);
    }

    const { data, error } = await query;
    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    const transformed = (data || []).map((report: any) => ({
      id: report.id,
      reporterId: report.reporter_id,
      targetType: report.target_type,
      targetListingId: report.target_listing_id,
      targetUserId: report.target_user_id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      reviewedBy: report.reviewed_by,
      reviewedAt: report.reviewed_at,
      createdAt: report.created_at,
    }));

    return ApiResponse.success(transformed);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await readJsonBody(request);
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid report payload', parsed.error.flatten());
    }

    const payload = parsed.data;
    if (payload.targetType === 'listing' && !payload.targetListingId) {
      return ApiResponse.badRequest('targetListingId is required for listing reports');
    }
    if (payload.targetType === 'user' && !payload.targetUserId) {
      return ApiResponse.badRequest('targetUserId is required for user reports');
    }

    const { data, error } = await (supabase.from('reports') as any)
      .insert({
        reporter_id: user.id,
        target_type: payload.targetType,
        target_listing_id: payload.targetType === 'listing' ? payload.targetListingId : null,
        target_user_id: payload.targetType === 'user' ? payload.targetUserId : null,
        reason: sanitizeText(payload.reason, 500),
        details: sanitizeOptionalText(payload.details, 1500),
      })
      .select('*')
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({
      id: data.id,
      status: data.status,
      createdAt: data.created_at,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
  }
}

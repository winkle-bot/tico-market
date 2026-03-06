import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import {
  buildSavedSearchFingerprint,
  buildSavedSearchName,
  normalizeSavedSearchCriteria,
  toSavedSearchResponse,
} from '@/lib/saved-searches';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const savedSearchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  query: z.string().trim().max(120).optional().nullable(),
  categories: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
  listingKind: z.enum(['seller', 'driver']).optional().nullable(),
  minPrice: z.number().int().min(0).optional().nullable(),
  maxPrice: z.number().int().min(0).optional().nullable(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'distance']).optional().nullable(),
  alertEnabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const { data, error } = await (supabase
      .from('saved_searches') as any)
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({
      data: ((data || []) as Record<string, unknown>[]).map(toSavedSearchResponse),
    });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/saved-searches', method: 'GET' });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await readJsonBody(request);
    const parsed = savedSearchSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid saved search payload', parsed.error.flatten());
    }

    const normalized = normalizeSavedSearchCriteria(parsed.data);
    const hasMeaningfulCriteria =
      Boolean(normalized.query) ||
      normalized.categories.length > 0 ||
      Boolean(normalized.listingKind) ||
      normalized.minPrice !== null ||
      normalized.maxPrice !== null;

    if (!hasMeaningfulCriteria) {
      return ApiResponse.badRequest('Add a query or filter before saving a search');
    }

    const fingerprint = buildSavedSearchFingerprint(normalized);
    const payload = {
      user_id: user.id,
      name: parsed.data.name?.trim() || buildSavedSearchName(normalized),
      query_text: normalized.query || null,
      categories: normalized.categories,
      listing_kind: normalized.listingKind,
      min_price: normalized.minPrice,
      max_price: normalized.maxPrice,
      sort: normalized.sort,
      alert_enabled: parsed.data.alertEnabled ?? true,
      fingerprint,
    };

    const { data, error } = await (supabase
      .from('saved_searches') as any)
      .upsert(payload, { onConflict: 'user_id,fingerprint' })
      .select('*')
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success(toSavedSearchResponse(data as Record<string, unknown>), 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/saved-searches', method: 'POST' });
  }
}

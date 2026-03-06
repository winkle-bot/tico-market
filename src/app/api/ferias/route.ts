import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { sanitizeText } from '@/lib/security';
import { z } from 'zod';

const createFeriaSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
  locationName: z.string().min(2).max(200),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  wazeLink: z.string().url().max(500).optional(),
  scheduleText: z.string().max(200).optional(),
  scheduleDays: z.array(z.string()).optional(),
  startTime: z.string().max(10).optional(),
  endTime: z.string().max(10).optional(),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.string().email().max(120).optional(),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// GET all ferias
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('active') !== 'false';

    let query = supabase
      .from('ferias')
      .select('*')
      .order('next_date', { ascending: true, nullsFirst: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) return ApiResponse.error(error.message, 500);

    const ferias = (data || []) as Array<Record<string, unknown> & { id: string }>;
    const feriaIds = ferias.map((feria) => feria.id);
    let followerCounts = new Map<string, number>();

    if (feriaIds.length > 0) {
      const { data: followers, error: followersError } = await supabase
        .from('feria_followers')
        .select('feria_id')
        .in('feria_id', feriaIds);

      if (followersError) {
        return ApiResponse.error(followersError.message, 500);
      }

      followerCounts = ((followers || []) as Array<{ feria_id: string }>).reduce((counts, follower) => {
        const feriaId = follower.feria_id as string;
        counts.set(feriaId, (counts.get(feriaId) || 0) + 1);
        return counts;
      }, new Map<string, number>());
    }

    const transformed = ferias.map((feria) => ({
      ...feria,
      follower_count: followerCounts.get(feria.id) || 0,
    }));

    return ApiResponse.cached(transformed);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// POST create feria
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await request.json();
    const parsed = createFeriaSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid feria data', parsed.error.flatten());
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    const d = parsed.data;
    const slug = slugify(d.name) + '-' + Date.now().toString(36);

    const { data: feria, error } = await (supabase.from('ferias') as any)
      .insert({
        name: sanitizeText(d.name, 120),
        slug,
        description: d.description ? sanitizeText(d.description, 2000) : null,
        location_name: sanitizeText(d.locationName, 200),
        location_lat: d.locationLat,
        location_lng: d.locationLng,
        waze_link: d.wazeLink,
        schedule_text: d.scheduleText ? sanitizeText(d.scheduleText, 200) : null,
        schedule_days: d.scheduleDays || [],
        start_time: d.startTime,
        end_time: d.endTime,
        organizer_id: user.id,
        organizer_name: (profile as any)?.name || user.email?.split('@')[0],
        contact_phone: d.contactPhone,
        contact_email: d.contactEmail,
      })
      .select()
      .single();

    if (error) return ApiResponse.error(error.message, 500);
    return ApiResponse.success(feria, 201);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

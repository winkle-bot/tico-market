/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { sanitizeOptionalText, sanitizeText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const eventDriverCreateSchema = z.object({
  eventId: z.string().min(1).max(120),
  eventName: z.string().min(1).max(140),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locationName: z.string().min(1).max(180),
  availabilityStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  availabilityEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const url = new URL(request.url);
    const mine = url.searchParams.get('mine') === 'true';

    let driverId: string | null = null;
    if (mine) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return ApiResponse.unauthorized('Must be logged in');
      }
      driverId = user.id;
    }

    let query = (supabase
      .from('event_drivers') as any)
      .select('*')
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: false });

    if (driverId) {
      query = query.eq('driver_id', driverId);
    }

    const { data, error } = await query;
    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    const transformed = (data || []).map((row: any) => ({
      id: row.id,
      driverId: row.driver_id,
      eventId: row.event_id,
      eventName: row.event_name,
      eventDate: row.event_date,
      locationName: row.location_name,
      availabilityStart: row.availability_start || undefined,
      availabilityEnd: row.availability_end || undefined,
      notes: row.notes || undefined,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return ApiResponse.success({ data: transformed });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/event-drivers', method: 'GET' });
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
    const parsed = eventDriverCreateSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid event driver signup payload', parsed.error.flatten());
    }

    const payload = parsed.data;

    const { data, error } = await (supabase
      .from('event_drivers') as any)
      .upsert({
        driver_id: user.id,
        event_id: sanitizeText(payload.eventId, 120),
        event_name: sanitizeText(payload.eventName, 140),
        event_date: payload.eventDate,
        location_name: sanitizeText(payload.locationName, 180),
        availability_start: sanitizeOptionalText(payload.availabilityStart, 5),
        availability_end: sanitizeOptionalText(payload.availabilityEnd, 5),
        notes: sanitizeOptionalText(payload.notes, 500),
        status: 'pending',
      }, { onConflict: 'driver_id,event_id,event_date' })
      .select('*')
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({
      id: data.id,
      driverId: data.driver_id,
      eventId: data.event_id,
      eventName: data.event_name,
      eventDate: data.event_date,
      locationName: data.location_name,
      availabilityStart: data.availability_start || undefined,
      availabilityEnd: data.availability_end || undefined,
      notes: data.notes || undefined,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/event-drivers', method: 'POST' });
  }
}

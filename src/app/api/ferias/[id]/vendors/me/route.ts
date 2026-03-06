import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { readJsonBody } from '@/lib/validation';
import type { WeeklySchedule } from '@/types';
import { z } from 'zod';

const feriaIdSchema = z.string().min(3).max(120);
const timeRangeSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});
const weeklyAvailabilitySchema = z.object({
  monday: z.array(timeRangeSchema).optional(),
  tuesday: z.array(timeRangeSchema).optional(),
  wednesday: z.array(timeRangeSchema).optional(),
  thursday: z.array(timeRangeSchema).optional(),
  friday: z.array(timeRangeSchema).optional(),
  saturday: z.array(timeRangeSchema).optional(),
  sunday: z.array(timeRangeSchema).optional(),
});

type FeriaRow = { id: string };
type FeriaVendorRow = {
  id: string;
  feria_id: string;
  vendor_id: string;
  status: 'pending' | 'approved' | 'rejected';
  weekly_availability: WeeklySchedule | null;
};
type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function getFeria(
  supabase: SupabaseServerClient,
  id: string
): Promise<{ data: FeriaRow | null; error: { message: string } | null }> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const feriasTable = supabase.from('ferias') as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<{ data: FeriaRow | null; error: { message: string } | null }>;
      };
    };
  };

  return feriasTable.select('id').eq(isUuid ? 'id' : 'slug', id).single();
}

async function getOwnVendorEntry(
  supabase: SupabaseServerClient,
  feriaId: string,
  userId: string
): Promise<{ data: FeriaVendorRow | null; error: { message: string } | null }> {
  const vendorsTable = supabase.from('feria_vendors') as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: FeriaVendorRow | null; error: { message: string } | null }>;
        };
      };
    };
  };

  return vendorsTable
    .select('id, feria_id, vendor_id, status, weekly_availability')
    .eq('feria_id', feriaId)
    .eq('vendor_id', userId)
    .maybeSingle();
}

async function updateVendorAvailability(
  supabase: SupabaseServerClient,
  id: string,
  weeklyAvailability: WeeklySchedule
): Promise<{ data: FeriaVendorRow | null; error: { message: string } | null }> {
  const vendorsTable = supabase.from('feria_vendors') as unknown as {
    update: (payload: { weekly_availability: WeeklySchedule }) => {
      eq: (column: string, value: string) => {
        select: () => {
          single: () => Promise<{ data: FeriaVendorRow | null; error: { message: string } | null }>;
        };
      };
    };
  };

  return vendorsTable
    .update({ weekly_availability: weeklyAvailability })
    .eq('id', id)
    .select()
    .single();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedId = feriaIdSchema.safeParse(id);
    if (!parsedId.success) {
      return ApiResponse.badRequest('Invalid feria id');
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await readJsonBody(request);
    const parsedBody = z.object({ weeklyAvailability: weeklyAvailabilitySchema }).safeParse(body);
    if (!parsedBody.success) {
      return ApiResponse.badRequest('Invalid weekly availability payload', parsedBody.error.flatten());
    }

    const { data: feria, error: feriaError } = await getFeria(supabase, parsedId.data);
    if (feriaError) {
      return ApiResponse.error(feriaError.message, 500);
    }
    if (!feria) {
      return ApiResponse.error('Feria not found', 404);
    }

    const { data: vendorEntry, error: vendorError } = await getOwnVendorEntry(supabase, feria.id, user.id);
    if (vendorError) {
      return ApiResponse.error(vendorError.message, 500);
    }
    if (!vendorEntry) {
      return ApiResponse.forbidden('You are not a vendor in this feria');
    }

    const { data: updated, error: updateError } = await updateVendorAvailability(
      supabase,
      vendorEntry.id,
      parsedBody.data.weeklyAvailability
    );
    if (updateError) {
      return ApiResponse.error(updateError.message, 500);
    }

    return ApiResponse.success({
      id: updated?.id ?? vendorEntry.id,
      feriaId: feria.id,
      weeklyAvailability: updated?.weekly_availability ?? parsedBody.data.weeklyAvailability,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/ferias/[id]/vendors/me', method: 'PATCH' });
  }
}

import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type LiveDriverRow = {
  id: string;
  user_id: string;
  current_lat: number | null;
  current_lng: number | null;
  is_online: boolean | null;
  updated_at: string;
};

async function loadDriverSnapshot(onlyOnline = true) {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('driver_profiles')
    .select('id, user_id, current_lat, current_lng, is_online, updated_at');

  if (onlyOnline) {
    query = query.eq('is_online', true);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as LiveDriverRow[]).map((driver) => ({
    id: driver.id,
    userId: driver.user_id,
    currentLat: driver.current_lat ?? undefined,
    currentLng: driver.current_lng ?? undefined,
    isOnline: Boolean(driver.is_online),
    updatedAt: driver.updated_at,
  }));
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const url = new URL(request.url);
  const onlyOnline = url.searchParams.get('online') !== 'false';

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const initial = await loadDriverSnapshot(onlyOnline);
        send({ type: 'connected', timestamp: Date.now(), drivers: initial });
      } catch {
        send({ type: 'error', message: 'Unable to load initial drivers snapshot' });
      }

      const interval = setInterval(async () => {
        try {
          const drivers = await loadDriverSnapshot(onlyOnline);
          send({ type: 'drivers_snapshot', timestamp: Date.now(), drivers });
        } catch {
          send({ type: 'error', message: 'Unable to refresh drivers snapshot' });
        }
      }, 5000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // no-op
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

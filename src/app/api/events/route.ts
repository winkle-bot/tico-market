import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('userId is required', { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Create a TransformStream for the SSE
  const customReadable = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}
\n`));

      // Subscribe to relevant changes using Supabase Realtime
      const subscription = supabase
        .channel(`user-events-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `buyer_id=eq.${userId} OR seller_id=eq.${userId}`,
          },
          (payload) => {
            const message = `data: ${JSON.stringify({
              type: 'update',
              table: 'messages',
              timestamp: Date.now(),
              payload,
            })}\n\n`;
            try {
              controller.enqueue(encoder.encode(message));
            } catch (e) {
              // Controller might be closed
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `buyer_id=eq.${userId} OR seller_id=eq.${userId} OR driver_id=eq.${userId}`,
          },
          (payload) => {
            const message = `data: ${JSON.stringify({
              type: 'update',
              table: 'orders',
              timestamp: Date.now(),
              payload,
            })}\n\n`;
            try {
              controller.enqueue(encoder.encode(message));
            } catch (e) {
              // Controller might be closed
            }
          }
        )
        .subscribe();

      // Send periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`));
        } catch (e) {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Clean up when the client disconnects
      request.signal.addEventListener('abort', () => {
        subscription.unsubscribe();
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch (e) {}
      });
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

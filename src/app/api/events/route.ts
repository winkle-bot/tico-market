import { NextRequest } from 'next/server';
import { eventBus } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  // Create a TransformStream for the SSE
  const customReadable = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      const onUpdate = (data: any) => {
        // In a real app, we'd filter here based on userId to only send relevant updates
        // For now, we broadcast to everyone connected that the DB updated
        const message = `data: ${JSON.stringify({ type: 'update', timestamp: Date.now() })}\n\n`;
        try {
          controller.enqueue(encoder.encode(message));
        } catch (e) {
          // Controller might be closed
          eventBus.off('db_update', onUpdate);
        }
      };

      eventBus.on('db_update', onUpdate);

      // Clean up when the client disconnects
      request.signal.addEventListener('abort', () => {
        eventBus.off('db_update', onUpdate);
        try {
          controller.close();
        } catch(e) {}
      });
    }
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

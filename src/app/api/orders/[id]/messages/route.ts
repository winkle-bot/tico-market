import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { sanitizeText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { sendPushToUser, sendWhatsAppToUser } from '@/lib/push';
import { z } from 'zod';

const orderIdSchema = z.string().min(3).max(120).regex(/^[a-zA-Z0-9-_]+$/);
const orderMessageSchema = z.object({
  text: z.string().min(1).max(2000),
});

type QueryError = {
  message: string;
};
type OrderRow = {
  id: string;
  buyer_id: string;
  buyer_name: string;
  seller_id: string;
  seller_name: string;
  driver_id: string | null;
  driver_name: string | null;
  listing_snapshot: Record<string, unknown> | null;
};
type OrderMessageRow = {
  id: number;
  order_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  buyer_id: string;
  seller_id: string;
  driver_id: string | null;
  created_at: string;
};
type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function getListingTitle(order: OrderRow): string {
  return typeof order.listing_snapshot?.title === 'string'
    ? order.listing_snapshot.title
    : 'Delivery';
}

function getParticipantName(order: OrderRow, userId: string): string | null {
  if (userId === order.buyer_id) return order.buyer_name;
  if (userId === order.seller_id) return order.seller_name;
  if (userId === order.driver_id) return order.driver_name || 'Driver';
  return null;
}

function isOrderParticipant(order: OrderRow, userId: string): boolean {
  return userId === order.buyer_id || userId === order.seller_id || userId === order.driver_id;
}

async function getOrderById(
  supabase: SupabaseServerClient,
  orderId: string
): Promise<{ data: OrderRow | null; error: QueryError | null }> {
  const ordersTable = supabase.from('orders') as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<{ data: OrderRow | null; error: QueryError | null }>;
      };
    };
  };

  return ordersTable
    .select('id, buyer_id, buyer_name, seller_id, seller_name, driver_id, driver_name, listing_snapshot')
    .eq('id', orderId)
    .single();
}

async function getOrderMessages(
  supabase: SupabaseServerClient,
  orderId: string
): Promise<{ data: OrderMessageRow[] | null; error: QueryError | null }> {
  const orderMessagesTable = supabase.from('order_messages') as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          config: { ascending: boolean }
        ) => Promise<{ data: OrderMessageRow[] | null; error: QueryError | null }>;
      };
    };
  };

  return orderMessagesTable.select('*').eq('order_id', orderId).order('created_at', { ascending: true });
}

async function insertOrderMessage(
  supabase: SupabaseServerClient,
  payload: Record<string, unknown>
): Promise<{ data: OrderMessageRow | null; error: QueryError | null }> {
  const orderMessagesTable = supabase.from('order_messages') as unknown as {
    insert: (nextPayload: Record<string, unknown>) => {
      select: () => {
        single: () => Promise<{ data: OrderMessageRow | null; error: QueryError | null }>;
      };
    };
  };

  return orderMessagesTable.insert(payload).select().single();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const parsedOrderId = orderIdSchema.safeParse(id);
    if (!parsedOrderId.success) {
      return ApiResponse.badRequest('Invalid order id');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const { data: order, error } = await getOrderById(supabase, parsedOrderId.data);
    if (error) {
      return ApiResponse.error(error.message, 500);
    }
    if (!order) {
      return ApiResponse.error('Order not found', 404);
    }
    if (!isOrderParticipant(order, user.id)) {
      return ApiResponse.forbidden('Not authorized to view this delivery room');
    }

    const { data: messages, error: messagesError } = await getOrderMessages(supabase, parsedOrderId.data);
    if (messagesError) {
      return ApiResponse.error(messagesError.message, 500);
    }

    return ApiResponse.success({
      orderId: order.id,
      title: getListingTitle(order),
      participants: [
        { id: order.buyer_id, name: order.buyer_name, role: 'buyer' },
        { id: order.seller_id, name: order.seller_name, role: 'seller' },
        ...(order.driver_id
          ? [{ id: order.driver_id, name: order.driver_name || 'Driver', role: 'driver' as const }]
          : []),
      ],
      messages: (messages || []).map((message) => ({
        id: message.id,
        orderId: message.order_id,
        senderId: message.sender_id,
        senderName: message.sender_name,
        text: message.text,
        buyerId: message.buyer_id,
        sellerId: message.seller_id,
        driverId: message.driver_id,
        createdAt: message.created_at,
      })),
    });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/orders/[id]/messages', method: 'GET' });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const parsedOrderId = orderIdSchema.safeParse(id);
    if (!parsedOrderId.success) {
      return ApiResponse.badRequest('Invalid order id');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await readJsonBody(request);
    const parsedBody = orderMessageSchema.safeParse(body);
    if (!parsedBody.success) {
      return ApiResponse.badRequest('Invalid delivery room message', parsedBody.error.flatten());
    }

    const { data: order, error } = await getOrderById(supabase, parsedOrderId.data);
    if (error) {
      return ApiResponse.error(error.message, 500);
    }
    if (!order) {
      return ApiResponse.error('Order not found', 404);
    }
    if (!isOrderParticipant(order, user.id)) {
      return ApiResponse.forbidden('Not authorized to post in this delivery room');
    }

    const senderName = getParticipantName(order, user.id);
    if (!senderName) {
      return ApiResponse.forbidden('Not authorized to post in this delivery room');
    }

    const { data: message, error: insertError } = await insertOrderMessage(supabase, {
      order_id: order.id,
      sender_id: user.id,
      sender_name: sanitizeText(senderName, 100),
      text: sanitizeText(parsedBody.data.text, 2000),
      buyer_id: order.buyer_id,
      seller_id: order.seller_id,
      driver_id: order.driver_id,
    });

    if (insertError) {
      return ApiResponse.error(insertError.message, 500);
    }
    if (!message) {
      return ApiResponse.error('Failed to create delivery room message', 500);
    }

    const title = getListingTitle(order);
    const recipients = [order.buyer_id, order.seller_id, order.driver_id]
      .filter((entry): entry is string => Boolean(entry))
      .filter((entry) => entry !== user.id);

    for (const recipientId of recipients) {
      sendPushToUser(recipientId, {
        title: `${title} — delivery room`,
        body: `${senderName}: ${message.text}`,
        url: '/account#orders',
      }).catch(() => {});
      sendWhatsAppToUser(recipientId, `Tico Market delivery room: ${senderName}: ${message.text}`).catch(() => {});
    }

    return ApiResponse.success({
      id: message.id,
      orderId: message.order_id,
      senderId: message.sender_id,
      senderName: message.sender_name,
      text: message.text,
      buyerId: message.buyer_id,
      sellerId: message.seller_id,
      driverId: message.driver_id,
      createdAt: message.created_at,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/orders/[id]/messages', method: 'POST' });
  }
}

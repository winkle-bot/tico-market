const mockCreateSupabaseServerClient = jest.fn();
const mockSendPushToUser = jest.fn();
const mockSendWhatsAppToUser = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: () => mockCreateSupabaseServerClient(),
}));

jest.mock('@/lib/push', () => ({
  sendPushToUser: (...args: unknown[]) => Promise.resolve(mockSendPushToUser(...args)),
  sendWhatsAppToUser: (...args: unknown[]) => Promise.resolve(mockSendWhatsAppToUser(...args)),
}));

import { GET as getOrderMessages, POST as postOrderMessage } from '@/app/api/orders/[id]/messages/route';

type OrderRow = {
  id: string;
  buyer_id: string;
  buyer_name: string;
  seller_id: string;
  seller_name: string;
  driver_id: string | null;
  driver_name: string | null;
  listing_snapshot: Record<string, unknown>;
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

function jsonRequest(body?: unknown): Request {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
  } as unknown as Request;
}

function buildOrderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'order-1',
    buyer_id: '11111111-1111-1111-1111-111111111111',
    buyer_name: 'Buyer',
    seller_id: '22222222-2222-2222-2222-222222222222',
    seller_name: 'Seller',
    driver_id: '33333333-3333-3333-3333-333333333333',
    driver_name: 'Driver',
    listing_snapshot: { title: 'Coffee Maker' },
    ...overrides,
  };
}

function buildSupabase(userId: string, order: OrderRow, orderMessages: OrderMessageRow[] = []) {
  const insert = jest.fn((payload: Record<string, unknown>) => ({
    select: () => ({
      single: jest.fn().mockResolvedValue({
        data: {
          id: 9,
          order_id: String(payload.order_id),
          sender_id: String(payload.sender_id),
          sender_name: String(payload.sender_name),
          text: String(payload.text),
          buyer_id: String(payload.buyer_id),
          seller_id: String(payload.seller_id),
          driver_id: (payload.driver_id as string | null) ?? null,
          created_at: '2026-03-06T18:00:00Z',
        },
        error: null,
      }),
    }),
  }));

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: { id: userId },
        },
      }),
    },
    from: jest.fn((table: string) => {
      if (table === 'orders') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: order,
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === 'order_messages') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: orderMessages,
                error: null,
              }),
            })),
          })),
          insert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, insert };
}

describe('order delivery room api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns order-scoped messages to participants', async () => {
    const { supabase } = buildSupabase(
      '11111111-1111-1111-1111-111111111111',
      buildOrderRow(),
      [
        {
          id: 1,
          order_id: 'order-1',
          sender_id: '33333333-3333-3333-3333-333333333333',
          sender_name: 'Driver',
          text: 'I am outside.',
          buyer_id: '11111111-1111-1111-1111-111111111111',
          seller_id: '22222222-2222-2222-2222-222222222222',
          driver_id: '33333333-3333-3333-3333-333333333333',
          created_at: '2026-03-06T17:00:00Z',
        },
      ]
    );
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await getOrderMessages({} as Request, {
      params: Promise.resolve({ id: 'order-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orderId).toBe('order-1');
    expect(body.participants).toHaveLength(3);
    expect(body.messages[0].text).toBe('I am outside.');
  });

  test('rejects delivery room access for non-participants', async () => {
    const { supabase } = buildSupabase(
      '44444444-4444-4444-4444-444444444444',
      buildOrderRow()
    );
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await getOrderMessages({} as Request, {
      params: Promise.resolve({ id: 'order-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
  });

  test('posts a delivery room message and notifies the other participants', async () => {
    const { supabase, insert } = buildSupabase(
      '33333333-3333-3333-3333-333333333333',
      buildOrderRow()
    );
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await postOrderMessage(jsonRequest({ text: 'I have the package.' }), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.senderName).toBe('Driver');
    expect(body.text).toBe('I have the package.');
    expect(insert).toHaveBeenCalled();
    expect(mockSendPushToUser).toHaveBeenCalledTimes(2);
    expect(mockSendWhatsAppToUser).toHaveBeenCalledTimes(2);
  });
});

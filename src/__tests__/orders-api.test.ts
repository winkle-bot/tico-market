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

import { PATCH as patchOrder } from '@/app/api/orders/[id]/route';

type OrderRow = {
  id: string;
  listing_id: number;
  listing_snapshot: Record<string, unknown>;
  buyer_id: string;
  buyer_name: string;
  seller_id: string;
  seller_name: string;
  type: 'delivery' | 'pickup';
  status: 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled';
  driver_id: string | null;
  driver_name: string | null;
  delivery_address: string | null;
  delivery_fee: number | null;
  pickup_location_id: string | null;
  pickup_location: Record<string, unknown> | null;
  scheduled_window: string | null;
  notes: string | null;
  payment_status: 'pending' | 'requires_payment' | 'paid' | 'failed' | 'refunded';
  payment_amount: number | null;
  payment_currency: string | null;
  created_at: string;
  updated_at: string;
};

function jsonRequest(body: unknown): Request {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
  } as unknown as Request;
}

function buildOrderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'ord_1',
    listing_id: 7,
    listing_snapshot: {
      title: 'Coffee Maker',
      deliveryMeta: {
        updates: [],
      },
    },
    buyer_id: '11111111-1111-1111-1111-111111111111',
    buyer_name: 'Buyer',
    seller_id: '22222222-2222-2222-2222-222222222222',
    seller_name: 'Seller',
    type: 'delivery',
    status: 'pending',
    driver_id: '33333333-3333-3333-3333-333333333333',
    driver_name: 'Driver',
    delivery_address: 'San Jose',
    delivery_fee: 2500,
    pickup_location_id: null,
    pickup_location: null,
    scheduled_window: null,
    notes: null,
    payment_status: 'pending',
    payment_amount: null,
    payment_currency: null,
    created_at: '2026-03-06T10:00:00Z',
    updated_at: '2026-03-06T10:00:00Z',
    ...overrides,
  };
}

function buildSupabase(userId: string, existingOrder: OrderRow) {
  let currentOrder = existingOrder;
  const updateCalls: Record<string, unknown>[] = [];

  const orderLookupSingle = jest.fn().mockImplementation(async () => ({
    data: currentOrder,
    error: null,
  }));

  const updateSingle = jest.fn().mockImplementation(async () => ({
    data: currentOrder,
    error: null,
  }));

  const updateEq = jest.fn(() => ({
    select: jest.fn(() => ({
      single: updateSingle,
    })),
  }));

  const update = jest.fn((payload: Record<string, unknown>) => {
    updateCalls.push(payload);
    currentOrder = {
      ...currentOrder,
      ...payload,
    } as OrderRow;

    return {
      eq: updateEq,
    };
  });

  const select = jest.fn(() => ({
    eq: jest.fn(() => ({
      single: orderLookupSingle,
    })),
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
          select,
          update,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {
    supabase,
    updateCalls,
  };
}

describe('orders api patch delivery tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('aligns delivery phase when seller confirms without an explicit tracking phase', async () => {
    const { supabase, updateCalls } = buildSupabase(
      '22222222-2222-2222-2222-222222222222',
      buildOrderRow()
    );
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await patchOrder(jsonRequest({ status: 'confirmed' }), {
      params: Promise.resolve({ id: 'ord_1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('confirmed');
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].status).toBe('confirmed');
    expect(updateCalls[0].listing_snapshot).toMatchObject({
      deliveryMeta: {
        phase: 'awaiting_pickup',
      },
    });
  });

  test('creates a readable timeline entry for driver ETA and location updates', async () => {
    const { supabase, updateCalls } = buildSupabase(
      '33333333-3333-3333-3333-333333333333',
      buildOrderRow({
        status: 'in_transit',
        listing_snapshot: {
          title: 'Coffee Maker',
          deliveryMeta: {
            phase: 'picked_up',
            updates: [],
          },
        },
      })
    );
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await patchOrder(
      jsonRequest({
        trackingEvent: {
          etaMinutes: 12,
          driverLocationLabel: 'Zapote',
        },
      }),
      {
        params: Promise.resolve({ id: 'ord_1' }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.listingSnapshot).toMatchObject({
      deliveryMeta: {
        estimatedEtaMinutes: 12,
        driverLocationLabel: 'Zapote',
      },
    });
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].listing_snapshot).toMatchObject({
      deliveryMeta: {
        estimatedEtaMinutes: 12,
        driverLocationLabel: 'Zapote',
        updates: [
          expect.objectContaining({
            byRole: 'driver',
            message: 'ETA updated: about 12 min away. Driver location: Zapote.',
          }),
        ],
      },
    });
  });

  test('rejects ETA changes from anyone except the assigned driver', async () => {
    const { supabase, updateCalls } = buildSupabase(
      '11111111-1111-1111-1111-111111111111',
      buildOrderRow({
        status: 'in_transit',
      })
    );
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await patchOrder(
      jsonRequest({
        trackingEvent: {
          etaMinutes: 20,
          driverLocationLabel: 'Curridabat',
        },
      }),
      {
        params: Promise.resolve({ id: 'ord_1' }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
    expect(updateCalls).toHaveLength(0);
  });

  test('marks feria preorder reservations as confirmed when a seller confirms the order', async () => {
    const { supabase, updateCalls } = buildSupabase(
      '22222222-2222-2222-2222-222222222222',
      buildOrderRow({
        type: 'pickup',
        driver_id: null,
        driver_name: null,
        delivery_address: null,
        delivery_fee: null,
        pickup_location_id: 'feria-escazu-sat',
        pickup_location: {
          id: 'feria-escazu-sat',
          name: 'Feria del Agricultor Escazu',
          address: 'Escazu Centro',
        },
        listing_snapshot: {
          title: 'Plantains',
          feriaPreorder: {
            kind: 'feria_preorder',
            eventId: 'feria-escazu-sat',
            eventName: 'Feria del Agricultor Escazu',
            eventDate: 'Every Saturday',
            timeWindow: '07:00 - 13:00',
            locationName: 'Escazu Centro',
            reservationStatus: 'pending_confirmation',
            reservedAt: '2026-03-06T21:00:00.000Z',
          },
        },
      })
    );
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await patchOrder(jsonRequest({ status: 'confirmed' }), {
      params: Promise.resolve({ id: 'ord_1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('confirmed');
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].listing_snapshot).toMatchObject({
      feriaPreorder: {
        reservationStatus: 'confirmed',
      },
    });
  });
});

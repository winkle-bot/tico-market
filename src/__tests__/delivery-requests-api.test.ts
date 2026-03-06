const mockCreateSupabaseServerClient = jest.fn();

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

import { POST as postDeliveryRequest } from '@/app/api/delivery-requests/route';

function jsonRequest(body: unknown): Request {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
  } as unknown as Request;
}

describe('delivery requests api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('stores normalized feria batch context for batchable pickup requests', async () => {
    const insertSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'req_1',
        requester_id: '11111111-1111-1111-1111-111111111111',
        status: 'open',
        request_type: 'broadcast',
        target_driver_id: null,
        offered_price: 4500,
        expires_at: null,
        pickup_address: 'Escazu Centro',
        pickup_lat: null,
        pickup_lng: null,
        pickup_instructions: null,
        pickup_window_start: null,
        pickup_window_end: null,
        dropoff_address: 'Santa Ana',
        dropoff_lat: null,
        dropoff_lng: null,
        dropoff_instructions: null,
        dropoff_window_start: null,
        dropoff_window_end: null,
        item_description: 'Produce orders from feria vendors',
        item_photos: [],
        estimated_weight_kg: null,
        is_fragile: false,
        batch_context: {
          kind: 'feria_pickup',
          feriaName: 'Feria del Agricultor Escazu',
          marketDate: 'Saturday, Mar 7',
          pickupHubLabel: 'North Gate',
          batchWindowLabel: '08:00 - 09:30 pickup wave',
          batchKey: 'feria-del-agricultor-escazu:saturday-mar-7:north-gate:08-00-09-30-pickup-wave',
        },
        budget_amount: 4500,
        final_amount: null,
        assigned_driver_id: null,
        assigned_at: null,
        picked_up_at: null,
        delivered_at: null,
        created_at: '2026-03-06T22:00:00.000Z',
        updated_at: '2026-03-06T22:00:00.000Z',
      },
      error: null,
    });
    const insert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: insertSingle,
      })),
    }));
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: { id: '11111111-1111-1111-1111-111111111111' },
          },
        }),
      },
      from: jest.fn(() => ({
        insert,
      })),
    };
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await postDeliveryRequest(
      jsonRequest({
        requestType: 'broadcast',
        pickupAddress: 'Escazu Centro',
        dropoffAddress: 'Santa Ana',
        itemDescription: 'Produce orders from feria vendors',
        budgetAmount: 4500,
        batchContext: {
          feriaName: 'Feria del Agricultor Escazu',
          marketDate: 'Saturday, Mar 7',
          pickupHubLabel: 'North Gate',
          batchWindowLabel: '08:00 - 09:30 pickup wave',
        },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        batch_context: expect.objectContaining({
          kind: 'feria_pickup',
          batchKey: 'feria-del-agricultor-escazu:saturday-mar-7:north-gate:08-00-09-30-pickup-wave',
        }),
      })
    );
    expect(body.batchContext).toMatchObject({
      feriaName: 'Feria del Agricultor Escazu',
      pickupHubLabel: 'North Gate',
    });
  });
});

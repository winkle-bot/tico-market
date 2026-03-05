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

import { GET as getListings } from '@/app/api/listings/route';
import { POST as postOrders } from '@/app/api/orders/route';
import { POST as postReviews } from '@/app/api/reviews/route';

const AUTH_USER_ID = '11111111-1111-1111-1111-111111111111';
const SELLER_ID = '22222222-2222-2222-2222-222222222222';

function requestWithJson(url: string, body: unknown): Request {
  return {
    url,
    json: async () => body,
  } as unknown as Request;
}

function buildMockSupabase(config: {
  userId?: string | null;
  listingsRows?: any[];
  listingsCount?: number;
  orderInsertRow?: any;
  orderLookupRow?: any;
  existingReviewRow?: any;
  reviewInsertRow?: any;
}) {
  const listingsRows = config.listingsRows || [];
  const listingsCount = config.listingsCount ?? listingsRows.length;

  const listingsQuery = {
    or: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({
      data: listingsRows,
      error: null,
      count: listingsCount,
    }),
  };

  const ordersInsert = jest.fn((payload: any) => ({
    select: () => ({
      single: jest.fn().mockResolvedValue({
        data: config.orderInsertRow
          ? { ...config.orderInsertRow, notes: payload.notes }
          : null,
        error: null,
      }),
    }),
  }));

  const ordersLookupSingle = jest.fn().mockResolvedValue({
    data: config.orderLookupRow ?? null,
    error: config.orderLookupRow ? null : { message: 'not found' },
  });

  const reviewsLookupSingle = jest.fn().mockResolvedValue({
    data: config.existingReviewRow ?? null,
    error: null,
  });

  const reviewsInsert = jest.fn((payload: any) => ({
    select: () => ({
      single: jest.fn().mockResolvedValue({
        data: config.reviewInsertRow
          ? {
              ...config.reviewInsertRow,
              comment: payload.comment,
              buyer_name: payload.buyer_name,
            }
          : null,
        error: null,
      }),
    }),
  }));

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: config.userId ? { id: config.userId } : null,
        },
      }),
    },
    from: jest.fn((table: string) => {
      if (table === 'listings') {
        return {
          select: jest.fn().mockReturnValue(listingsQuery),
        };
      }

      if (table === 'orders') {
        return {
          insert: ordersInsert,
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: ordersLookupSingle,
            })),
          })),
        };
      }

      if (table === 'reviews') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: reviewsLookupSingle,
            })),
          })),
          insert: reviewsInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {
    supabase,
    ordersInsert,
    reviewsInsert,
  };
}

describe('API integration tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/listings returns paginated payload when query params are present', async () => {
    const listingRows = [
      {
        id: 10,
        seller_id: SELLER_ID,
        title: 'Road Bike',
        description: 'Aluminum frame',
        price: '1000',
        category: 'Other',
        location_lat: 9.93,
        location_lng: -84.08,
        rating: 4.9,
        type: 'seller',
        owner: 'Seller',
        image_url: null,
        verified: true,
        private_key: null,
        pickup_config: null,
        created_at: '2026-02-01T00:00:00Z',
      },
    ];
    const { supabase } = buildMockSupabase({
      userId: AUTH_USER_ID,
      listingsRows: listingRows,
      listingsCount: 5,
    });
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await getListings(
      { url: 'http://localhost/api/listings?page=2&limit=2' } as Request
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.total).toBe(5);
    expect(body.pagination.hasPrevPage).toBe(true);
  });

  test('POST /api/orders rejects payload when buyer does not match authenticated user', async () => {
    const { supabase } = buildMockSupabase({
      userId: AUTH_USER_ID,
    });
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await postOrders(
      requestWithJson('http://localhost/api/orders', {
        listingId: 7,
        listingSnapshot: { id: 7, title: 'Phone' },
        buyerId: SELLER_ID,
        buyerName: 'Buyer',
        sellerId: AUTH_USER_ID,
        sellerName: 'Seller',
        type: 'pickup',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
  });

  test('POST /api/orders creates order and sanitizes notes', async () => {
    const orderInsertRow = {
      id: 'ord_1',
      listing_id: 7,
      listing_snapshot: { id: 7, title: 'Phone' },
      buyer_id: AUTH_USER_ID,
      buyer_name: 'Buyer',
      seller_id: SELLER_ID,
      seller_name: 'Seller',
      type: 'pickup',
      status: 'pending',
      driver_id: null,
      driver_name: null,
      delivery_address: null,
      delivery_fee: null,
      pickup_location_id: null,
      pickup_location: null,
      scheduled_window: null,
      notes: null,
      payment_status: 'pending',
      payment_amount: null,
      payment_currency: null,
      created_at: '2026-02-02T00:00:00Z',
      updated_at: '2026-02-02T00:00:00Z',
    };
    const { supabase, ordersInsert } = buildMockSupabase({
      userId: AUTH_USER_ID,
      orderInsertRow,
    });
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await postOrders(
      requestWithJson('http://localhost/api/orders', {
        listingId: 7,
        listingSnapshot: { id: 7, title: 'Phone' },
        buyerId: AUTH_USER_ID,
        buyerName: 'Buyer',
        sellerId: SELLER_ID,
        sellerName: 'Seller',
        type: 'pickup',
        notes: '  <script>alert(1)</script>Hello  ',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(ordersInsert).toHaveBeenCalledTimes(1);
    expect(body.notes).toBe('alert(1)Hello');
  });

  test('POST /api/reviews blocks non-completed orders', async () => {
    const { supabase } = buildMockSupabase({
      userId: AUTH_USER_ID,
      orderLookupRow: {
        id: 'ord_1',
        listing_id: 7,
        buyer_id: AUTH_USER_ID,
        buyer_name: 'Buyer',
        seller_id: SELLER_ID,
        status: 'pending',
      },
    });
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await postReviews(
      requestWithJson('http://localhost/api/reviews', {
        orderId: 'ord_1',
        rating: 5,
        comment: 'Great seller',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/completed orders/i);
  });

  test('POST /api/reviews creates a review for completed order', async () => {
    const { supabase, reviewsInsert } = buildMockSupabase({
      userId: AUTH_USER_ID,
      orderLookupRow: {
        id: 'ord_1',
        listing_id: 7,
        buyer_id: AUTH_USER_ID,
        buyer_name: '  <b>Buyer Name</b>  ',
        seller_id: SELLER_ID,
        status: 'completed',
      },
      reviewInsertRow: {
        id: 'rev_1',
        order_id: 'ord_1',
        listing_id: 7,
        seller_id: SELLER_ID,
        buyer_id: AUTH_USER_ID,
        buyer_name: 'Buyer Name',
        rating: 5,
        comment: 'Great seller',
        created_at: '2026-02-03T00:00:00Z',
      },
    });
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await postReviews(
      requestWithJson('http://localhost/api/reviews', {
        orderId: 'ord_1',
        rating: 5,
        comment: '  <img src=x onerror=1>Great seller  ',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(reviewsInsert).toHaveBeenCalledTimes(1);
    expect(body.comment).toBe('Great seller');
    expect(body.buyerName).toBe('Buyer Name');
  });
});

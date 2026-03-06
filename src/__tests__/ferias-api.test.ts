const mockCreateSupabaseServerClient = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      json: async () => data,
    }),
  },
}));

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: () => mockCreateSupabaseServerClient(),
}));

import { GET as getFeriaDetail } from '@/app/api/ferias/[id]/route';
import { POST as postFeriaFollow } from '@/app/api/ferias/[id]/follow/route';
import { PATCH as patchVendorAvailability } from '@/app/api/ferias/[id]/vendors/me/route';

function buildRequest(url: string, method = 'GET'): Request {
  return { url, method } as unknown as Request;
}

function buildJsonRequest(url: string, method: string, body: unknown): Request {
  return {
    url,
    method,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
  } as unknown as Request;
}

function buildMockSupabase(config: {
  userId?: string | null;
  feria?: Record<string, unknown> | null;
  vendors?: Record<string, unknown>[];
  listings?: Record<string, unknown>[];
  ownVendorEntry?: Record<string, unknown> | null;
  followerCount?: number;
  isFollowing?: boolean;
}) {
  const followerCount = config.followerCount ?? 0;

  const feriasTable = {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: config.feria ?? null,
          error: config.feria ? null : { message: 'not found' },
        }),
      })),
    })),
  };

  const feriaVendorsTable = {
    select: jest.fn((columns?: string) => {
      if (columns?.includes('feria_id') && columns?.includes('weekly_availability')) {
        return {
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: config.ownVendorEntry ?? null,
                error: null,
              }),
            })),
          })),
        };
      }

      let eqCalls = 0;
      const chain = {
        eq: jest.fn(() => {
          eqCalls += 1;
          if (eqCalls >= 2) {
            return Promise.resolve({
              data: config.vendors ?? [],
              error: null,
            });
          }
          return chain;
        }),
      };
      return chain;
    }),
    update: jest.fn((payload: Record<string, unknown>) => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: config.ownVendorEntry
              ? {
                  ...config.ownVendorEntry,
                  weekly_availability: payload.weekly_availability,
                }
              : null,
            error: null,
          }),
        })),
      })),
    })),
  };

  const listingsTable = {
    select: jest.fn(() => ({
      in: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: config.listings ?? [],
            error: null,
          }),
        })),
      })),
    })),
  };

  const feriaFollowersTable = {
    select: jest.fn((columns?: string, options?: { count?: string; head?: boolean }) => {
      if (options?.head) {
        return {
          eq: jest.fn().mockResolvedValue({
            count: followerCount,
            error: null,
          }),
        };
      }

      if (columns === 'id') {
        return {
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: config.isFollowing ? { id: 'follow-1' } : null,
                error: null,
              }),
            })),
          })),
        };
      }

      throw new Error(`Unexpected feria_followers select: ${columns}`);
    }),
    upsert: jest.fn().mockResolvedValue({ error: null }),
  };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: config.userId ? { id: config.userId } : null,
        },
      }),
    },
    from: jest.fn((table: string) => {
      if (table === 'ferias') return feriasTable;
      if (table === 'feria_vendors') return feriaVendorsTable;
      if (table === 'feria_followers') return feriaFollowersTable;
      if (table === 'listings') return listingsTable;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe('ferias api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/ferias/[id] includes persisted follow state for the viewer', async () => {
    mockCreateSupabaseServerClient.mockResolvedValue(
      buildMockSupabase({
        userId: '11111111-1111-1111-1111-111111111111',
        feria: {
          id: '22222222-2222-2222-2222-222222222222',
          slug: 'uvita',
          name: 'Feria Uvita',
        },
        followerCount: 3,
        isFollowing: true,
      })
    );

    const response = await getFeriaDetail(
      buildRequest('http://localhost/api/ferias/uvita'),
      { params: Promise.resolve({ id: 'uvita' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.follower_count).toBe(3);
    expect(body.is_following).toBe(true);
  });

  test('POST /api/ferias/[id]/follow rejects anonymous users', async () => {
    mockCreateSupabaseServerClient.mockResolvedValue(
      buildMockSupabase({
        userId: null,
      })
    );

    const response = await postFeriaFollow(
      buildRequest('http://localhost/api/ferias/uvita/follow', 'POST'),
      { params: Promise.resolve({ id: 'uvita' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  test('POST /api/ferias/[id]/follow returns updated follower count', async () => {
    mockCreateSupabaseServerClient.mockResolvedValue(
      buildMockSupabase({
        userId: '11111111-1111-1111-1111-111111111111',
        feria: {
          id: '22222222-2222-2222-2222-222222222222',
          slug: 'uvita',
          name: 'Feria Uvita',
        },
        followerCount: 4,
      })
    );

    const response = await postFeriaFollow(
      buildRequest('http://localhost/api/ferias/uvita/follow', 'POST'),
      { params: Promise.resolve({ id: 'uvita' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.feriaId).toBe('22222222-2222-2222-2222-222222222222');
    expect(body.isFollowing).toBe(true);
    expect(body.followerCount).toBe(4);
  });

  test('GET /api/ferias/[id] includes vendor storefront listing previews', async () => {
    mockCreateSupabaseServerClient.mockResolvedValue(
      buildMockSupabase({
        feria: {
          id: '22222222-2222-2222-2222-222222222222',
          slug: 'uvita',
          name: 'Feria Uvita',
          vendor_count: 1,
          photos: [],
          schedule_days: [],
        },
        vendors: [
          {
            id: 'vendor-link-1',
            vendor_id: '33333333-3333-3333-3333-333333333333',
            display_name: 'Finca Verde',
            products_summary: 'Organic greens and herbs',
            profiles: {
              name: 'Finca Verde',
              rating: 4.8,
              verified: true,
              bio: 'Family-run produce stand',
              location: 'Escazu',
              avg_response_minutes: 15,
              total_transactions: 42,
              accepts_delivery: true,
            },
          },
        ],
        listings: [
          {
            id: 10,
            seller_id: '33333333-3333-3333-3333-333333333333',
            title: 'Fresh Kale',
            description: 'Picked this morning',
            price_cents: 2500,
            currency: 'CRC',
            category: 'Food',
            location_lat: 9.93,
            location_lng: -84.14,
            rating: 4.9,
            listing_kind: 'seller',
            owner: 'Finca Verde',
            image_url: null,
            image_urls: null,
            verified: true,
            private_key: null,
            pickup_config: { leadTime: 'Saturday morning' },
            fulfillment_options: { pickup: true, platform_delivery: true },
            moderation_status: 'active',
            landmark_directions: null,
            expires_at: null,
            last_bumped_at: null,
            condition: 'new',
            item_type: 'food',
            created_at: '2026-03-06T00:00:00Z',
          },
        ],
      })
    );

    const response = await getFeriaDetail(
      buildRequest('http://localhost/api/ferias/uvita'),
      { params: Promise.resolve({ id: 'uvita' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.vendors[0].active_listings_count).toBe(1);
    expect(body.vendors[0].featured_listings).toHaveLength(1);
    expect(body.vendors[0].featured_listings[0].title).toBe('Fresh Kale');
    expect(body.vendors[0].profiles.avg_response_minutes).toBe(15);
  });

  test('PATCH /api/ferias/[id]/vendors/me updates weekly availability for the signed-in vendor', async () => {
    mockCreateSupabaseServerClient.mockResolvedValue(
      buildMockSupabase({
        userId: '33333333-3333-3333-3333-333333333333',
        feria: {
          id: '22222222-2222-2222-2222-222222222222',
          slug: 'uvita',
          name: 'Feria Uvita',
        },
        ownVendorEntry: {
          id: 'vendor-link-1',
          feria_id: '22222222-2222-2222-2222-222222222222',
          vendor_id: '33333333-3333-3333-3333-333333333333',
          status: 'approved',
          weekly_availability: {},
        },
      })
    );

    const response = await patchVendorAvailability(
      buildJsonRequest('http://localhost/api/ferias/uvita/vendors/me', 'PATCH', {
        weeklyAvailability: {
          saturday: [{ start: '07:00', end: '12:00' }],
        },
      }),
      { params: Promise.resolve({ id: 'uvita' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.weeklyAvailability.saturday).toEqual([{ start: '07:00', end: '12:00' }]);
  });

  test('PATCH /api/ferias/[id]/vendors/me rejects non-vendors', async () => {
    mockCreateSupabaseServerClient.mockResolvedValue(
      buildMockSupabase({
        userId: '44444444-4444-4444-4444-444444444444',
        feria: {
          id: '22222222-2222-2222-2222-222222222222',
          slug: 'uvita',
          name: 'Feria Uvita',
        },
        ownVendorEntry: null,
      })
    );

    const response = await patchVendorAvailability(
      buildJsonRequest('http://localhost/api/ferias/uvita/vendors/me', 'PATCH', {
        weeklyAvailability: {
          saturday: [{ start: '07:00', end: '12:00' }],
        },
      }),
      { params: Promise.resolve({ id: 'uvita' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
  });
});

const mockCreateSupabaseServerClient = jest.fn();
const mockCreateSupabaseAdminClient = jest.fn();

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

jest.mock('@/lib/supabase-admin', () => ({
  createSupabaseAdminClient: () => mockCreateSupabaseAdminClient(),
}));

jest.mock('@/lib/push', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(undefined),
}));

import { POST as postListing } from '@/app/api/listings/route';

const USER_ID = '11111111-1111-1111-1111-111111111111';

function buildCreateListingRequest(fields: Record<string, string>): Request {
  const formData = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return {
    formData: async () => formData,
  } as unknown as Request;
}

function buildListingRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 99,
    seller_id: USER_ID,
    title: 'Mountain Bike',
    description: 'Fresh tune-up',
    price: '₡15.000',
    price_cents: 15000,
    currency: 'CRC',
    category: 'Other',
    location_lat: 9.9281,
    location_lng: -84.0907,
    rating: 5,
    listing_kind: 'seller',
    owner: 'Codi',
    image_url: null,
    image_urls: [],
    condition: 'good',
    item_type: 'physical',
    fulfillment_options: { pickup: true, platform_delivery: true },
    verified: false,
    moderation_status: 'active',
    private_key: null,
    pickup_config: {},
    landmark_directions: null,
    expires_at: null,
    last_bumped_at: null,
    created_at: '2026-03-06T00:00:00Z',
    ...overrides,
  };
}

function buildSupabaseForCreate() {
  const insert = jest.fn((payload: Record<string, unknown>) => ({
    select: () => ({
      single: jest.fn().mockResolvedValue({
        data: buildListingRow({
          title: payload.title,
          description: payload.description,
          price: payload.price,
          price_cents: payload.price_cents,
          currency: payload.currency,
          category: payload.category,
          condition: payload.condition,
          item_type: payload.item_type,
          location_lat: payload.location_lat,
          location_lng: payload.location_lng,
          owner: payload.owner,
          image_url: payload.image_url ?? null,
          image_urls: payload.image_urls ?? [],
          fulfillment_options: payload.fulfillment_options,
          verified: payload.verified,
          pickup_config: payload.pickup_config,
        }),
        error: null,
      }),
    }),
  }));

  const profilesSingle = jest.fn().mockResolvedValue({
    data: { name: 'Codi', verified: false },
  });

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: USER_ID, email: 'codi@example.com' } },
        error: null,
      }),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: profilesSingle,
            })),
          })),
        };
      }

      if (table === 'listings') {
        return { insert };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://example.com/listing.jpg' },
        })),
      })),
    },
  };

  return { supabase, insert };
}

describe('listings api create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSupabaseAdminClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })),
      })),
    });
  });

  test('POST /api/listings stores CRC price in both legacy and canonical columns', async () => {
    const { supabase, insert } = buildSupabaseForCreate();
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await postListing(
      buildCreateListingRequest({
        title: 'Mountain Bike',
        price: '₡15.000',
        currency: 'CRC',
        category: 'Other',
        description: 'Fresh tune-up',
        condition: 'good',
        itemType: 'physical',
        listing_kind: 'seller',
        lat: '9.9281',
        lng: '-84.0907',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        price: '₡15.000',
        price_cents: 15000,
        currency: 'CRC',
      })
    );
    expect(body.price).toBe('₡15.000');
    expect(body.priceCents).toBe(15000);
  });

  test('POST /api/listings parses USD decimals correctly and stores a legacy price string', async () => {
    const { supabase, insert } = buildSupabaseForCreate();
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await postListing(
      buildCreateListingRequest({
        title: 'Surf Lesson',
        price: '$15.99',
        currency: 'USD',
        category: 'Services',
        description: 'Beginner friendly',
        condition: 'good',
        itemType: 'service',
        listing_kind: 'seller',
        lat: '9.9281',
        lng: '-84.0907',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        price: '$15.99',
        price_cents: 1599,
        currency: 'USD',
      })
    );
    expect(body.price).toBe('$15.99');
    expect(body.priceCents).toBe(1599);
  });
});

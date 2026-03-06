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

function buildRequest(url: string, method = 'GET'): Request {
  return { url, method } as unknown as Request;
}

function buildMockSupabase(config: {
  userId?: string | null;
  feria?: Record<string, unknown> | null;
  vendors?: Record<string, unknown>[];
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
    select: jest.fn(() => {
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
});

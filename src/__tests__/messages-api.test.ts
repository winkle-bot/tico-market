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

jest.mock('@/lib/supabase-admin', () => ({
  createSupabaseAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUrl: async (path: string) => ({
          data: { signedUrl: `https://example.com/${path}` },
          error: null,
        }),
      }),
    },
  }),
}));

import { POST as postMessage } from '@/app/api/messages/route';

function jsonRequest(body: unknown, headers?: Record<string, string>): Request {
  return {
    headers: {
      get: (name: string) => {
        const normalizedName = name.toLowerCase();
        if (normalizedName === 'content-type') {
          return 'application/json';
        }

        return headers?.[normalizedName] ?? headers?.[name] ?? null;
      },
    },
    json: async () => body,
  } as unknown as Request;
}

function buildSupabase(
  userId: string,
  options?: {
    insertedMessage?: Record<string, unknown>;
    existingMessage?: Record<string, unknown> | null;
  }
) {
  const insert = jest.fn((payload: Record<string, unknown>) => ({
    select: () => ({
      single: jest.fn().mockResolvedValue({
        data: options?.insertedMessage
          ? {
              ...options.insertedMessage,
              text: payload.text,
              attachments: payload.attachments,
              client_mutation_id: payload.client_mutation_id,
            }
          : null,
        error: null,
      }),
    }),
  }));
  const maybeSingle = jest.fn().mockResolvedValue({
    data: options?.existingMessage ?? null,
    error: null,
  });
  const eqClientMutationId = jest.fn(() => ({
    maybeSingle,
  }));
  const eqSenderId = jest.fn(() => ({
    eq: eqClientMutationId,
  }));
  const select = jest.fn(() => ({
    eq: eqSenderId,
  }));

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: userId } },
      }),
    },
    from: jest.fn((table: string) => {
      if (table === 'messages') {
        return { insert, select };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
      })),
    },
  };
}

describe('messages api attachments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects message payloads with no text and no attachments', async () => {
    mockCreateSupabaseServerClient.mockResolvedValue(
      buildSupabase('11111111-1111-1111-1111-111111111111')
    );

    const response = await postMessage(
      jsonRequest({
        listingId: 1,
        buyerId: '11111111-1111-1111-1111-111111111111',
        sellerId: '22222222-2222-2222-2222-222222222222',
        text: '',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });

  test('accepts attachment-only location messages', async () => {
    mockCreateSupabaseServerClient.mockResolvedValue(
      buildSupabase('11111111-1111-1111-1111-111111111111', {
        insertedMessage: {
        id: 12,
        listing_id: 1,
        sender_id: '11111111-1111-1111-1111-111111111111',
        created_at: '2026-03-06T00:00:00Z',
        read: false,
        buyer_id: '11111111-1111-1111-1111-111111111111',
        buyer_name: 'Buyer',
        seller_id: '22222222-2222-2222-2222-222222222222',
        seller_name: 'Seller',
        },
      })
    );

    const response = await postMessage(
      jsonRequest({
        listingId: 1,
        buyerId: '11111111-1111-1111-1111-111111111111',
        buyerName: 'Buyer',
        sellerId: '22222222-2222-2222-2222-222222222222',
        sellerName: 'Seller',
        text: '',
        attachments: [
          {
            type: 'location',
            lat: 9.5,
            lng: -84.2,
            label: 'Meet here',
          },
        ],
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.text).toBe('');
    expect(body.attachments).toEqual([
      {
        type: 'location',
        lat: 9.5,
        lng: -84.2,
        label: 'Meet here',
      },
    ]);
  });

  test('returns the existing message for a replayed client mutation id', async () => {
    const existingMessage = {
      id: 77,
      listing_id: 1,
      sender_id: '11111111-1111-1111-1111-111111111111',
      client_mutation_id: 'msg-123',
      text: 'Hola',
      attachments: [],
      created_at: '2026-03-06T01:00:00Z',
      read: false,
      buyer_id: '11111111-1111-1111-1111-111111111111',
      buyer_name: 'Buyer',
      seller_id: '22222222-2222-2222-2222-222222222222',
      seller_name: 'Seller',
    };
    const supabase = buildSupabase('11111111-1111-1111-1111-111111111111', {
      existingMessage,
    });
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const response = await postMessage(
      jsonRequest(
        {
          listingId: 1,
          buyerId: '11111111-1111-1111-1111-111111111111',
          buyerName: 'Buyer',
          sellerId: '22222222-2222-2222-2222-222222222222',
          sellerName: 'Seller',
          text: 'Hola',
        },
        { 'x-client-mutation-id': 'msg-123' }
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(77);
    expect(body.text).toBe('Hola');
    expect(mockSendPushToUser).not.toHaveBeenCalled();
    expect(mockSendWhatsAppToUser).not.toHaveBeenCalled();
    expect(supabase.from('messages').insert).not.toHaveBeenCalled();
  });
});

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

function jsonRequest(body: unknown): Request {
  return {
    headers: { get: () => 'application/json' },
    json: async () => body,
  } as unknown as Request;
}

function buildSupabase(userId: string, insertedMessage?: Record<string, unknown>) {
  const insert = jest.fn((payload: Record<string, unknown>) => ({
    select: () => ({
      single: jest.fn().mockResolvedValue({
        data: insertedMessage
          ? {
              ...insertedMessage,
              text: payload.text,
              attachments: payload.attachments,
            }
          : null,
        error: null,
      }),
    }),
  }));

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: userId } },
      }),
    },
    from: jest.fn((table: string) => {
      if (table === 'messages') {
        return { insert };
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
        id: 12,
        listing_id: 1,
        sender_id: '11111111-1111-1111-1111-111111111111',
        created_at: '2026-03-06T00:00:00Z',
        read: false,
        buyer_id: '11111111-1111-1111-1111-111111111111',
        buyer_name: 'Buyer',
        seller_id: '22222222-2222-2222-2222-222222222222',
        seller_name: 'Seller',
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
});

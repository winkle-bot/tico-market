jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { POST as postTranslate } from '@/app/api/translate/route';

function buildJsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as unknown as Request;
}

describe('translate api', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
  });

  test('rejects invalid payloads', async () => {
    const response = await postTranslate(buildJsonRequest({ text: '', targetLanguage: 'fr' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });

  test('returns 503 when translation service is not configured', async () => {
    delete process.env.OPENAI_API_KEY;

    const response = await postTranslate(
      buildJsonRequest({
        text: 'Hola mae',
        targetLanguage: 'en',
        context: 'message',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe('TRANSLATION_NOT_CONFIGURED');
  });
});

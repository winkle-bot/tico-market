import {
  enqueueJsonMutation,
  flushOfflineQueue,
  getQueuedMutationCount,
} from '@/lib/offline-queue';

describe('offline queue', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('stores queued mutations locally', async () => {
    await enqueueJsonMutation({
      url: '/api/test',
      method: 'POST',
      body: { hello: 'world' },
    });

    expect(getQueuedMutationCount()).toBe(1);
  });

  test('flushes successful queued mutations', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

    await enqueueJsonMutation({
      url: '/api/test',
      method: 'POST',
      body: { hello: 'world' },
    });

    const result = await flushOfflineQueue();

    expect(result.succeeded).toBe(1);
    expect(result.remaining).toBe(0);
    expect(getQueuedMutationCount()).toBe(0);
  });
});

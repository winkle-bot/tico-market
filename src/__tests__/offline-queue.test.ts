import {
  enqueueJsonMutation,
  flushOfflineQueue,
  getQueuedMutationCount,
  removeQueuedMutationByKey,
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

  test('replaces queued mutations that share a queue key', async () => {
    await enqueueJsonMutation({
      url: '/api/ferias/one/follow',
      method: 'POST',
      queueKey: 'feria-follow:one',
    });

    await enqueueJsonMutation({
      url: '/api/ferias/one/follow',
      method: 'DELETE',
      queueKey: 'feria-follow:one',
    });

    expect(getQueuedMutationCount()).toBe(1);
    expect(window.localStorage.getItem('tico_offline_mutation_queue')).toContain('"method":"DELETE"');
  });

  test('can remove queued mutations by queue key', async () => {
    await enqueueJsonMutation({
      url: '/api/saved-searches',
      method: 'POST',
      body: { query: 'avocados' },
      queueKey: 'saved-search:avocados',
    });

    expect(removeQueuedMutationByKey('saved-search:avocados')).toBe(true);
    expect(getQueuedMutationCount()).toBe(0);
  });

  test('sends the client mutation id header during flush', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

    await enqueueJsonMutation({
      url: '/api/messages',
      method: 'POST',
      body: { text: 'hola' },
      clientMutationId: 'msg-123',
    });

    await flushOfflineQueue();

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const headers = fetchCall[1]?.headers as Headers;

    expect(fetchCall[0]).toBe('/api/messages');
    expect(headers.get('x-client-mutation-id')).toBe('msg-123');
  });
});

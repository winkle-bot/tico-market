import { withCsrfHeaders } from '@/lib/csrf';

const STORAGE_KEY = 'tico_offline_mutation_queue';
const QUEUE_CHANGED_EVENT = 'tico-offline-queue-changed';
const QUEUE_FLUSHED_EVENT = 'tico-offline-queue-flushed';

export type QueuedMutation = {
  id: string;
  url: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body?: string;
  createdAt: string;
};

function readQueue(): QueuedMutation[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedMutation[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT, { detail: { count: queue.length } }));
}

export function getQueuedMutationCount() {
  return readQueue().length;
}

export function subscribeToOfflineQueue(callback: (count: number) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const count = (event as CustomEvent<{ count?: number }>).detail?.count ?? getQueuedMutationCount();
    callback(count);
  };

  window.addEventListener(QUEUE_CHANGED_EVENT, handler);
  return () => window.removeEventListener(QUEUE_CHANGED_EVENT, handler);
}

export function subscribeToOfflineFlush(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(QUEUE_FLUSHED_EVENT, callback);
  return () => window.removeEventListener(QUEUE_FLUSHED_EVENT, callback);
}

export async function enqueueJsonMutation(input: {
  url: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: HeadersInit;
}) {
  const queue = readQueue();
  const normalizedHeaders = Object.fromEntries(new Headers(input.headers || {}).entries());

  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    url: input.url,
    method: input.method,
    headers: normalizedHeaders,
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
    createdAt: new Date().toISOString(),
  });

  writeQueue(queue);
}

export function isOfflineMutationError(error: unknown) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }

  return error instanceof TypeError;
}

export async function flushOfflineQueue() {
  if (typeof window === 'undefined' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { succeeded: 0, remaining: getQueuedMutationCount() };
  }

  const queue = readQueue();
  const remaining: QueuedMutation[] = [];
  let succeeded = 0;

  for (const item of queue) {
    try {
      const headers = withCsrfHeaders({
        'Content-Type': 'application/json',
        ...item.headers,
      });

      const response = await fetch(item.url, {
        method: item.method,
        headers,
        body: item.body,
      });

      if (response.ok) {
        succeeded += 1;
        continue;
      }

      if (response.status >= 400 && response.status < 500) {
        continue;
      }

      remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  if (succeeded > 0) {
    window.dispatchEvent(new CustomEvent(QUEUE_FLUSHED_EVENT, { detail: { succeeded } }));
  }

  return { succeeded, remaining: remaining.length };
}

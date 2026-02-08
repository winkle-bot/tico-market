import type { NextRequest } from 'next/server';

export const CSRF_COOKIE_NAME = 'tico_csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  limit: number;
};

type RateLimitBucket = {
  key: string;
  limit: number;
  windowMs: number;
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const GLOBAL_RATE_LIMIT_STATE_KEY = '__ticoRateLimitState';

function getRateLimitState(): Map<string, RateLimitState> {
  const globalScope = globalThis as typeof globalThis & {
    [GLOBAL_RATE_LIMIT_STATE_KEY]?: Map<string, RateLimitState>;
  };

  if (!globalScope[GLOBAL_RATE_LIMIT_STATE_KEY]) {
    globalScope[GLOBAL_RATE_LIMIT_STATE_KEY] = new Map<string, RateLimitState>();
  }

  return globalScope[GLOBAL_RATE_LIMIT_STATE_KEY]!;
}

export function isApiRequest(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

export function isMutationMethod(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase());
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

function getRateLimitBucket(pathname: string): RateLimitBucket {
  if (pathname.startsWith('/api/auth')) {
    return { key: 'auth', limit: 10, windowMs: 60_000 };
  }
  if (pathname.startsWith('/api/messages')) {
    return { key: 'messages', limit: 90, windowMs: 60_000 };
  }
  return { key: 'default', limit: 120, windowMs: 60_000 };
}

export function applyRateLimit(request: NextRequest): RateLimitResult {
  const now = Date.now();
  const state = getRateLimitState();
  const bucket = getRateLimitBucket(request.nextUrl.pathname);
  const clientIp = getClientIp(request);
  const key = `${bucket.key}:${clientIp}`;
  const current = state.get(key);

  if (!current || current.resetAt <= now) {
    state.set(key, { count: 1, resetAt: now + bucket.windowMs });
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: bucket.limit - 1,
      limit: bucket.limit,
    };
  }

  if (current.count >= bucket.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
      remaining: 0,
      limit: bucket.limit,
    };
  }

  current.count += 1;
  state.set(key, current);

  // Keep memory bounded in long-lived workers.
  if (state.size > 10_000) {
    for (const [entryKey, entryState] of state.entries()) {
      if (entryState.resetAt <= now) {
        state.delete(entryKey);
      }
    }
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: bucket.limit - current.count,
    limit: bucket.limit,
  };
}

export function createCsrfToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID().replace(/-/g, '')}`;
}

export function hasValidCsrfToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  return Boolean(cookieToken && headerToken && cookieToken === headerToken);
}

export function sanitizeText(value: string, maxLength = 2000): string {
  const trimmed = value.trim();
  const withoutTags = trimmed.replace(/<[^>]+>/g, '');
  const withoutControlChars = withoutTags.replace(/[\u0000-\u001F\u007F]/g, '');
  return withoutControlChars.slice(0, maxLength);
}

export function sanitizeOptionalText(
  value: string | null | undefined,
  maxLength = 2000
): string | null {
  if (value === null || value === undefined) return null;
  const sanitized = sanitizeText(String(value), maxLength);
  return sanitized.length > 0 ? sanitized : null;
}

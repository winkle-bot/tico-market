import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/security';

function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) return null;
  return decodeURIComponent(cookie.split('=').slice(1).join('='));
}

export function getCsrfToken(): string | null {
  return readCookieValue(CSRF_COOKIE_NAME);
}

export function withCsrfHeaders(headers: HeadersInit = {}): Headers {
  const merged = new Headers(headers);
  const token = getCsrfToken();
  if (token) {
    merged.set(CSRF_HEADER_NAME, token);
  }
  return merged;
}

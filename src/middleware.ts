import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseCookieOptions } from '@/lib/supabase-cookie-options';
import {
  applyRateLimit,
  createCsrfToken,
  CSRF_COOKIE_NAME,
  hasValidCsrfToken,
  isApiRequest,
  isMutationMethod,
} from '@/lib/security';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          const currentHeaders = new Headers(response.headers);

          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          currentHeaders.forEach((value, key) => {
            response.headers.set(key, value);
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session tokens and keep auth cookies in sync.
  // Per Supabase SSR guidance, use getUser() (not getSession()) here.
  await supabase.auth.getUser();

  const csrfToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!csrfToken) {
    response.cookies.set(CSRF_COOKIE_NAME, createCsrfToken(), {
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
      maxAge: 60 * 60 * 24,
    });
  }

  if (!isApiRequest(request.nextUrl.pathname)) {
    return response;
  }

  const rateLimit = applyRateLimit(request);
  response.headers.set('X-RateLimit-Limit', String(rateLimit.limit));
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', code: 'RATE_LIMITED' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  if (isMutationMethod(request.method) && !hasValidCsrfToken(request)) {
    if (request.nextUrl.pathname === '/api/stripe/webhook') {
      return response;
    }
    return NextResponse.json(
      { error: 'Invalid CSRF token', code: 'CSRF_INVALID' },
      { status: 403 }
    );
  }
  
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

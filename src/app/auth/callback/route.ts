import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

const EMAIL_OTP_TYPES: ReadonlySet<EmailOtpType> = new Set([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

function getSafeRedirect(nextParam: string | null): string {
  if (!nextParam || !nextParam.startsWith('/')) {
    return '/';
  }

  if (nextParam.startsWith('//')) {
    return '/';
  }

  return nextParam;
}

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL('/', request.url);
  url.searchParams.set('auth_error', message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const otpType = requestUrl.searchParams.get('type');
  const next = getSafeRedirect(requestUrl.searchParams.get('next'));
  const redirectUrl = new URL(next, requestUrl.origin);
  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectWithError(request, error.message);
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (tokenHash && otpType && EMAIL_OTP_TYPES.has(otpType as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as EmailOtpType,
    });

    if (error) {
      return redirectWithError(request, error.message);
    }

    return NextResponse.redirect(redirectUrl);
  }

  return redirectWithError(request, 'Missing auth callback parameters');
}

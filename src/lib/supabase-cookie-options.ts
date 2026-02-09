import type { CookieOptionsWithName } from '@supabase/ssr';

export const supabaseCookieOptions: CookieOptionsWithName = {
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: false,
};

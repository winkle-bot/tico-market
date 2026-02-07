import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    cookies: {
      getAll() {
        if (typeof document === 'undefined') return [];
        return document.cookie.split('; ').map(cookie => {
          const [name, ...rest] = cookie.split('=');
          return { name, value: rest.join('=') };
        });
      },
      setAll(cookiesToSet) {
        if (typeof document === 'undefined') return;
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookie = `${name}=${value}`;
          if (options?.path) cookie += `; path=${options.path}`;
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
          if (options?.domain) cookie += `; domain=${options.domain}`;
          if (options?.secure) cookie += '; secure';
          if (options?.httpOnly) cookie += '; httpOnly';
          if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
          document.cookie = cookie;
        });
      },
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

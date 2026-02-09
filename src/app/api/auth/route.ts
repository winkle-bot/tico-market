import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { sanitizeOptionalText, sanitizeText } from '@/lib/security';
import { readJsonBody, validationError } from '@/lib/validation';
import { z } from 'zod';

const authSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('signup'),
    email: z.string().email().max(320).transform((value) => value.trim().toLowerCase()),
    password: z.string().min(6).max(128),
    name: z.string().max(100).optional(),
  }),
  z.object({
    action: z.literal('login'),
    email: z.string().email().max(320).transform((value) => value.trim().toLowerCase()),
    password: z.string().min(6).max(128),
  }),
  z.object({
    action: z.literal('forgotPassword'),
    email: z.string().email().max(320).transform((value) => value.trim().toLowerCase()),
  }),
]);

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const rawBody = await readJsonBody(request);
    const parsed = authSchema.safeParse(rawBody);
    if (!parsed.success) {
      return validationError(parsed.error);
    }
    const { action, email } = parsed.data;

    if (action === 'forgotPassword') {
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
      const redirectTo = `${origin}/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        return ApiResponse.error(error.message, 400, error.code);
      }
      return ApiResponse.success({
        message: 'Password reset email sent',
      });
    }

    if (action === 'signup') {
      const sanitizedName = sanitizeOptionalText(parsed.data.name, 100);
      const { data, error } = await supabase.auth.signUp({
        email,
        password: parsed.data.password,
        options: {
          data: { name: sanitizedName || sanitizeText(email.split('@')[0], 100) }
        }
      });

      if (error) {
        return ApiResponse.error(error.message, 400, error.code);
      }

      return ApiResponse.success({ 
        user: data.user,
        message: 'Check your email to confirm your account'
      });
    } 
    
    if (action === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: parsed.data.password
      });

      if (error) {
        return ApiResponse.unauthorized('Invalid credentials');
      }

      // Fetch profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return ApiResponse.success({
        user: data.user,
        profile
      });
    }

    return ApiResponse.badRequest('Invalid action');
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/auth', method: 'POST' });
  }
}

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({ message: 'Logged out' });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { sanitizeOptionalText, sanitizeText } from '@/lib/security';
import { readJsonBody, validationError } from '@/lib/validation';
import { z } from 'zod';

const authSchema = z.object({
  action: z.enum(['signup', 'login']),
  email: z.string().email().max(320).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(6).max(128),
  name: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const rawBody = await readJsonBody(request);
    const parsed = authSchema.safeParse(rawBody);
    if (!parsed.success) {
      return validationError(parsed.error);
    }
    const { action, email, password, name } = parsed.data;
    const sanitizedName = sanitizeOptionalText(name, 100);

    if (action === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
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
        password
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
    console.error('Auth API Error:', error);
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error);
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

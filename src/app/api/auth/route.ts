import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const { action, email, password, name } = await request.json();

    if (!email || !password) {
      return ApiResponse.badRequest('Email and password are required');
    }

    if (action === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name || email.split('@')[0] }
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
    return ApiResponse.serverError(error);
  }
}

export async function DELETE() {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({ message: 'Logged out' });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

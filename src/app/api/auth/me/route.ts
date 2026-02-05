import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db-provider';
import { ApiResponse } from '@/lib/api-response';
import { parse } from 'cookie';

const SESSION_COOKIE_NAME = 'tid';
const SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 1 week

export async function GET(request: Request) {
  try {
    const cookies = parse(request.headers.get('cookie') || '');
    const sessionId = cookies[SESSION_COOKIE_NAME];

    if (!sessionId) {
      return ApiResponse.unauthorized('No session provided');
    }

    const db = await readDB();
    const session = db.sessions.find(s => s.id === sessionId);

    if (!session || session.expiresAt < Date.now()) {
      // Optionally clean up expired session here
      return ApiResponse.unauthorized('Invalid or expired session');
    }

    const user = db.users.find(u => u.id === session.userId);

    if (!user) {
      return ApiResponse.unauthorized('User not found');
    }

    const { password: _, ...userWithoutPassword } = user;
    return ApiResponse.success(userWithoutPassword);
  } catch (error) {
    console.error("Auth ME API Error:", error);
    return ApiResponse.serverError(error);
  }
}

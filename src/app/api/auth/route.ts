import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-provider';
import { ApiResponse } from '@/lib/api-response';
import { serialize } from 'cookie';
import { v4 as uuidv4 } from 'uuid';

const SESSION_COOKIE_NAME = 'tid';
const SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 1 week

export async function POST(request: Request) {
  try {
    const { action, email, password, name } = await request.json();
    let db = await readDB();

    if (!email || !password) {
      return ApiResponse.badRequest('Email and password are required');
    }

    let userToReturn: any;

    if (action === 'signup') {
      if (db.users.find((u: any) => u.email === email)) {
        return ApiResponse.error('User already exists', 409, 'USER_EXISTS');
      }
      const newUser = {
        id: `user-${Date.now()}`,
        email,
        password, // In a real app, hash this! Encrypt me!
        name: name || email.split('@')[0],
        joined: new Date().toISOString(),
        verified: false,
        favorites: [],
      };
      db.users.push(newUser);
      userToReturn = newUser;
    } else if (action === 'login') {
      const user = db.users.find(
        (u: any) => u.email === email && u.password === password
      );
      if (!user) {
        return ApiResponse.unauthorized('Invalid credentials');
      }
      userToReturn = user;
    } else {
      return ApiResponse.badRequest('Invalid action');
    }

    // Create session
    const sessionId = uuidv4();
    const expiresAt = Date.now() + SESSION_EXPIRY_SECONDS * 1000;
    db.sessions.push({ id: sessionId, userId: userToReturn.id, expiresAt });
    await writeDB(db);

    const { password: _, ...userWithoutPassword } = userToReturn;

    const cookie = serialize(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_EXPIRY_SECONDS,
    });

    return new NextResponse(JSON.stringify(ApiResponse.success(userWithoutPassword).json()), {
      status: 200,
      headers: { 'Set-Cookie': cookie },
    });
  } catch (error) {
    console.error("Auth API Error:", error);
    return ApiResponse.serverError(error);
  }
}

// Add a logout route
export async function DELETE(request: Request) {
  const cookies = request.headers.get('cookie');
  const sessionId = cookies?.split('; ').find(row => row.startsWith(SESSION_COOKIE_NAME))?.split('=')[1];

  if (sessionId) {
    let db = await readDB();
    db.sessions = db.sessions.filter(session => session.id !== sessionId);
    await writeDB(db);
  }

  const expiredCookie = serialize(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
  });

  return new NextResponse(JSON.stringify(ApiResponse.success({ message: 'Logged out' }).json()), {
    status: 200,
    headers: { 'Set-Cookie': expiredCookie },
  });
}


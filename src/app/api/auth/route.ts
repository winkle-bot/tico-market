import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-provider';
import { ApiResponse } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const { action, email, password, name } = await request.json();
    const db = await readDB();

    if (!email || !password) {
      return ApiResponse.badRequest('Email and password are required');
    }

    if (action === 'signup') {
      if (db.users.find((u: any) => u.email === email)) {
        return ApiResponse.error("User already exists", 409, "USER_EXISTS");
      }
      const newUser = {
        id: `user-${Date.now()}`,
        email,
        password, // In a real app, hash this!
        name: name || email.split('@')[0],
        joined: new Date().toISOString(),
        verified: false,
        favorites: [],
      };
      db.users.push(newUser);
      await writeDB(db);
      const { password: _, ...userWithoutPassword } = newUser;
      return ApiResponse.success(userWithoutPassword, 201);
    }

    if (action === 'login') {
      const user = db.users.find((u: any) => u.email === email && u.password === password);
      if (!user) {
        return ApiResponse.unauthorized("Invalid credentials");
      }
      const { password: _, ...userWithoutPassword } = user as any;
      return ApiResponse.success(userWithoutPassword);
    }

    return ApiResponse.badRequest("Invalid action");
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}


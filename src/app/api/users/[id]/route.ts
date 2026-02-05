import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-provider';
import { ApiResponse } from '@/lib/api-response';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await readDB();
    const user = db.users.find((u: any) => u.id === id);
    
    if (!user) {
      return ApiResponse.notFound("User not found");
    }
    
    // Safety for the front-end expectations
    const profile = {
      ...user,
      rating: user.rating || 5.0,
      joined: user.joined ? new Date(user.joined).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Recently",
      location: user.location || "Costa Rica",
      bio: user.bio || "No bio yet.",
      favorites: user.favorites || []
    };
    
    return ApiResponse.success(profile);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = await readDB();
    
    const userIndex = db.users.findIndex((u: any) => u.id === id);
    
    if (userIndex === -1) {
      return ApiResponse.notFound("User not found");
    }
    
    const user = db.users[userIndex];
    
    // Handle favorite actions
    if (body.action === 'addFavorite') {
      if (!user.favorites) user.favorites = [];
      if (!user.favorites.includes(body.listingId)) {
        user.favorites.push(body.listingId);
      }
    } else if (body.action === 'removeFavorite') {
      if (user.favorites) {
        user.favorites = user.favorites.filter((id: number) => id !== body.listingId);
      }
    } else if (body.action === 'toggleFavorite') {
      if (!user.favorites) user.favorites = [];
      if (user.favorites.includes(body.listingId)) {
        user.favorites = user.favorites.filter((id: number) => id !== body.listingId);
      } else {
        user.favorites.push(body.listingId);
      }
    } else {
      // Generic update
      Object.assign(user, body);
    }
    
    db.users[userIndex] = user;
    await writeDB(db);
    
    return ApiResponse.success(user);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}


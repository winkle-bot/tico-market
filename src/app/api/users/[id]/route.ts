import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db-provider';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await readDB();
    const user = db.users.find((u: any) => u.id === id);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Safety for the front-end expectations
    const profile = {
      ...user,
      rating: user.rating || 5.0,
      joined: user.joined ? new Date(user.joined).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Recently",
      location: user.location || "Costa Rica",
      bio: user.bio || "No bio yet.",
      reviews: user.reviews || []
    };
    
    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

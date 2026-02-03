import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/lib/db.json');

let cachedDB: any = null;

async function readDB() {
  if (cachedDB) return cachedDB;
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    cachedDB = JSON.parse(data);
    return cachedDB;
  } catch (e) {
    return { listings: [], users: [] };
  }
}

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

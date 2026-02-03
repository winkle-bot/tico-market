import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db-provider';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await readDB();
    // Support both numeric and string IDs
    const listing = db.listings.find((l: any) => l.id.toString() === id);
    
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    
    return NextResponse.json(listing);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

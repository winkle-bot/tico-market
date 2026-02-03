import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-provider';

// GET /api/messages?userId=xxx - Get all conversations for a user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const db = await readDB();
  const messages = db.messages || [];
  
  // Get all messages where user is buyer or seller
  const userMessages = messages.filter(
    (m: any) => m.buyerId === userId || m.sellerId === userId
  );
  
  // Group by conversation (listingId + other party)
  const conversationsMap = new Map<string, any>();
  
  for (const msg of userMessages) {
    const otherPartyId = msg.buyerId === userId ? msg.sellerId : msg.buyerId;
    const key = `${msg.listingId}-${otherPartyId}`;
    
    if (!conversationsMap.has(key)) {
      // Find the listing
      const listing = db.listings.find((l: any) => l.id === msg.listingId);
      
      conversationsMap.set(key, {
        listingId: msg.listingId,
        listingTitle: listing?.title || 'Unknown Listing',
        listingImage: listing?.imageUrl,
        otherPartyId,
        otherPartyName: msg.buyerId === userId ? msg.sellerName : msg.buyerName,
        messages: [],
        lastMessageAt: msg.createdAt
      });
    }
    
    const conv = conversationsMap.get(key);
    conv.messages.push(msg);
    if (msg.createdAt > conv.lastMessageAt) {
      conv.lastMessageAt = msg.createdAt;
    }
  }
  
  // Sort messages within each conversation
  const conversations = Array.from(conversationsMap.values()).map(conv => ({
    ...conv,
    messages: conv.messages.sort((a: any, b: any) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }));
  
  // Sort conversations by last message
  conversations.sort((a, b) => 
    new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
  
  return NextResponse.json(conversations);
}

// POST /api/messages - Send a new message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { listingId, buyerId, buyerName, sellerId, sellerName, senderId, text } = body;
    
    if (!listingId || !buyerId || !sellerId || !senderId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const db = await readDB();
    
    if (!db.messages) {
      db.messages = [];
    }
    
    const message = {
      id: Date.now(),
      listingId,
      buyerId,
      buyerName,
      sellerId,
      sellerName,
      senderId,
      text,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    db.messages.push(message);
    await writeDB(db);
    
    return NextResponse.json(message);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

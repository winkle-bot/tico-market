import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';

// GET messages for a user
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return ApiResponse.unauthorized('Must be logged in');
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return ApiResponse.badRequest('userId is required');
    }
    if (userId !== session.user.id) {
      return ApiResponse.forbidden('Not authorized to view these messages');
    }
    const effectiveUserId = session.user.id;

    // Get all messages where user is buyer or seller
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`buyer_id.eq.${effectiveUserId},seller_id.eq.${effectiveUserId}`)
      .order('created_at', { ascending: true });

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    // Group by conversation
    const conversationsMap = new Map<string, any>();
    
    const typedMessages = messages as unknown as Array<{ 
      buyer_id: string; 
      seller_id: string; 
      listing_id: string;
      created_at: string;
      buyer_name?: string;
      seller_name?: string;
      id: string;
      sender_id: string;
      text: string;
      read: boolean;
    }>;
    
    for (const msg of typedMessages || []) {
      const otherPartyId = msg.buyer_id === effectiveUserId ? msg.seller_id : msg.buyer_id;
      const key = `${msg.listing_id}-${otherPartyId}`;
      
      if (!conversationsMap.has(key)) {
        // Get listing info
        const { data: listing } = await supabase
          .from('listings')
          .select('title, image_url')
          .eq('id', msg.listing_id)
          .single() as { data: { title: string; image_url: string } | null };
        
        conversationsMap.set(key, {
          listingId: msg.listing_id,
          listingTitle: listing?.title || 'Unknown Listing',
          listingImage: listing?.image_url,
          otherPartyId,
          otherPartyName: msg.buyer_id === effectiveUserId ? msg.seller_name : msg.buyer_name,
          lastMessageAt: msg.created_at,
          messages: [],
        });
      }
      
      const conv = conversationsMap.get(key);
      conv.messages.push({
        id: msg.id,
        listingId: msg.listing_id,
        senderId: msg.sender_id,
        text: msg.text,
        createdAt: msg.created_at,
        read: msg.read,
        buyerId: msg.buyer_id,
        buyerName: msg.buyer_name,
        sellerId: msg.seller_id,
        sellerName: msg.seller_name,
      });
      
      if (msg.created_at > conv.lastMessageAt) {
        conv.lastMessageAt = msg.created_at;
      }
    }
    
    // Sort conversations by last message
    const conversations = Array.from(conversationsMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    return ApiResponse.success(conversations);
  } catch (error) {
    console.error('Messages GET error:', error);
    return ApiResponse.serverError(error);
  }
}

// POST new message
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await request.json();
    const { listingId, buyerId, buyerName, sellerId, sellerName, text } = body;
    
    if (!listingId || !buyerId || !sellerId || !text) {
      return ApiResponse.badRequest('Missing required fields');
    }
    if (session.user.id !== buyerId && session.user.id !== sellerId) {
      return ApiResponse.forbidden('Not authorized to send messages for this listing');
    }

    const { data: message, error } = await (supabase
      .from('messages') as any)
      .insert({
        listing_id: listingId,
        sender_id: session.user.id,
        text,
        buyer_id: buyerId,
        buyer_name: buyerName,
        seller_id: sellerId,
        seller_name: sellerName,
        read: false,
      })
      .select()
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({
      id: message.id,
      listingId: message.listing_id,
      senderId: message.sender_id,
      text: message.text,
      createdAt: message.created_at,
      read: message.read,
      buyerId: message.buyer_id,
      buyerName: message.buyer_name,
      sellerId: message.seller_id,
      sellerName: message.seller_name,
    });
  } catch (error) {
    console.error('Messages POST error:', error);
    return ApiResponse.serverError(error);
  }
}

// PATCH mark messages as read
export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await request.json();
    const { userId, listingId, otherPartyId } = body;

    if (!listingId || !otherPartyId) {
      return ApiResponse.badRequest('Missing required fields');
    }
    if (userId && userId !== session.user.id) {
      return ApiResponse.forbidden('Not authorized to update these messages');
    }
    const effectiveUserId = session.user.id;

    // Update messages as read
    const { error } = await (supabase
      .from('messages') as any)
      .update({ read: true })
      .eq('listing_id', listingId)
      .or(`and(buyer_id.eq.${otherPartyId},seller_id.eq.${effectiveUserId}),and(buyer_id.eq.${effectiveUserId},seller_id.eq.${otherPartyId})`)
      .neq('sender_id', effectiveUserId)
      .eq('read', false);

    if (error) {
      console.error('Mark read error:', error);
    }

    return ApiResponse.success({ success: true });
  } catch (error) {
    console.error('Messages PATCH error:', error);
    return ApiResponse.serverError(error);
  }
}

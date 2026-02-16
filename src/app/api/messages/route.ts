import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { sanitizeText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { sendPushToUser, sendWhatsAppToUser } from '@/lib/push';
import { z } from 'zod';

const userIdSchema = z.string().uuid();
const messageCreateSchema = z.object({
  listingId: z.coerce.number().int().positive(),
  buyerId: z.string().uuid(),
  buyerName: z.string().max(100).optional(),
  sellerId: z.string().uuid(),
  sellerName: z.string().max(100).optional(),
  text: z.string().min(1).max(2000),
});
const markReadSchema = z.object({
  userId: z.string().uuid().optional(),
  listingId: z.coerce.number().int().positive(),
  otherPartyId: z.string().uuid(),
});

interface MessageRow {
  id: number;
  listing_id: number;
  sender_id: string;
  text: string;
  created_at: string;
  read: boolean;
  buyer_id: string;
  buyer_name: string;
  seller_id: string;
  seller_name: string;
}

interface ListingSummary {
  id: number;
  title: string;
  image_url: string | null;
}

// GET messages for a user
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    const parsedUserId = userIdSchema.safeParse(userId);
    if (!parsedUserId.success) {
      return ApiResponse.badRequest('userId is required');
    }
    if (parsedUserId.data !== user.id) {
      return ApiResponse.forbidden('Not authorized to view these messages');
    }
    const effectiveUserId = user.id;

    // Get all messages where user is buyer or seller
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`buyer_id.eq.${effectiveUserId},seller_id.eq.${effectiveUserId}`)
      .order('created_at', { ascending: true });

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    const typedMessages = (messages || []) as unknown as MessageRow[];
    const uniqueListingIds = Array.from(new Set(typedMessages.map((msg) => msg.listing_id)));
    const listingTitleById = new Map<number, ListingSummary>();
    if (uniqueListingIds.length > 0) {
      const { data: listingRows } = await supabase
        .from('listings')
        .select('id, title, image_url')
        .in('id', uniqueListingIds);
      for (const listing of (listingRows || []) as ListingSummary[]) {
        listingTitleById.set(listing.id, listing);
      }
    }

    // Group by conversation
    const conversationsMap = new Map<string, {
      listingId: number;
      listingTitle: string;
      listingImage: string | null | undefined;
      otherPartyId: string;
      otherPartyName: string | undefined;
      lastMessageAt: string;
      messages: Array<{
        id: number;
        listingId: number;
        senderId: string;
        text: string;
        createdAt: string;
        read: boolean;
        buyerId: string;
        buyerName: string;
        sellerId: string;
        sellerName: string;
      }>;
    }>();

    for (const msg of typedMessages || []) {
      const otherPartyId = msg.buyer_id === effectiveUserId ? msg.seller_id : msg.buyer_id;
      const key = `${msg.listing_id}-${otherPartyId}`;

      if (!conversationsMap.has(key)) {
        const listing = listingTitleById.get(msg.listing_id);
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
      if (!conv) continue;
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
    return ApiResponse.serverError(error, { route: '/api/messages', method: 'GET' });
  }
}

// POST new message
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await readJsonBody(request);
    const parsed = messageCreateSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid message payload', parsed.error.flatten());
    }
    const { listingId, buyerId, buyerName, sellerId, sellerName, text } = parsed.data;
    if (user.id !== buyerId && user.id !== sellerId) {
      return ApiResponse.forbidden('Not authorized to send messages for this listing');
    }

    const { data: message, error } = await (supabase
      .from('messages') as any)
      .insert({
        listing_id: listingId,
        sender_id: user.id,
        text: sanitizeText(text, 2000),
        buyer_id: buyerId,
        buyer_name: sanitizeText(buyerName || 'Buyer', 100),
        seller_id: sellerId,
        seller_name: sanitizeText(sellerName || 'Seller', 100),
        read: false,
      })
      .select()
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    // Fire-and-forget push notification to the other party
    const recipientId = user.id === buyerId ? sellerId : buyerId;
    const senderName = user.id === buyerId ? (buyerName || 'Buyer') : (sellerName || 'Seller');
    sendPushToUser(recipientId, {
      title: `New message from ${senderName}`,
      body: text.length > 100 ? text.slice(0, 97) + '...' : text,
      url: '/account?tab=messages',
    }).catch(() => {});
    sendWhatsAppToUser(recipientId, `New message from ${senderName}: ${text.length > 100 ? text.slice(0, 97) + '...' : text}`).catch(() => {});

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
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/messages', method: 'POST' });
  }
}

// PATCH mark messages as read
export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await readJsonBody(request);
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid mark-read payload', parsed.error.flatten());
    }
    const { userId, listingId, otherPartyId } = parsed.data;
    if (userId && userId !== user.id) {
      return ApiResponse.forbidden('Not authorized to update these messages');
    }
    const effectiveUserId = user.id;

    // Update messages as read
    const { error } = await (supabase
      .from('messages') as any)
      .update({ read: true })
      .eq('listing_id', listingId)
      .or(`and(buyer_id.eq.${otherPartyId},seller_id.eq.${effectiveUserId}),and(buyer_id.eq.${effectiveUserId},seller_id.eq.${otherPartyId})`)
      .neq('sender_id', effectiveUserId)
      .eq('read', false);

    if (error) {
      logger.warn('Failed to mark messages as read', { route: '/api/messages', method: 'PATCH', error: error.message });
    }

    return ApiResponse.success({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/messages', method: 'PATCH' });
  }
}

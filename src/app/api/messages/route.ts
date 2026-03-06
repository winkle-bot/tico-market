import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { sanitizeText } from '@/lib/security';
import { readJsonBody } from '@/lib/validation';
import { sendPushToUser, sendWhatsAppToUser } from '@/lib/push';
import {
  createSignedMessageAttachmentUrl,
  MESSAGE_ATTACHMENTS_BUCKET,
  type MessageAttachment,
} from '@/lib/message-attachments';
import { z } from 'zod';

const userIdSchema = z.string().uuid();
const locationAttachmentSchema = z.object({
  type: z.literal('location'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  label: z.string().max(120).optional().nullable(),
});
const messageCreateSchema = z.object({
  listingId: z.coerce.number().int().positive(),
  buyerId: z.string().uuid(),
  buyerName: z.string().max(100).optional(),
  sellerId: z.string().uuid(),
  sellerName: z.string().max(100).optional(),
  text: z.string().max(2000).optional().default(''),
  attachments: z.array(locationAttachmentSchema).max(3).optional().default([]),
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
  attachments: MessageAttachment[] | null;
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

async function expandAttachments(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  attachments: MessageAttachment[] | null | undefined
) {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  return Promise.all(
    attachments.map(async (attachment) => {
      if (attachment.type !== 'image' || !attachment.storageKey) {
        return attachment;
      }

      return {
        ...attachment,
        signedUrl: await createSignedMessageAttachmentUrl(admin, attachment.storageKey),
      };
    })
  );
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
    const admin = createSupabaseAdminClient();
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
        attachments: MessageAttachment[];
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
      const attachments = await expandAttachments(admin, msg.attachments);
      conv.messages.push({
        id: msg.id,
        listingId: msg.listing_id,
        senderId: msg.sender_id,
        text: msg.text,
        attachments,
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

    const contentType = request.headers?.get?.('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');

    let body: unknown;
    let imageAttachment: MessageAttachment | null = null;

    if (isMultipart) {
      const formData = await request.formData();
      const rawText = String(formData.get('text') ?? '');
      const locationLat = formData.get('locationLat');
      const locationLng = formData.get('locationLng');
      const locationLabel = formData.get('locationLabel');
      const locationAttachments: Array<z.infer<typeof locationAttachmentSchema>> = [];

      if (locationLat !== null && locationLng !== null) {
        locationAttachments.push({
          type: 'location',
          lat: Number(locationLat),
          lng: Number(locationLng),
          label: locationLabel ? String(locationLabel) : null,
        });
      }

      const imageFile = formData.get('image') as File | null;
      if (imageFile && imageFile.size > 0) {
        if (imageFile.size > 5 * 1024 * 1024) {
          return ApiResponse.badRequest('Image attachment must be less than 5MB');
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.type)) {
          return ApiResponse.badRequest('Image attachment must be JPEG, PNG, or WebP');
        }

        const extension = imageFile.type === 'image/png' ? 'png' : imageFile.type === 'image/webp' ? 'webp' : 'jpg';
        const storageKey = `messages/${user.id}/${Date.now()}.${extension}`;
        const fileBuffer = new Uint8Array(await imageFile.arrayBuffer());

        const { error: uploadError } = await supabase.storage
          .from(MESSAGE_ATTACHMENTS_BUCKET)
          .upload(storageKey, fileBuffer, {
            contentType: imageFile.type,
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          return ApiResponse.error(uploadError.message, 500);
        }

        imageAttachment = {
          type: 'image',
          storageKey,
          mimeType: imageFile.type,
          fileName: imageFile.name,
        };
      }

      body = {
        listingId: formData.get('listingId'),
        buyerId: formData.get('buyerId'),
        buyerName: formData.get('buyerName'),
        sellerId: formData.get('sellerId'),
        sellerName: formData.get('sellerName'),
        text: rawText,
        attachments: locationAttachments,
      };
    } else {
      body = await readJsonBody(request);
    }

    const parsed = messageCreateSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid message payload', parsed.error.flatten());
    }
    const { listingId, buyerId, buyerName, sellerId, sellerName, text, attachments } = parsed.data;
    if (user.id !== buyerId && user.id !== sellerId) {
      return ApiResponse.forbidden('Not authorized to send messages for this listing');
    }

    const sanitizedText = sanitizeText(text || '', 2000);
    const storedAttachments: MessageAttachment[] = [
      ...(attachments || []).map((attachment) => ({
        ...attachment,
        label: attachment.label ? sanitizeText(attachment.label, 120) : undefined,
      })),
    ];
    if (imageAttachment) {
      storedAttachments.push(imageAttachment);
    }

    if (!sanitizedText && storedAttachments.length === 0) {
      return ApiResponse.badRequest('Message must include text or an attachment');
    }

    const { data: message, error } = await (supabase
      .from('messages') as any)
      .insert({
        listing_id: listingId,
        sender_id: user.id,
        text: sanitizedText,
        attachments: storedAttachments,
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

    const admin = createSupabaseAdminClient();
    const responseAttachments = await expandAttachments(
      admin,
      (message.attachments as MessageAttachment[] | null | undefined) || storedAttachments
    );

    // Fire-and-forget push notification to the other party
    const recipientId = user.id === buyerId ? sellerId : buyerId;
    const senderName = user.id === buyerId ? (buyerName || 'Buyer') : (sellerName || 'Seller');
    const notificationBody = sanitizedText
      ? sanitizedText
      : imageAttachment
        ? 'Sent an image attachment'
        : 'Shared a location pin';
    sendPushToUser(recipientId, {
      title: `New message from ${senderName}`,
      body: notificationBody.length > 100 ? notificationBody.slice(0, 97) + '...' : notificationBody,
      url: '/account?tab=messages',
    }).catch(() => {});
    sendWhatsAppToUser(
      recipientId,
      `New message from ${senderName}: ${notificationBody.length > 100 ? notificationBody.slice(0, 97) + '...' : notificationBody}`
    ).catch(() => {});

    return ApiResponse.success({
      id: message.id,
      listingId: message.listing_id,
      senderId: message.sender_id,
      text: message.text,
      attachments: responseAttachments,
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

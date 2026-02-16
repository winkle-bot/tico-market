import type { Listing, FrontendListing } from '@/lib/supabase-types';

export function extractImageUrls(listing: Listing): string[] {
  if (listing.image_urls && Array.isArray(listing.image_urls)) {
    return listing.image_urls as string[];
  }
  if (listing.image_url) {
    return [listing.image_url];
  }
  return [];
}

export function toFrontendListing(listing: Listing): FrontendListing {
  return {
    id: listing.id,
    sellerId: listing.seller_id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    priceCents: listing.price_cents ?? null,
    currency: listing.currency ?? 'CRC',
    category: listing.category,
    location: [listing.location_lat, listing.location_lng],
    rating: listing.rating,
    type: listing.type,
    owner: listing.owner,
    imageUrl: listing.image_url,
    imageUrls: extractImageUrls(listing),
    condition: listing.condition ?? 'good',
    itemType: listing.item_type ?? 'physical',
    fulfillmentOptions: listing.fulfillment_options as Record<string, unknown> | null,
    verified: listing.verified,
    moderationStatus: listing.moderation_status ?? 'active',
    privateKey: listing.private_key,
    pickupConfig: listing.pickup_config,
    landmarkDirections: listing.landmark_directions ?? null,
    expiresAt: listing.expires_at ?? null,
    lastBumpedAt: listing.last_bumped_at ?? null,
    createdAt: listing.created_at,
  };
}

export function parsePriceValue(price: string): number {
  const normalized = price.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

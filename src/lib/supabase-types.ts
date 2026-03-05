// Type helpers for Supabase queries
import type { Database } from './database.types';

// Base table types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Listing = Database['public']['Tables']['listings']['Row'];
export type Favorite = Database['public']['Tables']['favorites']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type DriverProfile = Database['public']['Tables']['driver_profiles']['Row'];
export type DeliveryRequest = Database['public']['Tables']['delivery_requests']['Row'];
export type DeliveryBid = Database['public']['Tables']['delivery_bids']['Row'];
export type SinpeConfig = Database['public']['Tables']['sinpe_config']['Row'];
export type EventDriver = Database['public']['Tables']['event_drivers']['Row'];
export type Feria = Database['public']['Tables']['ferias']['Row'];
export type FeriaVendor = Database['public']['Tables']['feria_vendors']['Row'];
export type FeriaFollower = Database['public']['Tables']['feria_followers']['Row'];

// Joined types
export type ProfileWithFavorites = Profile & {
  favorites: Pick<Favorite, 'listing_id'>[];
};

export type ListingWithSeller = Listing & {
  profiles: Pick<Profile, 'name' | 'rating' | 'verified'>;
};

// Frontend types (transformed from database)
export interface FrontendListing {
  id: number;
  sellerId: string;
  title: string;
  description: string | null;
  /** Display-ready price string derived from priceCents via formatPrice() */
  price: string;
  priceCents: number;
  currency: 'CRC' | 'USD';
  category: string;
  location: [number, number];
  rating: number;
  listingKind: 'seller' | 'driver';
  owner: string;
  imageUrl: string | null;
  imageUrls: string[];
  condition: string;
  itemType: string;
  fulfillmentOptions: Record<string, unknown> | null;
  verified: boolean;
  moderationStatus?: 'active' | 'hidden';
  privateKey: string | null;
  pickupConfig: Database['public']['Tables']['listings']['Row']['pickup_config'];
  landmarkDirections: string | null;
  expiresAt: string | null;
  lastBumpedAt: string | null;
  createdAt: string;
}

export interface FrontendProfile {
  id: string;
  email?: string;
  name: string;
  bio: string | null;
  location: string | null;
  rating: number;
  verified: boolean;
  role?: 'user' | 'admin' | 'moderator';
  joined: string;
  pickupLocations: Database['public']['Tables']['profiles']['Row']['pickup_locations'];
  acceptsDelivery: boolean;
  avgResponseMinutes: number | null;
  totalTransactions: number;
  landmarkDirections: string | null;
  verificationBadges: Array<{ type: string; verified_at: string }>;
  createdAt: string;
  updatedAt: string;
  favorites: number[];
}

// Type guards
export function isListing(data: unknown): data is Listing {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as { id?: unknown; title?: unknown };
  return typeof candidate.id === 'number' && typeof candidate.title === 'string';
}

export function isProfile(data: unknown): data is Profile {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as { id?: unknown; email?: unknown };
  return typeof candidate.id === 'string' && typeof candidate.email === 'string';
}

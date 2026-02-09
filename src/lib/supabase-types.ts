// Type helpers for Supabase queries
import type { Database } from './database.types';

// Base table types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Listing = Database['public']['Tables']['listings']['Row'];
export type Favorite = Database['public']['Tables']['favorites']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];

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
  price: string;
  category: string;
  location: [number, number];
  rating: number;
  type: 'seller' | 'driver';
  owner: string;
  imageUrl: string | null;
  verified: boolean;
  moderationStatus?: 'active' | 'hidden';
  privateKey: string | null;
  pickupConfig: Database['public']['Tables']['listings']['Row']['pickup_config'];
  createdAt: string;
}

export interface FrontendProfile {
  id: string;
  email: string;
  name: string;
  bio: string | null;
  location: string | null;
  rating: number;
  verified: boolean;
  role?: 'user' | 'admin' | 'moderator';
  joined: string;
  pickupLocations: Database['public']['Tables']['profiles']['Row']['pickup_locations'];
  acceptsDelivery: boolean;
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

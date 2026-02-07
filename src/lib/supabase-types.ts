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
  privateKey: string | null;
  pickupConfig: any;
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
  joined: string;
  pickupLocations: any;
  acceptsDelivery: boolean;
  createdAt: string;
  updatedAt: string;
  favorites: number[];
}

// Type guards
export function isListing(data: any): data is Listing {
  return data && typeof data.id === 'number' && typeof data.title === 'string';
}

export function isProfile(data: any): data is Profile {
  return data && typeof data.id === 'string' && typeof data.email === 'string';
}
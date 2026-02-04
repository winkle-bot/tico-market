// Core data types for TicoMarket

export interface Listing {
  id: number;
  sellerId: string;
  title: string;
  description?: string;
  price: string;
  category: Category;
  location: [number, number]; // [lat, lng]
  rating: number;
  type: 'seller' | 'driver';
  owner: string;
  imageUrl?: string;
  verified?: boolean;
  privateKey?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  joined: string;
  verified: boolean;
  favorites?: string[];
  bio?: string;
  location?: string;
}

export interface Message {
  id: number;
  listingId: number;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export interface Conversation {
  participantId: string;
  participantName: string;
  listingId: number;
  listingTitle: string;
  lastMessage: string;
  lastTimestamp: number;
  unread?: boolean;
}

// Category type - matches the categories array
export type Category =
  | 'Electronics'
  | 'Home'
  | 'Vehicles'
  | 'Food'
  | 'Services'
  | 'Fashion'
  | 'Sports'
  | 'Delivery'
  | 'Other';

// Auth form state
export interface AuthFormState {
  email: string;
  password: string;
  name: string;
}

// New listing form state
export interface NewListingForm {
  title: string;
  price: string;
  category: Category;
  image: File | null;
}

// Driver selection in booking modal
export type BookingStep = 1 | 2;

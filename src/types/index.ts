// Core data types for TicoMarket

// ============ TIME & SCHEDULE ============

export interface TimeRange {
  start: string; // "09:00" (24hr format)
  end: string;   // "17:00"
}

export interface WeeklySchedule {
  monday?: TimeRange[];
  tuesday?: TimeRange[];
  wednesday?: TimeRange[];
  thursday?: TimeRange[];
  friday?: TimeRange[];
  saturday?: TimeRange[];
  sunday?: TimeRange[];
}

// ============ PICKUP ============

export interface PickupLocation {
  id: string;
  name: string;           // "My Shop", "Escazú Office"
  address: string;        // Full address
  coords: [number, number]; // [lat, lng]
  schedule: WeeklySchedule;
  notes?: string;         // "Ring bell at gate", "Closed holidays"
}

// ============ LISTINGS ============

export interface ListingPickupConfig {
  availableLocationIds?: string[]; // Subset of seller's locations (empty = all)
  deliveryAvailable?: boolean;     // Override seller default
  pickupOnly?: boolean;            // Large items - no delivery option
  specialInstructions?: string;
}

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
  // Pickup configuration
  pickupConfig?: ListingPickupConfig;
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

// ============ USERS ============

export interface User {
  id: string;
  email: string;
  name: string;
  joined: string;
  verified: boolean;
  favorites: number[];
  bio?: string;
  location?: string;
  rating?: number;
  // Seller pickup settings
  pickupLocations?: PickupLocation[];
  acceptsDelivery?: boolean; // Default true
}

// ============ ORDERS ============

export type OrderType = 'delivery' | 'pickup';
export type OrderStatus = 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  listingId: number;
  // Snapshot of listing at time of order
  listingSnapshot: {
    title: string;
    price: string;
    imageUrl?: string;
  };
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  type: OrderType;
  status: OrderStatus;
  
  // Delivery specific
  driverId?: string;
  driverName?: string;
  deliveryAddress?: string;
  deliveryFee?: number;
  
  // Pickup specific
  pickupLocationId?: string;
  pickupLocation?: PickupLocation; // Snapshot
  scheduledWindow?: string; // "Monday afternoon", "Sat 10am-12pm"
  
  // Meta
  notes?: string; // Buyer's note to seller
  createdAt: string;
  updatedAt: string;
}

// ============ MESSAGES ============

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

// ============ FORM STATES ============

export interface AuthFormState {
  email: string;
  password: string;
  name: string;
}

export interface NewListingForm {
  title: string;
  price: string;
  category: Category;
  description: string;
  image: File | null;
  // Pickup config
  pickupOnly: boolean;
  deliveryAvailable: boolean;
  pickupLocationIds: string[];
}

export type BookingStep = 1 | 2;

// ============ CHECKOUT ============

export type CheckoutStep = 'method' | 'pickup-details' | 'delivery-details' | 'confirm';

export interface CheckoutState {
  step: CheckoutStep;
  method: OrderType | null;
  selectedLocationId: string | null;
  scheduledWindow: string | null;
  deliveryAddress: string;
  selectedDriverId: string | null;
  notes: string;
}

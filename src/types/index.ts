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

export interface MarketEvent {
  id: string;
  name: string; // "Feria del Agricultor Escazú"
  date: string; // ISO date or "Every Saturday"
  timeWindow: string; // "07:00 - 13:00"
  locationName: string;
  wazeLink?: string;
  coords?: [number, number];
}

export interface PickupLocation {
  id: string;
  name: string;           // "My Shop", "Escazú Office"
  address: string;        // Full address
  coords: [number, number]; // [lat, lng]
  wazeLink?: string;      // Deep link to Waze
  schedule: WeeklySchedule;
  notes?: string;         // "Ring bell at gate", "Closed holidays"
}

// ============ LISTINGS ============

export interface ListingPickupConfig {
  availableLocationIds?: string[]; // Subset of seller's locations (empty = all)
  deliveryAvailable?: boolean;     // Override seller default
  pickupAvailable?: boolean;       // Can this item be picked up?
  pickupOnly?: boolean;            // Large items - no delivery option
  specialInstructions?: string;
  leadTime?: string;             // "2 days", "Available Wednesdays"
  marketEvents?: MarketEvent[];  // Specific events this item is available at
}

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'for_parts';
export type ListingItemType = 'physical' | 'food' | 'service' | 'rental' | 'free';
export type ListingCurrency = 'CRC' | 'USD';

export interface FulfillmentOptions {
  pickup?: boolean;
  platform_delivery?: boolean;
  seller_delivers?: boolean;
  shipping?: boolean;
  delivery_fee?: number | null;
}

export interface Listing {
  id: number;
  sellerId: string;
  title: string;
  description?: string;
  price: string;
  priceCents?: number | null;
  currency?: ListingCurrency;
  category: Category;
  location: [number, number]; // [lat, lng]
  rating: number;
  type: 'seller' | 'driver';
  owner: string;
  imageUrl?: string;
  imageUrls?: string[];
  condition?: ListingCondition;
  itemType?: ListingItemType;
  fulfillmentOptions?: FulfillmentOptions;
  verified?: boolean;
  moderationStatus?: 'active' | 'hidden';
  privateKey?: string;
  // Pickup configuration
  pickupConfig?: ListingPickupConfig;
  landmarkDirections?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
}

// Category type - matches the categories array (aligned with PRD §4.1.3)
export type Category =
  | 'Food'
  | 'Home'
  | 'Electronics'
  | 'Vehicles'
  | 'Fashion'
  | 'Services'
  | 'Rentals'
  | 'Artisan'
  | 'Free'
  | 'Other';

// ============ USERS ============

export interface User {
  id: string;
  email: string;
  name: string;
  joined: string;
  verified: boolean;
  role?: 'user' | 'admin' | 'moderator';
  favorites: number[];
  bio?: string;
  location?: string;
  rating?: number;
  // Seller pickup settings
  pickupLocations?: PickupLocation[];
  acceptsDelivery?: boolean; // Default true
}

// ============ DRIVER MARKETPLACE ============

export type VehicleType = 'motorcycle' | 'car' | 'pickup' | 'bike' | 'walker';
export type DriverVehicleType = 'motorcycle' | 'car' | 'pickup';
export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type DeliveryRequestType = 'auto' | 'manual' | 'broadcast';
export type NegotiationStatus = 'proposed' | 'accepted' | 'rejected' | 'countered';

export interface DriverProfile {
  id: string;
  userId: string;
  name: string;
  photoUrl?: string;
  faceImageUrl?: string;
  vehicleType: VehicleType | null;
  capacityDescription?: string;
  specialties: string[];
  serviceRadiusKm: number;
  baseLocationLat?: number;
  baseLocationLng?: number;
  currentLat?: number;
  currentLng?: number;
  isOnline: boolean;
  liveNow?: boolean;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  totalDeliveries: number;
  rating: number;
  baseRate?: number;
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DriverDocument {
  id: string;
  driverProfileId: string;
  documentType: 'license';
  storageKey: string;
  uploadedAt: string;
}

export interface DeliveryNegotiation {
  id: string;
  deliveryRequestId: string;
  proposedBy: string;
  amount: number;
  status: NegotiationStatus;
  createdAt: string;
}

export type DeliveryRequestStatus = 'open' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
export type DeliveryBidStatus = 'pending' | 'accepted' | 'rejected';

export interface DeliveryRequest {
  id: string;
  requesterId: string;
  status: DeliveryRequestStatus;
  requestType: DeliveryRequestType;
  targetDriverId?: string;
  offeredPrice?: number;
  expiresAt?: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  pickupInstructions?: string;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
  dropoffAddress: string;
  dropoffLat?: number;
  dropoffLng?: number;
  dropoffInstructions?: string;
  dropoffWindowStart?: string;
  dropoffWindowEnd?: string;
  itemDescription: string;
  itemPhotos: string[];
  estimatedWeightKg?: number;
  isFragile: boolean;
  budgetAmount?: number;
  finalAmount?: number;
  assignedDriverId?: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryBid {
  id: string;
  deliveryRequestId: string;
  driverId: string;
  amount: number;
  etaMinutes?: number;
  message?: string;
  status: DeliveryBidStatus;
  createdAt: string;
  updatedAt: string;
}

// ============ ORDERS ============

export type OrderType = 'delivery' | 'pickup';
export type OrderStatus = 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'requires_payment' | 'paid' | 'failed' | 'refunded';
export type CheckoutPaymentMethod = 'card' | 'sinpe_movil' | 'cash';

export interface SinpeConfig {
  id: string;
  label: string;
  phoneNumber: string;
  accountHolder: string;
  instructions?: string;
  isEnabled: boolean;
}

export type EventDriverStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface EventDriverSignup {
  id: string;
  driverId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  locationName: string;
  availabilityStart?: string;
  availabilityEnd?: string;
  notes?: string;
  status: EventDriverStatus;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryTrackingPhase =
  | 'awaiting_confirmation'
  | 'awaiting_pickup'
  | 'picked_up'
  | 'near_buyer'
  | 'delivered';

export interface DeliveryTrackingUpdate {
  id: string;
  byUserId?: string;
  byRole: 'buyer' | 'seller' | 'driver' | 'system';
  message: string;
  createdAt: string;
}

export interface DeliveryMeta {
  mode?: 'express' | 'scheduled';
  estimatedEtaMinutes?: number;
  estimatedDistanceKm?: number;
  driverAssignedAt?: string;
  driverLocationLabel?: string;
  phase?: DeliveryTrackingPhase;
  updates?: DeliveryTrackingUpdate[];
}

export interface Order {
  id: string;
  listingId: number;
  // Snapshot of listing at time of order
  listingSnapshot: {
    title: string;
    price: string;
    imageUrl?: string;
    deliveryMeta?: DeliveryMeta;
    [key: string]: unknown;
  };
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  type: OrderType;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  
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
  paymentAmount?: number;
  paymentCurrency?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ MESSAGES ============

export interface Message {
  id: number;
  listingId: number;
  senderId: string;
  text: string;
  createdAt: string;
  read: boolean;
  
  // Context fields stored with message
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  
  // Legacy
  receiverId?: string;
  timestamp?: number;
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

export interface GroupedConversation {
  listingId: number;
  listingTitle: string;
  listingImage?: string;
  otherPartyId: string;
  otherPartyName: string;
  lastMessageAt: string;
  messages: Message[];
}

// ============ REVIEWS ============
export interface Review {
  id: number;
  orderId: string;
  listingId: number;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Report {
  id: number;
  reporterId: string;
  targetType: 'listing' | 'user';
  targetListingId?: number;
  targetUserId?: string;
  reason: string;
  details?: string;
  status: 'open' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// ============ DISPUTES ============

export type DisputeReason = 'item_not_received' | 'item_not_as_described' | 'damaged' | 'wrong_item' | 'seller_unresponsive' | 'other';
export type DisputeStatus = 'open' | 'under_review' | 'resolved_buyer' | 'resolved_seller' | 'resolved_refund' | 'closed';

export interface Dispute {
  id: string;
  orderId: string;
  openedBy: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderRole: 'buyer' | 'seller' | 'admin';
  senderName?: string;
  text: string;
  evidenceUrls: string[];
  createdAt: string;
}

// ============ NOTIFICATIONS ============

export interface NotificationPrefs {
  push_messages: boolean;
  push_orders: boolean;
  push_delivery: boolean;
  whatsapp_messages: boolean;
  whatsapp_orders: boolean;
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
  currency: ListingCurrency;
  category: Category;
  description: string;
  images: File[];
  condition: ListingCondition;
  itemType: ListingItemType;
  // Fulfillment
  pickupAvailable: boolean;
  platformDelivery: boolean;
  sellerDelivers: boolean;
  sellerDeliveryFee: string;
  shipping: boolean;
  pickupLocationIds: string[];
  leadTime: string;
  marketEvents: MarketEvent[];
}

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

// Centralized constants for TicoMarket

// Default map center: San José, Costa Rica
export const MAP_CENTER: [number, number] = [9.9281, -84.0907];
export const MAP_DEFAULT_ZOOM = 13;

// Default coordinates for new listings (San José)
export const DEFAULT_LISTING_COORDS = {
  lat: 9.9281,
  lng: -84.0907,
};

// Driver delivery fee
export const DELIVERY_FEE = 2500; // ₡2,500
export const DELIVERY_FEE_DISPLAY = '₡2,500';

// Currency
export const CURRENCY_SYMBOL = '₡';

// API endpoints
export const API_ROUTES = {
  LISTINGS: '/api/listings',
  AUTH: '/api/auth',
  MESSAGES: '/api/messages',
  USERS: '/api/users',
  ORDERS: '/api/orders',
} as const;

// Animation variants for Framer Motion
export const MODAL_BACKDROP_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const MODAL_CONTENT_VARIANTS = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

export const SLIDE_IN_VARIANTS = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
};

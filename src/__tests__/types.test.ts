import type {
  FrontendListing,
  FrontendProfile,
  Listing,
  Profile
} from '@/lib/supabase-types';

describe('TypeScript Type Tests', () => {
  test('FrontendListing type has correct properties', () => {
    const sampleListing: FrontendListing = {
      id: 1,
      sellerId: 'user-123',
      title: 'Test Listing',
      description: 'Test description',
      price: '₡50,000',
      priceCents: 5000000,
      currency: 'CRC',
      category: 'Electronics',
      location: [9.9281, -84.0907],
      rating: 4.5,
      type: 'seller',
      owner: 'Test Owner',
      imageUrl: null,
      imageUrls: [],
      condition: 'good',
      itemType: 'physical',
      fulfillmentOptions: null,
      verified: true,
      moderationStatus: 'active',
      privateKey: null,
      pickupConfig: {},
      landmarkDirections: null,
      expiresAt: null,
      lastBumpedAt: null,
      createdAt: '2026-02-06T18:40:00Z',
    };

    expect(sampleListing).toHaveProperty('id');
    expect(sampleListing).toHaveProperty('title');
    expect(sampleListing).toHaveProperty('price');
    expect(sampleListing).toHaveProperty('category');
    expect(sampleListing).toHaveProperty('location');
    expect(Array.isArray(sampleListing.location)).toBe(true);
    expect(sampleListing.location).toHaveLength(2);
  });

  test('FrontendProfile type has correct properties', () => {
    const sampleProfile: FrontendProfile = {
      id: 'user-123',
      name: 'Test User',
      bio: 'Test bio',
      location: 'San José, Costa Rica',
      rating: 4.8,
      verified: true,
      joined: '2026-01-01',
      pickupLocations: null,
      acceptsDelivery: true,
      avgResponseMinutes: null,
      totalTransactions: 0,
      landmarkDirections: null,
      verificationBadges: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
      favorites: [1, 2, 3],
    };

    expect(sampleProfile).toHaveProperty('id');
    expect(sampleProfile).toHaveProperty('name');
    expect(sampleProfile).toHaveProperty('favorites');
    expect(Array.isArray(sampleProfile.favorites)).toBe(true);
  });

  test('Database Listing type matches structure', () => {
    const dbListing: Listing = {
      id: 1,
      seller_id: 'user-123',
      title: 'Test Listing',
      description: 'Test description',
      price: '₡50,000',
      price_cents: 5000000,
      currency: 'CRC',
      category: 'Electronics',
      location_lat: 9.9281,
      location_lng: -84.0907,
      rating: 4.5,
      type: 'seller',
      owner: 'Test Owner',
      image_url: null,
      image_urls: [],
      condition: 'good',
      item_type: 'physical',
      fulfillment_options: null,
      verified: true,
      moderation_status: 'active',
      private_key: null,
      pickup_config: {},
      landmark_directions: null,
      expires_at: null,
      last_bumped_at: null,
      created_at: '2026-02-06T18:40:00Z',
      updated_at: '2026-02-06T18:40:00Z',
    };

    expect(dbListing).toHaveProperty('seller_id');
    expect(dbListing).toHaveProperty('location_lat');
    expect(dbListing).toHaveProperty('location_lng');
    expect(dbListing).toHaveProperty('created_at');
  });

  test('Database Profile type matches structure', () => {
    const dbProfile: Profile = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      bio: 'Test bio',
      location: 'San José, Costa Rica',
      rating: 4.8,
      verified: true,
      role: 'user',
      joined: '2026-01-01',
      pickup_locations: null,
      accepts_delivery: true,
      avg_response_minutes: null,
      total_transactions: 0,
      landmark_directions: null,
      verification_badges: [],
      notification_prefs: {},
      phone_number: null,
      whatsapp_opted_in: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    };

    expect(dbProfile).toHaveProperty('pickup_locations');
    expect(dbProfile).toHaveProperty('accepts_delivery');
    expect(dbProfile).toHaveProperty('created_at');
    expect(dbProfile).toHaveProperty('updated_at');
  });

  test('Type transformations are consistent', () => {
    const dbListing: Listing = {
      id: 1,
      seller_id: 'user-123',
      title: 'Test',
      description: 'Test',
      price: '₡10',
      price_cents: 1000,
      currency: 'CRC',
      category: 'Test',
      location_lat: 0,
      location_lng: 0,
      rating: 5,
      type: 'seller',
      owner: 'Test',
      image_url: null,
      image_urls: [],
      condition: 'good',
      item_type: 'physical',
      fulfillment_options: null,
      verified: true,
      moderation_status: 'active',
      private_key: null,
      pickup_config: {},
      landmark_directions: null,
      expires_at: null,
      last_bumped_at: null,
      created_at: '2026-02-06T18:40:00Z',
      updated_at: '2026-02-06T18:40:00Z',
    };

    const frontendListing: FrontendListing = {
      id: dbListing.id,
      sellerId: dbListing.seller_id,
      title: dbListing.title,
      description: dbListing.description,
      price: dbListing.price ?? '',
      priceCents: dbListing.price_cents ?? 0,
      currency: dbListing.currency,
      category: dbListing.category,
      location: [dbListing.location_lat, dbListing.location_lng],
      rating: dbListing.rating,
      listingKind: dbListing.listing_kind,
      owner: dbListing.owner,
      imageUrl: dbListing.image_url,
      imageUrls: dbListing.image_urls as string[],
      condition: dbListing.condition ?? 'good',
      itemType: dbListing.item_type ?? 'physical',
      fulfillmentOptions: dbListing.fulfillment_options as Record<string, unknown> | null,
      verified: dbListing.verified,
      moderationStatus: dbListing.moderation_status ?? 'active',
      privateKey: dbListing.private_key,
      pickupConfig: dbListing.pickup_config,
      landmarkDirections: dbListing.landmark_directions,
      expiresAt: dbListing.expires_at,
      lastBumpedAt: dbListing.last_bumped_at,
      createdAt: dbListing.created_at,
    };

    expect(frontendListing.sellerId).toBe(dbListing.seller_id);
    expect(frontendListing.location[0]).toBe(dbListing.location_lat);
    expect(frontendListing.location[1]).toBe(dbListing.location_lng);
  });
});

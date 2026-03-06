import {
  buildSavedSearchFingerprint,
  buildSavedSearchName,
  matchesSavedSearch,
} from '@/lib/saved-searches';

describe('saved search helpers', () => {
  test('buildSavedSearchFingerprint normalizes duplicate categories and casing', () => {
    expect(
      buildSavedSearchFingerprint({
        query: '  Mango ',
        categories: ['Food', 'Food', 'Artisan'],
        sort: 'newest',
      })
    ).toBe(
      buildSavedSearchFingerprint({
        query: 'mango',
        categories: ['Artisan', 'Food'],
        sort: 'newest',
      })
    );
  });

  test('buildSavedSearchName prefers query over categories', () => {
    expect(
      buildSavedSearchName({
        query: 'organic eggs',
        categories: ['Food'],
      })
    ).toBe('organic eggs');
  });

  test('matchesSavedSearch evaluates text, category, and price bounds', () => {
    expect(
      matchesSavedSearch(
        {
          id: 1,
          seller_id: 'seller-1',
          title: 'Organic Eggs',
          description: 'Fresh from the feria',
          price_cents: 3500,
          currency: 'CRC',
          category: 'Food',
          location_lat: 9.9,
          location_lng: -84.1,
          rating: 5,
          listing_kind: 'seller',
          owner: 'Vendor',
          image_url: null,
          image_urls: [],
          fulfillment_options: null,
          pickup_config: null,
          verified: false,
          created_at: '2026-03-06T00:00:00Z',
          updated_at: '2026-03-06T00:00:00Z',
        } as any,
        {
          query: 'eggs',
          categories: ['Food'],
          minPrice: 3000,
          maxPrice: 4000,
        }
      )
    ).toBe(true);

    expect(
      matchesSavedSearch(
        {
          id: 1,
          seller_id: 'seller-1',
          title: 'Organic Eggs',
          description: 'Fresh from the feria',
          price_cents: 3500,
          currency: 'CRC',
          category: 'Food',
          location_lat: 9.9,
          location_lng: -84.1,
          rating: 5,
          listing_kind: 'seller',
          owner: 'Vendor',
          image_url: null,
          image_urls: [],
          fulfillment_options: null,
          pickup_config: null,
          verified: false,
          created_at: '2026-03-06T00:00:00Z',
          updated_at: '2026-03-06T00:00:00Z',
        } as any,
        {
          query: 'coffee',
          categories: ['Food'],
        }
      )
    ).toBe(false);
  });
});

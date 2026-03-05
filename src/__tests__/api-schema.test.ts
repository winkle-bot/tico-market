// Mock API response schemas for validation
describe('API Response Schema Tests', () => {
  test('listings API returns array of listings', () => {
    const mockListingsResponse = [
      {
        id: 1,
        sellerId: 'user-123',
        title: 'iPhone 13 Pro',
        description: 'Like new, 256GB',
        price: '₡450,000',
        category: 'Electronics',
        location: [9.9281, -84.0907],
        rating: 4.8,
        type: 'seller',
        owner: 'Carlos',
        imageUrl: '/uploads/iphone.jpg',
        verified: true,
        privateKey: null,
        pickupConfig: { locations: ['San José Centro'] },
        createdAt: '2026-02-01T10:00:00Z',
      },
      {
        id: 2,
        sellerId: 'user-456',
        title: 'Sofa 3 Seater',
        description: 'Comfortable fabric sofa',
        price: '₡85,000',
        category: 'Home',
        location: [9.9357, -84.1002],
        rating: 4.5,
        type: 'seller',
        owner: 'María',
        imageUrl: null,
        verified: false,
        privateKey: null,
        pickupConfig: null,
        createdAt: '2026-02-02T14:30:00Z',
      },
    ];

    expect(Array.isArray(mockListingsResponse)).toBe(true);
    
    mockListingsResponse.forEach(listing => {
      expect(listing).toHaveProperty('id');
      expect(listing).toHaveProperty('title');
      expect(listing).toHaveProperty('price');
      expect(listing).toHaveProperty('category');
      expect(listing).toHaveProperty('location');
      expect(listing).toHaveProperty('listingKind');
      expect(['seller', 'driver']).toContain(listing.listingKind);
    });
  });

  test('user profile API returns user data with favorites', () => {
    const mockUserResponse = {
      id: 'user-123',
      email: 'carlos@example.com',
      name: 'Carlos Rodríguez',
      bio: 'Local seller in San José',
      location: 'San José, Costa Rica',
      rating: 4.8,
      verified: true,
      joined: '2026-01-15',
      pickupLocations: [
        { id: 'loc-1', name: 'San José Centro', address: 'Av Central' },
        { id: 'loc-2', name: 'Escazú', address: 'Multiplaza' },
      ],
      acceptsDelivery: true,
      createdAt: '2026-01-15T09:00:00Z',
      updatedAt: '2026-02-05T16:20:00Z',
      favorites: [1, 3, 5],
    };

    expect(mockUserResponse).toHaveProperty('id');
    expect(mockUserResponse).toHaveProperty('email');
    expect(mockUserResponse).toHaveProperty('name');
    expect(mockUserResponse).toHaveProperty('favorites');
    expect(Array.isArray(mockUserResponse.favorites)).toBe(true);
  });

  test('auth API handles login response', () => {
    const mockAuthResponse = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
      session: {
        access_token: 'mock-token-123',
        refresh_token: 'mock-refresh-456',
      },
    };

    expect(mockAuthResponse.user).toHaveProperty('id');
    expect(mockAuthResponse.user).toHaveProperty('email');
    expect(mockAuthResponse.session).toHaveProperty('access_token');
  });

  test('messages API structure', () => {
    const mockMessagesResponse = [
      {
        id: 1,
        listingId: 123,
        senderId: 'user-123',
        text: 'Is this still available?',
        createdAt: '2026-02-05T14:30:00Z',
        read: false,
        buyerId: 'user-456',
        buyerName: 'Ana',
        sellerId: 'user-123',
        sellerName: 'Carlos',
      },
      {
        id: 2,
        listingId: 123,
        senderId: 'user-456',
        text: 'Yes, available until Friday',
        createdAt: '2026-02-05T14:35:00Z',
        read: true,
        buyerId: 'user-456',
        buyerName: 'Ana',
        sellerId: 'user-123',
        sellerName: 'Carlos',
      },
    ];

    mockMessagesResponse.forEach(message => {
      expect(message).toHaveProperty('listingId');
      expect(message).toHaveProperty('senderId');
      expect(message).toHaveProperty('text');
      expect(message).toHaveProperty('createdAt');
      expect(typeof message.read).toBe('boolean');
    });
  });

  test('orders API structure', () => {
    const mockOrderResponse = {
      id: 'order-abc123',
      listingId: 123,
      listingSnapshot: {
        id: 123,
        title: 'iPhone 13 Pro',
        price: '₡450,000',
        owner: 'Carlos',
      },
      buyerId: 'user-456',
      buyerName: 'Ana',
      sellerId: 'user-123',
      sellerName: 'Carlos',
      type: 'delivery',
      status: 'pending',
      driverId: null,
      driverName: null,
      deliveryAddress: 'San José, Calle 5, Av 8',
      deliveryFee: 5000,
      pickupLocationId: null,
      pickupLocation: null,
      scheduledWindow: '2026-02-07T14:00:00Z',
      notes: 'Please ring doorbell',
      createdAt: '2026-02-06T10:00:00Z',
      updatedAt: '2026-02-06T10:00:00Z',
    };

    expect(mockOrderResponse).toHaveProperty('id');
    expect(mockOrderResponse).toHaveProperty('listingId');
    expect(mockOrderResponse).toHaveProperty('type');
    expect(['delivery', 'pickup']).toContain(mockOrderResponse.type);
    expect(mockOrderResponse).toHaveProperty('status');
    expect(['pending', 'confirmed', 'in_transit', 'completed', 'cancelled']).toContain(mockOrderResponse.status);
  });

  test('error response structure', () => {
    const mockErrorResponse = {
      error: 'Listing not found',
      code: 'NOT_FOUND',
    };

    expect(mockErrorResponse).toHaveProperty('error');
    expect(mockErrorResponse).toHaveProperty('code');
  });
});

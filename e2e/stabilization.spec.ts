import { test, expect, type Page, type Route } from '@playwright/test';

const E2E_USER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'qa@tico.market',
  name: 'QA Buyer',
  joined: '2026-03-06T00:00:00.000Z',
  verified: true,
  role: 'user',
  favorites: [],
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function seedAuthenticatedUser(page: Page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem('tico:e2e-user', JSON.stringify(user));
  }, E2E_USER);
}

async function mockListingDetailPage(page: Page) {
  const listing = {
    id: 1,
    sellerId: '22222222-2222-2222-2222-222222222222',
    title: 'Fresh mangoes',
    description: 'Mangos frescos de la feria con entrega el mismo dia.',
    price: '₡2,500',
    priceCents: 2500,
    currency: 'CRC',
    category: 'Food',
    location: [9.93, -84.08],
    rating: 4.8,
    listingKind: 'seller',
    owner: 'Mango Farm',
    imageUrl: '/next.svg',
    imageUrls: ['/next.svg'],
    moderationStatus: 'active',
    createdAt: '2026-03-06T00:00:00.000Z',
  };

  await page.route('**/api/listings?*', (route) => json(route, { data: [], pagination: { page: 1, limit: 24, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false } }));
  await page.route('**/api/listings/1', (route) => json(route, listing));
  await page.route('**/api/users/22222222-2222-2222-2222-222222222222', (route) =>
    json(route, {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'seller@tico.market',
      name: 'Mango Farm',
      joined: '2026-03-01T00:00:00.000Z',
      verified: true,
      role: 'user',
      favorites: [],
      rating: 4.8,
      pickupLocations: [],
      acceptsDelivery: true,
      avgResponseMinutes: 12,
    })
  );
  await page.route('**/api/drivers?*', (route) => json(route, { data: [] }));
  await page.route('**/api/messages?userId=*', (route) => json(route, []));
  await page.route('**/api/events?userId=*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"type":"connected"}\n\n',
    })
  );
}

test.describe('Stabilization flows', () => {
  test('saved searches can be created and removed from the homepage', async ({ page }) => {
    await seedAuthenticatedUser(page);

    const savedSearchFingerprint =
      '{"query":"mango","categories":[],"listingKind":null,"minPrice":null,"maxPrice":null,"sort":"newest"}';
    let savedSearches: Array<Record<string, unknown>> = [];
    let savedSearchPostBody: Record<string, unknown> | null = null;

    await page.route('**/api/drivers?online=true', (route) => json(route, { data: [] }));
    await page.route('**/api/listings*', (route) =>
      json(route, {
        data: [
          {
            id: 1,
            sellerId: 'seller-1',
            title: 'Fresh mangoes',
            description: 'Sweet and ready for market day',
            price: '₡2,500',
            priceCents: 2500,
            category: 'Food',
            location: [9.93, -84.08],
            rating: 4.8,
            listingKind: 'seller',
            owner: 'Mango Farm',
            imageUrl: '/next.svg',
          },
        ],
        pagination: {
          page: 1,
          limit: 24,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      })
    );
    await page.route('**/api/saved-searches', async (route) => {
      if (route.request().method() === 'GET') {
        return json(route, { data: savedSearches });
      }

      savedSearchPostBody = JSON.parse(route.request().postData() || '{}') as Record<string, unknown>;
      savedSearches = [
        {
          id: 'saved-search-1',
          name: 'mango',
          query: 'mango',
          categories: [],
          sort: 'newest',
          alertEnabled: true,
          fingerprint: savedSearchFingerprint,
        },
      ];
      return json(route, savedSearches[0], 201);
    });
    await page.route('**/api/saved-searches/saved-search-1', async (route) => {
      savedSearches = [];
      return json(route, { deleted: true, id: 'saved-search-1' });
    });

    await page.goto('/');
    await page.getByLabel('Search listings').fill('mango');
    await expect(page.getByRole('button', { name: 'Save Alert' })).toBeEnabled();

    await page.getByRole('button', { name: 'Save Alert' }).click();

    expect(savedSearchPostBody).toEqual({
      query: 'mango',
      categories: [],
      sort: 'newest',
      alertEnabled: true,
    });
    await expect(page.getByText('Search alert saved')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Saved Alert' })).toBeVisible();
    await expect(page.getByLabel('Remove saved search mango')).toBeVisible();

    await page.getByLabel('Remove saved search mango').click();

    await expect(page.getByText('Saved search removed')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Alert' })).toBeVisible();
    await expect(page.getByLabel('Remove saved search mango')).toHaveCount(0);
  });

  test('feria follows update the detail view optimistically and persist server response', async ({
    page,
  }) => {
    await seedAuthenticatedUser(page);

    let followRequests = 0;

    await page.route('**/api/ferias/organic-saturday/follow', async (route) => {
      followRequests += 1;
      return json(route, {
        feriaId: 'feria-1',
        isFollowing: true,
        followerCount: 13,
      });
    });
    await page.route('**/api/ferias/organic-saturday', (route) =>
      json(route, {
        id: 'feria-1',
        name: 'Organic Saturday',
        slug: 'organic-saturday',
        description: 'Weekly local produce market',
        location_name: 'Escazu Centro',
        location_lat: 9.92,
        location_lng: -84.14,
        waze_link: null,
        schedule_text: 'Saturdays',
        schedule_days: ['saturday'],
        start_time: '07:00',
        end_time: '13:00',
        next_date: '2026-03-14',
        organizer_id: null,
        organizer_name: 'Organic Collective',
        contact_phone: null,
        cover_image_url: null,
        photos: [],
        vendor_count: 6,
        follower_count: 12,
        is_following: false,
        vendors: [],
      })
    );

    await page.goto('/ferias/organic-saturday');

    const followersRow = page
      .locator('div.flex.justify-between')
      .filter({ has: page.getByText('Followers', { exact: true }) });

    await expect(page.getByRole('heading', { name: 'Organic Saturday' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Follow' })).toBeVisible();
    await expect(followersRow.getByText('12', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Follow' }).click();

    expect(followRequests).toBe(1);
    await expect(page.getByText('Feria followed')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
    await expect(followersRow.getByText('13', { exact: true })).toBeVisible();
  });

  test('listing translation toggles between original and translated content', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockListingDetailPage(page);

    let translateRequestBody: Record<string, unknown> | null = null;
    await page.route('**/api/translate', async (route) => {
      translateRequestBody = JSON.parse(route.request().postData() || '{}') as Record<string, unknown>;
      return json(route, {
        translatedText: 'Fresh market mangoes with same-day delivery.',
        targetLanguage: 'en',
        provider: 'openai',
      });
    });

    await page.goto('/listing/1');

    await expect(page.getByText('Mangos frescos de la feria con entrega el mismo dia.')).toBeVisible();
    await page.getByRole('button', { name: 'Translate' }).first().click();

    expect(translateRequestBody).toEqual({
      text: 'Mangos frescos de la feria con entrega el mismo dia.',
      targetLanguage: 'en',
      context: 'listing',
    });
    await expect(page.getByText('Fresh market mangoes with same-day delivery.')).toBeVisible();
    await expect(page.getByText('Translated to English')).toBeVisible();

    await page.getByRole('button', { name: 'Show original' }).first().click();
    await expect(page.getByText('Mangos frescos de la feria con entrega el mismo dia.')).toBeVisible();
  });

  test('chat image attachments send through the listing detail chat flow', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockListingDetailPage(page);

    let capturedContentType = '';
    let capturedPostBody = '';
    let sentMessage: Record<string, unknown> | null = null;
    await page.route('**/api/messages?userId=*', async (route) => {
      if (!sentMessage) {
        return json(route, []);
      }

      return json(route, [
        {
          listingId: 1,
          listingTitle: 'Fresh mangoes',
          listingImage: '/next.svg',
          otherPartyId: '22222222-2222-2222-2222-222222222222',
          otherPartyName: 'Mango Farm',
          lastMessageAt: sentMessage.createdAt,
          messages: [sentMessage],
        },
      ]);
    });
    await page.route('**/api/messages', async (route) => {
      if (route.request().method() === 'POST') {
        capturedContentType = route.request().headers()['content-type'] || '';
        capturedPostBody = route.request().postData() || '';
        sentMessage = {
          id: 91,
          listingId: 1,
          senderId: E2E_USER.id,
          text: 'Photo attached',
          attachments: [
            {
              type: 'image',
              signedUrl: '/next.svg',
              fileName: 'mango.jpg',
            },
          ],
          createdAt: '2026-03-06T12:00:00.000Z',
          read: false,
          buyerId: E2E_USER.id,
          buyerName: E2E_USER.name,
          sellerId: '22222222-2222-2222-2222-222222222222',
          sellerName: 'Mango Farm',
        };
        return json(route, sentMessage);
      }

      return json(route, []);
    });

    await page.goto('/listing/1');
    await page.getByLabel('Message seller').click();

    await expect(page.getByRole('dialog', { name: 'Chat' })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'mango.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-bytes'),
    });
    await expect(page.getByText('mango.jpg')).toBeVisible();

    const messageInput = page.getByPlaceholder('Type a message...');
    await messageInput.fill('Photo attached');
    await messageInput.press('Enter');

    expect(capturedContentType).toContain('multipart/form-data');
    expect(capturedPostBody).toContain('Photo attached');
    expect(capturedPostBody).toContain('mango.jpg');
    await expect(page.getByAltText('mango.jpg')).toBeVisible();
    await expect(page.getByText('Photo attached')).toBeVisible();
  });
});

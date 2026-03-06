import { test, expect, type Page, type Route } from '@playwright/test';

const E2E_USER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'driver@tico.market',
  name: 'QA Driver',
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

async function seedOnlineController(page: Page) {
  await page.addInitScript(() => {
    let isOnline = true;
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => isOnline,
    });
    (window as Window & { __ticoSetOnline?: (next: boolean) => void }).__ticoSetOnline = (
      next: boolean
    ) => {
      isOnline = next;
      window.dispatchEvent(new Event(next ? 'online' : 'offline'));
    };
  });
}

async function setOnlineState(page: Page, next: boolean) {
  await page.evaluate((value) => {
    (window as Window & { __ticoSetOnline?: (state: boolean) => void }).__ticoSetOnline?.(value);
  }, next);
}

test.describe('Delivery offline flows', () => {
  test('delivery request creation queues offline and replays on reconnect', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await seedOnlineController(page);

    let createCount = 0;
    let createBody: Record<string, unknown> | null = null;
    await page.route('**/api/delivery-requests', async (route) => {
      createCount += 1;
      createBody = JSON.parse(route.request().postData() || '{}') as Record<string, unknown>;
      return json(route, {
        id: 'request-1',
        status: 'open',
      }, 201);
    });

    await page.goto('/delivery/request');
    await setOnlineState(page, false);

    await page.getByPlaceholder('Where to pick up the item').fill('Escazu centro');
    await page.getByPlaceholder('Where to deliver').fill('Santa Ana centro');
    await page.getByPlaceholder('Describe the item(s)').fill('Two grocery bags');
    await page.getByPlaceholder('e.g. 2500').fill('3500');
    await page.getByRole('button', { name: 'Send Delivery Request' }).click();

    expect(createCount).toBe(0);
    await expect(page.getByText('Delivery request queued for sync. It will send when your connection returns.')).toBeVisible();
    await expect(page.getByText('Offline mode active')).toBeVisible();
    await expect(page.getByText('1 action will send when your connection returns.')).toBeVisible();
    await expect
      .poll(async () =>
        page.evaluate(() => JSON.parse(window.localStorage.getItem('tico_offline_mutation_queue') || '[]').length)
      )
      .toBe(1);

    await setOnlineState(page, true);

    await expect.poll(() => createCount).toBe(1);
    expect(createBody).toEqual({
      requestType: 'broadcast',
      pickupAddress: 'Escazu centro',
      dropoffAddress: 'Santa Ana centro',
      itemDescription: 'Two grocery bags',
      budgetAmount: 3500,
      offeredPrice: 3500,
    });
    await expect
      .poll(async () =>
        page.evaluate(() => JSON.parse(window.localStorage.getItem('tico_offline_mutation_queue') || '[]').length)
      )
      .toBe(0);
  });

  test('delivery acceptance queues offline from the manage screen and replays on reconnect', async ({
    page,
  }) => {
    await seedAuthenticatedUser(page);
    await seedOnlineController(page);

    let acceptCount = 0;
    await page.route('**/api/delivery-requests/11111111-1111-1111-1111-111111111111', (route) =>
      json(route, {
        id: '11111111-1111-1111-1111-111111111111',
        requesterId: 'buyer-1',
        status: 'open',
        requestType: 'manual',
        offeredPrice: 2800,
        pickupAddress: 'Escazu centro',
        dropoffAddress: 'Santa Ana centro',
        itemDescription: 'Small parcel',
        createdAt: '2026-03-06T12:00:00.000Z',
      })
    );
    await page.route('**/api/delivery-requests/11111111-1111-1111-1111-111111111111/negotiations', (route) =>
      json(route, { data: [] })
    );
    await page.route('**/api/drivers/me', (route) => json(route, { id: 'driver-profile-1' }));
    await page.route('**/api/delivery-requests/11111111-1111-1111-1111-111111111111/accept', async (route) => {
      acceptCount += 1;
      return json(route, {
        message: 'Delivery request accepted!',
        deliveryRequestId: '11111111-1111-1111-1111-111111111111',
        status: 'assigned',
      });
    });

    await page.goto('/delivery/manage/11111111-1111-1111-1111-111111111111');
    await setOnlineState(page, false);

    await page.getByRole('button', { name: 'Accept' }).click();

    expect(acceptCount).toBe(0);
    await expect(page.getByText('Delivery acceptance queued for sync.')).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Status:' }).first()).toContainText('assigned');
    await expect
      .poll(async () =>
        page.evaluate(() => JSON.parse(window.localStorage.getItem('tico_offline_mutation_queue') || '[]').length)
      )
      .toBe(1);

    await setOnlineState(page, true);

    await expect.poll(() => acceptCount).toBe(1);
    await expect
      .poll(async () =>
        page.evaluate(() => JSON.parse(window.localStorage.getItem('tico_offline_mutation_queue') || '[]').length)
      )
      .toBe(0);
  });
});

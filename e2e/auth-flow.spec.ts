import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('homepage loads and shows key elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=TicoMarket')).toBeVisible();
    await expect(page.locator('text=Sell')).toBeVisible();
  });

  test('auth modal opens from navbar', async ({ page }) => {
    await page.goto('/');
    // Click the user/account button (triggers auth modal when not logged in)
    await page.locator('button[aria-label="Sign in"]').click();
    // Auth modal should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Welcome Back')).toBeVisible();
  });

  test('auth modal switches between login and signup', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[aria-label="Sign in"]').click();
    await expect(page.locator('text=Welcome Back')).toBeVisible();

    // Switch to signup
    await page.locator('text=Sign Up').last().click();
    await expect(page.locator('text=Create Account')).toBeVisible();
    // Name field should be visible in signup mode
    await expect(page.locator('label:has-text("Full Name")')).toBeVisible();

    // Switch back to login
    await page.locator('text=Login').last().click();
    await expect(page.locator('text=Welcome Back')).toBeVisible();
  });

  test('auth modal validates email field', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[aria-label="Sign in"]').click();

    // Try submitting with invalid email
    await page.locator('#auth-email').fill('notanemail');
    await page.locator('#auth-password').fill('password123');
    await page.locator('button:has-text("Login")').first().click();

    // Should show validation error
    await expect(page.locator('text=Invalid email')).toBeVisible();
  });

  test('auth modal validates password length', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[aria-label="Sign in"]').click();

    await page.locator('#auth-email').fill('test@example.com');
    await page.locator('#auth-password').fill('123');
    await page.locator('button:has-text("Login")').first().click();

    // Should show validation error
    await expect(page.locator('text=Password too short')).toBeVisible();
  });

  test('signup validates name field', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[aria-label="Sign in"]').click();
    await page.locator('text=Sign Up').last().click();

    await page.locator('#auth-email').fill('test@example.com');
    await page.locator('#auth-password').fill('password123');
    // Leave name empty
    await page.locator('button:has-text("Sign Up")').first().click();

    await expect(page.locator('text=Name required')).toBeVisible();
  });

  test('auth modal closes on backdrop click', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[aria-label="Sign in"]').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click the backdrop
    await page.locator('.bg-black\\/60').click({ force: true });

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('listing page loads', async ({ page }) => {
    await page.goto('/');
    // Wait for listings to load (either skeleton or actual cards)
    await page.waitForTimeout(2000);

    // The page should have filter bar elements
    await expect(page.locator('text=List View')).toBeVisible();
    await expect(page.locator('text=Map View')).toBeVisible();
  });

  test('category filter buttons have aria-pressed', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check that category buttons have aria-pressed
    const categoryButton = page.locator('[aria-pressed="false"]').first();
    await expect(categoryButton).toBeVisible();
  });

  test('skip to content link exists', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });
});

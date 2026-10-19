import { test, expect } from '@playwright/test';
import { SEED_USERS, login } from './utils';

test.describe('Authentication', () => {
  test('registers a new user and lands on the projects page (TC-01)', async ({ page }) => {
    const email = `e2e-${Date.now()}@test.local`;
    await page.goto('/register');
    await page.getByTestId('name-input').fill('E2E User');
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill('Password123!');
    await page.getByTestId('register-submit').click();

    await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();
  });

  test('logs in as a manager', async ({ page }) => {
    await login(page);
    await expect(page.getByTestId('logout-button')).toBeVisible();
    await expect(page.getByTestId('create-project-button')).toBeVisible();
  });

  test('shows an error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email-input').fill(SEED_USERS.manager.email);
    await page.getByTestId('password-input').fill('wrong-password');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('login-error')).toBeVisible();
  });

  test('logs out and returns to the login page', async ({ page }) => {
    await login(page);
    await page.getByTestId('logout-button').click();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });
});

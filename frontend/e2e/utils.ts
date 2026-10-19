import { Page } from '@playwright/test';

export const SEED_USERS = {
  admin: { email: 'admin@kanban.local', password: 'Admin123!' },
  manager: { email: 'manager@kanban.local', password: 'Manager123!' },
  developer: { email: 'dev@kanban.local', password: 'Dev12345!' },
};

export async function login(page: Page, user = SEED_USERS.manager): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(user.email);
  await page.getByTestId('password-input').fill(user.password);
  await page.getByTestId('login-submit').click();
  await page.getByRole('heading', { name: 'Проекты' }).waitFor();
}

export function uniqueKey(prefix = 'E2E'): string {
  return (prefix + Date.now().toString(36)).toUpperCase().slice(0, 10);
}

import { test, expect, Page } from '@playwright/test';
import { login, uniqueKey } from './utils';

async function createProject(page: Page, key: string): Promise<void> {
  await page.getByTestId('create-project-button').click();
  await page.getByTestId('project-name-input').fill(`Project ${key}`);
  await page.getByTestId('project-key-input').fill(key);
  await page.getByTestId('project-submit').click();
  await expect(page.getByTestId(`project-card-${key}`)).toBeVisible();
}

async function waitForDialogsClosed(page: Page): Promise<void> {
  await page.getByTestId('card-save').waitFor({ state: 'hidden' }).catch(() => {});
  await page.getByTestId('column-save').waitFor({ state: 'hidden' }).catch(() => {});
  await page.locator('.MuiDialog-container').waitFor({ state: 'detached' }).catch(() => {});
}

async function addCard(page: Page, column: string, title: string): Promise<void> {
  await page.getByTestId(`add-card-${column}`).click();
  await page.getByTestId('card-title-input').fill(title);
  await page.getByTestId('card-save').click();
  await waitForDialogsClosed(page);
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

async function dragCardToColumn(page: Page, cardTitle: string, columnTestId: string): Promise<void> {
  const source = page.getByText(cardTitle, { exact: true });
  const target = page.getByTestId(columnTestId);
  const sb = await source.boundingBox();
  const tb = await target.boundingBox();
  if (!sb || !tb) throw new Error('Could not resolve drag coordinates');

  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.mouse.down();
  await page.mouse.move(sb.x + sb.width / 2 + 12, sb.y + sb.height / 2 + 12, { steps: 5 });
  await page.mouse.move(tb.x + tb.width / 2, tb.y + 80, { steps: 15 });
  await page.mouse.up();
}

test.describe('Kanban board', () => {
  test('creates a project, board, card and comments (TC-02)', async ({ page }) => {
    await login(page);
    const key = uniqueKey();
    await createProject(page, key);

    await page.getByTestId(`project-card-${key}`).click();
    await expect(page.getByTestId('project-title')).toContainText(`Project ${key}`);
    await expect(page.getByTestId('column-To Do')).toBeVisible();
    await expect(page.getByTestId('column-In Progress')).toBeVisible();
    await expect(page.getByTestId('column-Done')).toBeVisible();

    await addCard(page, 'To Do', 'Install CI pipeline');

    await page.getByText('Install CI pipeline').click();
    await page.getByTestId('comment-input').fill('Starting on this now');
    await page.getByTestId('add-comment-button').click();
    await expect(page.getByText('Starting on this now')).toBeVisible();
  });

  test('moves a card between columns with drag & drop (TC-03)', async ({ page }) => {
    await login(page);
    const key = uniqueKey();
    await createProject(page, key);
    await page.getByTestId(`project-card-${key}`).click();

    await addCard(page, 'To Do', 'Drag me across');
    await dragCardToColumn(page, 'Drag me across', 'column-In Progress');

    await expect(page.getByTestId('wip-In Progress')).toContainText('1/3');
  });

  test('blocks a card move that exceeds the WIP limit (TC-07)', async ({ page }) => {
    await login(page);
    const key = uniqueKey();
    await createProject(page, key);
    await page.getByTestId(`project-card-${key}`).click();

    await page.getByTestId('column-In Progress').getByRole('button', { name: 'edit column' }).click();
    await page.getByTestId('column-wip-input').fill('1');
    await page.getByTestId('column-save').click();
    await waitForDialogsClosed(page);
    await expect(page.getByTestId('wip-In Progress')).toContainText('0/1');

    await addCard(page, 'To Do', 'First move');
    await addCard(page, 'To Do', 'Second move');

    await dragCardToColumn(page, 'First move', 'column-In Progress');
    await expect(page.getByTestId('wip-In Progress')).toContainText('1/1');

    await dragCardToColumn(page, 'Second move', 'column-In Progress');
    await expect(page.getByTestId('board-error')).toContainText('WIP limit');
  });

  test('filters cards by search text (TC-06)', async ({ page }) => {
    await login(page);
    const key = uniqueKey();
    await createProject(page, key);
    await page.getByTestId(`project-card-${key}`).click();

    await addCard(page, 'To Do', 'Unique searchable task');

    await page.getByTestId('search-input').fill('Unique searchable');
    await expect(page.getByText('Unique searchable task')).toBeVisible();

    await page.getByTestId('search-input').fill('no-such-card-xyz');
    await expect(page.getByText('Unique searchable task')).toHaveCount(0);
  });
});

import { test, expect } from '@playwright/test';

test('create, edit, save, exit and re-enter document', async ({ page }) => {
  // Open app
  await page.goto('/');

  // Create a new document
  await page.getByRole('button', { name: '+ New document' }).click();
  await expect(page).toHaveURL(/\/document\//);

  const title = `E2E Test ${Date.now()}`;

  // Set document title
  const titleInput = page.getByLabel('Document title');
  await titleInput.fill(title);

  // Edit document content (Tiptap ProseMirror)
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.type('Hello from e2e test');

  // Wait for autosave to complete and show 'Saved'
  await expect(page.locator('.badge')).toHaveText('Saved', { timeout: 10000 });

  // Exit to dashboard
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/dashboard');

  // Re-open the document by clicking its title in the dashboard
  await page.getByText(title).click();
  await expect(page).toHaveURL(/\/document\//);

  // Verify title and content persisted
  await expect(page.getByLabel('Document title')).toHaveValue(title);
  await expect(page.locator('.ProseMirror')).toContainText('Hello from e2e test');
});

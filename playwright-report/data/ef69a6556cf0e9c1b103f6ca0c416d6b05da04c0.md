# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: document.spec.ts >> create, edit, save, exit and re-enter document
- Location: tests\e2e\document.spec.ts:3:1

# Error details

```
TimeoutError: locator.click: Timeout 5000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '+ New document' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - heading "Login" [level=1] [ref=e4]
      - generic [ref=e5]:
        - generic [ref=e6]:
          - text: Email
          - textbox "Email" [ref=e7]
        - generic [ref=e8]:
          - text: Password
          - textbox "Password" [ref=e9]
        - button "Sign in" [ref=e10]
  - button "Open Next.js Dev Tools" [ref=e16] [cursor=pointer]
  - alert [ref=e20]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('create, edit, save, exit and re-enter document', async ({ page }) => {
  4  |   // Open app
  5  |   await page.goto('/');
  6  | 
  7  |   // Create a new document
> 8  |   await page.getByRole('button', { name: '+ New document' }).click();
     |                                                              ^ TimeoutError: locator.click: Timeout 5000ms exceeded.
  9  |   await expect(page).toHaveURL(/\/document\//);
  10 | 
  11 |   const title = `E2E Test ${Date.now()}`;
  12 | 
  13 |   // Set document title
  14 |   const titleInput = page.getByLabel('Document title');
  15 |   await titleInput.fill(title);
  16 | 
  17 |   // Edit document content (Tiptap ProseMirror)
  18 |   const editor = page.locator('.ProseMirror');
  19 |   await editor.click();
  20 |   await page.keyboard.type('Hello from e2e test');
  21 | 
  22 |   // Wait for autosave to complete and show 'Saved'
  23 |   await expect(page.locator('.badge')).toHaveText('Saved', { timeout: 10000 });
  24 | 
  25 |   // Exit to dashboard
  26 |   await page.goto('/dashboard');
  27 |   await expect(page).toHaveURL('/dashboard');
  28 | 
  29 |   // Re-open the document by clicking its title in the dashboard
  30 |   await page.getByText(title).click();
  31 |   await expect(page).toHaveURL(/\/document\//);
  32 | 
  33 |   // Verify title and content persisted
  34 |   await expect(page.getByLabel('Document title')).toHaveValue(title);
  35 |   await expect(page.locator('.ProseMirror')).toContainText('Hello from e2e test');
  36 | });
  37 | 
```
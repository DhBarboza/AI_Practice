# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: form.spec.ts >> Form Submission and Validation >> should show validation errors for empty form
- Location: tests/form.spec.ts:15:9

# Error details

```
Test timeout of 5000ms exceeded.
```

```
Error: locator.click: Test timeout of 5000ms exceeded.
Call log:
  - waiting for locator('#btnSubmit')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "404" [level=1] [ref=e3]
  - paragraph [ref=e4]:
    - strong [ref=e5]: There isn't a GitHub Pages site here.
  - paragraph [ref=e6]:
    - text: If you're trying to publish one,
    - link "read the full documentation" [ref=e7] [cursor=pointer]:
      - /url: https://help.github.com/pages/
    - text: to learn how to set up
    - strong [ref=e8]: GitHub Pages
    - text: for your repository, organization, or user account.
  - generic [ref=e9]:
    - link "GitHub Status" [ref=e10] [cursor=pointer]:
      - /url: https://githubstatus.com
    - text: —
    - link "@githubstatus" [ref=e11] [cursor=pointer]:
      - /url: https://twitter.com/githubstatus
  - link [ref=e12] [cursor=pointer]:
    - /url: /
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Form Submission and Validation", () => {
  4  |     test("should submit the form and update the list", async ({ page }) => {
  5  |         await page.goto("/");
  6  |         // Fill the form fields
  7  |         await page.locator('#title').fill('Alien Test');
  8  |         await page.locator('#imageUrl').fill('https://img.com/alien.png');
  9  |         await page.locator('#btnSubmit').click();
  10 |         // Check that the list was updated
  11 |         await expect(page.locator('h4')).toContainText('Alien Test');
  12 |         await expect(page.locator('img')).toHaveAttribute('src', 'https://img.com/alien.png');
  13 |     });
  14 | 
  15 |     test("should show validation errors for empty form", async ({ page }) => {
  16 |         await page.goto("/");
  17 |         // Submit the form without filling fields
> 18 |         await page.locator('#btnSubmit').click();
     |                                          ^ Error: locator.click: Test timeout of 5000ms exceeded.
  19 |         // Check for validation error messages (using aria-describedby feedback)
  20 |         await expect(page.locator('#title[aria-describedby]')).toHaveAttribute('aria-invalid', 'true');
  21 |         await expect(page.locator('#imageUrl[aria-describedby]')).toHaveAttribute('aria-invalid', 'true');
  22 |     });
  23 | });
  24 | 
```
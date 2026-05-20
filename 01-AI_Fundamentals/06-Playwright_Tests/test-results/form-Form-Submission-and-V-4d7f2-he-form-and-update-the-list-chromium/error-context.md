# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: form.spec.ts >> Form Submission and Validation >> should submit the form and update the list
- Location: tests/form.spec.ts:4:9

# Error details

```
Error: page.goto: Target page, context or browser has been closed
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Form Submission and Validation", () => {
  4  |     test("should submit the form and update the list", async ({ page }) => {
> 5  |         await page.goto("/");
     |                    ^ Error: page.goto: Target page, context or browser has been closed
  6  |         // Fill the form fields
  7  |         await page.locator("#title").fill("Alien Test");
  8  |         await page.locator("#imageUrl").fill("https://img.com/alien.png");
  9  |         await page.locator("#btnSubmit").click();
  10 |         // Check that the list was updated
  11 |         await expect(page.locator("h4")).toContainText("Alien Test");
  12 |         await expect(page.locator("img")).toHaveAttribute(
  13 |             "src",
  14 |             "https://img.com/alien.png",
  15 |         );
  16 |     });
  17 | 
  18 |     test("should show validation errors for empty form", async ({ page }) => {
  19 |         await page.goto("/");
  20 |         // Submit the form without filling fields
  21 |         await page.locator("#btnSubmit").click();
  22 |         // Check for validation error messages (using aria-describedby feedback)
  23 |         await expect(page.locator("#title[aria-describedby]")).toHaveAttribute(
  24 |             "aria-invalid",
  25 |             "true",
  26 |         );
  27 |         await expect(
  28 |             page.locator("#imageUrl[aria-describedby]"),
  29 |         ).toHaveAttribute("aria-invalid", "true");
  30 |     });
  31 | });
  32 | 
```
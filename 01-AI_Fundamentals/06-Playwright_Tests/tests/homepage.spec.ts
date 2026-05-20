import { test, expect } from "@playwright/test";

test.describe("Vanilla JS Web App Example", () => {
    test("should load the homepage and display the title", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveTitle(/Vanilla JS Web App Example/i);
    });
});

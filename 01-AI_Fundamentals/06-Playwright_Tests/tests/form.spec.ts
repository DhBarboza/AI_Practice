import { test, expect } from "@playwright/test";

test.describe("Form Submission and Validation", () => {
    test("should submit the form and update the list", async ({ page }) => {
        await page.goto("/");
        // Fill the form fields
        await page.locator("#title").fill("Alien Test");
        await page.locator("#imageUrl").fill("https://img.com/alien.png");
        await page.locator("#btnSubmit").click();
        // Check that the list was updated
        await expect(page.locator("h4")).toContainText("Alien Test");
        await expect(page.locator("img")).toHaveAttribute(
            "src",
            "https://img.com/alien.png",
        );
    });

    test("should show validation errors for empty form", async ({ page }) => {
        await page.goto("/");
        // Submit the form without filling fields
        await page.locator("#btnSubmit").click();
        // Check for validation error messages (using aria-describedby feedback)
        await expect(page.locator("#title[aria-describedby]")).toHaveAttribute(
            "aria-invalid",
            "true",
        );
        await expect(
            page.locator("#imageUrl[aria-describedby]"),
        ).toHaveAttribute("aria-invalid", "true");
    });
});

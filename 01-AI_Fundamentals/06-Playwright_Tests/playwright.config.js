// @ts-check
const { defineConfig } = require("@playwright/test");

/**
 * Read more at https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
    testDir: "./tests",
    timeout: 5000,
    use: {
        baseURL: "https://erickwendel.github.io/vanilla-js-web-app-example/",
    },
    projects: [
        {
            name: "chromium",
            use: { browserName: "chromium", headless: false },
        },
    ],
});

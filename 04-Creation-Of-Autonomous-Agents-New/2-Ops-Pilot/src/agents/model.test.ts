import assert from "node:assert/strict";
import test from "node:test";
import {
  getOpenRouterModelConfig,
  openRouterBaseUrl,
} from "./model.js";

test("OpenRouter model configuration uses the selected model and zero temperature", () => {
  assert.deepEqual(
    getOpenRouterModelConfig({
      OPENROUTER_API_KEY: " test-key ",
      OPENROUTER_MODEL: " test-model ",
    }),
    {
      apiKey: "test-key",
      model: "test-model",
      temperature: 0,
      configuration: { baseURL: openRouterBaseUrl },
    },
  );
});

test("missing OpenRouter configuration fails without exposing key material", () => {
  assert.throws(
    () => getOpenRouterModelConfig({ OPENROUTER_API_KEY: "private-token" }),
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes("OPENROUTER_MODEL") &&
      !error.message.includes("private-token"),
  );
  assert.throws(
    () => getOpenRouterModelConfig({ OPENROUTER_MODEL: "model" }),
    /OPENROUTER_API_KEY/,
  );
});

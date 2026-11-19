import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateContextMetrics,
  estimateTokens,
} from "./tokens.js";
import type { ContextSourceTexts, UsageObservation } from "./tokens.js";

const emptySources: ContextSourceTexts = {
  currentMessage: "",
  conversationHistory: "",
  recalledMemories: "",
  agentInstructions: "",
  operationalToolContext: "",
};

function observation(
  inputTokens: number | null,
  sources: Partial<ContextSourceTexts> = {},
): UsageObservation {
  return {
    inputTokens,
    sources: { ...emptySources, ...sources },
  };
}

test("estimateTokens uses four characters per estimated token", () => {
  assert.equal(estimateTokens("abcd"), 1);
});

test("estimateTokens handles empty, short, and non-multiple-of-four text", () => {
  assert.equal(estimateTokens(""), 0);
  assert.equal(estimateTokens("abc"), 1);
  assert.equal(estimateTokens("abcde"), 2);
});

test("context metrics sum real usage and estimated source counts independently", () => {
  const metrics = aggregateContextMetrics([
    observation(7, { currentMessage: "abcd" }),
    observation(11, {
      currentMessage: "12345",
      recalledMemories: "memory",
    }),
  ]);

  assert.equal(metrics.promptTokens, 18);
  assert.deepEqual(metrics.contextBreakdown, {
    estimated: true,
    total: 5,
    sources: {
      currentMessage: 3,
      conversationHistory: 0,
      recalledMemories: 2,
      agentInstructions: 0,
      operationalToolContext: 0,
    },
  });
});

test("context metrics report real usage as unavailable when any call omits it", () => {
  const metrics = aggregateContextMetrics([
    observation(7, { currentMessage: "abcd" }),
    observation(null, { currentMessage: "12345" }),
  ]);

  assert.equal(metrics.promptTokens, null);
  assert.equal(metrics.contextBreakdown.total, 3);
});

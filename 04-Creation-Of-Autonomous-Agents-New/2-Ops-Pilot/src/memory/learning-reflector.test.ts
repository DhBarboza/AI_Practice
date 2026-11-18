import assert from "node:assert/strict";
import test from "node:test";
import { createLearningReflector } from "./learning-reflector.js";

test("learning reflector remembers only a validated durable fact for its user", async () => {
  const saved: Array<{ userId: string; fact: string }> = [];
  let receivedMessage = "";
  const reflector = createLearningReflector({
    memoryStore: {
      async remember(userId, fact) {
        saved.push({ userId, fact });
      },
    },
    assess: async (message) => {
      receivedMessage = message;
      return {
        hasLearning: true,
        fact: "  Prefers concise incident summaries.  ",
      };
    },
  });

  await reflector.learn("user-1", "I prefer concise incident summaries.");

  assert.equal(receivedMessage, "I prefer concise incident summaries.");
  assert.deepEqual(saved, [
    { userId: "user-1", fact: "Prefers concise incident summaries." },
  ]);
});

test("learning reflector ignores a false result, including a non-empty fact", async () => {
  let saves = 0;
  const reflector = createLearningReflector({
    memoryStore: {
      async remember() {
        saves += 1;
      },
    },
    assess: async () => ({
      hasLearning: false,
      fact: "This value must be ignored.",
    }),
  });

  await reflector.learn("user-1", "Please check this alert now.");

  assert.equal(saves, 0);
});

test("learning reflector rejects malformed and empty positive results", async () => {
  const invalidResults: unknown[] = [
    { hasLearning: true, fact: " " },
    { hasLearning: true, fact: null },
    { hasLearning: true, fact: "A preference", extra: true },
  ];

  for (const result of invalidResults) {
    let saves = 0;
    const reflector = createLearningReflector({
      memoryStore: {
        async remember() {
          saves += 1;
        },
      },
      assess: async () => result,
    });

    await assert.rejects(reflector.learn("user-1", "A user message"));
    assert.equal(saves, 0);
  }
});

test("learning reflector rejects credential-like source messages and candidate facts", async () => {
  for (const [message, fact] of [
    [
      "I prefer concise reports; my access token is [REDACTED].",
      "Prefers concise reports.",
    ],
    [
      "Please remember this preference.",
      "The user's API key is [REDACTED].",
    ],
  ]) {
    let saves = 0;
    const reflector = createLearningReflector({
      memoryStore: {
        async remember() {
          saves += 1;
        },
      },
      assess: async () => ({ hasLearning: true, fact }),
    });

    await reflector.learn("user-1", message);
    assert.equal(saves, 0);
  }
});

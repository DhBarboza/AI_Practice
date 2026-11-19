import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import {
  aggregateContextMetrics,
  emptyContextMetrics,
  estimateTokens,
} from "../context/tokens.js";
import { createApp } from "./server.js";
import type { ReasoningStrategy } from "../agents/types.js";
import type { ChatServerOptions } from "./server.js";
import { createOpsTools } from "../agents/tools.js";
import { SqliteOpsStore } from "../store/sqlite-ops-store.js";
import type { ConversationStore } from "../store/conversation-store.js";
import { SqliteConversationStore } from "../store/sqlite-conversation-store.js";
import type { MemoryStore } from "../memory/memory-store.js";

type TestChatServerOptions = Omit<
  ChatServerOptions,
  "conversationStore" | "memoryStore"
> & {
  conversationStore?: ConversationStore;
  memoryStore?: MemoryStore;
};

function fakeStrategy(
  name: string,
  run: ReasoningStrategy["run"] = async () => ({
    answer: `${name} answer`,
    trace: [{ type: "answer", content: `${name} answer` }],
    metrics: { llmCalls: 1, latencyMs: 2, ...emptyContextMetrics() },
  }),
): ReasoningStrategy {
  return { name, run };
}

async function withServer(
  options: TestChatServerOptions,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const conversationStore =
    options.conversationStore ?? new SqliteConversationStore(":memory:");
  const memoryStore = options.memoryStore ?? {
    async remember() {},
    async recall() {
      return [];
    },
    async forget() {
      return false;
    },
  };
  const server = createServer(
    createApp({
      ...options,
      conversationStore,
      memoryStore,
      learningReflector: options.learningReflector ?? {
        async learn() {},
      },
    }),
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    } finally {
      conversationStore.close();
    }
  }
}

test("POST /chat returns a conversation ID and resumes the saved history", async () => {
  const prompts: string[] = [];
  const strategy = fakeStrategy("react", async (input) => {
    prompts.push(input.input);
    return {
      answer: "A useful answer",
      trace: [],
      metrics: { llmCalls: 1, latencyMs: 2, ...emptyContextMetrics() },
    };
  });
  const conversationStore = new SqliteConversationStore(":memory:");

  await withServer(
    { registry: new Map([["react", strategy]]), conversationStore },
    async (baseUrl) => {
      const firstResponse = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "user-1", message: "First question" }),
      });
      assert.equal(firstResponse.status, 200);
      const firstResult = (await firstResponse.json()) as {
        conversationId: string;
        metrics: { historyMessages: number };
      };
      assert.match(firstResult.conversationId, /^conv-/);
      assert.equal(firstResult.metrics.historyMessages, 0);

      const secondResponse = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "user-1",
          message: "Follow-up",
          conversationId: firstResult.conversationId,
        }),
      });
      assert.equal(secondResponse.status, 200);
      const secondResult = (await secondResponse.json()) as {
        conversationId: string;
        metrics: { historyMessages: number };
      };
      assert.equal(secondResult.conversationId, firstResult.conversationId);
      assert.equal(secondResult.metrics.historyMessages, 2);
      assert.match(prompts[1] ?? "", /User: First question/);
      assert.match(prompts[1] ?? "", /Assistant: A useful answer/);
      assert.match(prompts[1] ?? "", /Current message: Follow-up/);
    },
  );
});

test("POST /chat returns a successful summary event without exposing transcript or summary text", async () => {
  const conversationStore = new SqliteConversationStore(":memory:");
  const conversationId = conversationStore.create();
  for (let index = 1; index <= 16; index += 1) {
    conversationStore.append(
      conversationId,
      index % 2 === 0 ? "assistant" : "user",
      `private-history-marker-${index}`,
    );
  }
  let summaryCalls = 0;
  let strategyInput = "";
  const strategy = fakeStrategy("react", async ({ input, contextSources }) => {
    strategyInput = input;
    assert.ok(contextSources);
    return {
      answer: "The incident remains open.",
      trace: [{ type: "answer", content: "The incident remains open." }],
      metrics: {
        llmCalls: 1,
        latencyMs: 2,
        ...aggregateContextMetrics([
          { inputTokens: 5, sources: contextSources },
        ]),
      },
    };
  });

  await withServer(
    {
      registry: new Map([["react", strategy]]),
      conversationStore,
      summarizer: {
        async summarize() {
          summaryCalls += 1;
          return {
            summary: "- private-summary-marker: incident remains open.",
            inputTokens: 3,
          };
        },
      },
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "user-1",
          message: "What is the incident status?",
          conversationId,
        }),
      });

      assert.equal(response.status, 200);
      const payload = (await response.json()) as {
        trace: unknown[];
        metrics: { llmCalls: number; promptTokens: number | null };
      };
      assert.deepEqual(payload.trace[0], {
        type: "summarize",
        messagesSummarized: 8,
        estimatedTokens: estimateTokens(
          "- private-summary-marker: incident remains open.",
        ),
      });
      assert.deepEqual(payload.trace[1], {
        type: "answer",
        content: "The incident remains open.",
      });
      assert.equal(payload.metrics.llmCalls, 2);
      assert.equal(payload.metrics.promptTokens, 8);
      assert.equal(summaryCalls, 1);
      assert.match(strategyInput, /private-summary-marker/);
      const serialized = JSON.stringify(payload);
      assert.doesNotMatch(serialized, /private-history-marker/);
      assert.doesNotMatch(serialized, /private-summary-marker/);
    },
  );
});

test("POST /chat fails explicitly when summary generation fails", async () => {
  const conversationStore = new SqliteConversationStore(":memory:");
  const conversationId = conversationStore.create();
  for (let index = 1; index <= 16; index += 1) {
    conversationStore.append(
      conversationId,
      index % 2 === 0 ? "assistant" : "user",
      `history-${index}`,
    );
  }
  let strategyCalls = 0;
  const strategy = fakeStrategy("react", async () => {
    strategyCalls += 1;
    return {
      answer: "Unexpected strategy call.",
      trace: [],
      metrics: { llmCalls: 1, latencyMs: 1, ...emptyContextMetrics() },
    };
  });

  await withServer(
    {
      registry: new Map([["react", strategy]]),
      conversationStore,
      summarizer: {
        async summarize() {
          throw new Error("sensitive summary generation details");
        },
      },
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "user-1",
          message: "Retry summary",
          conversationId,
        }),
      });

      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        error: "Internal server error",
      });
      assert.equal(strategyCalls, 0);
    },
  );
});

test("POST /chat defaults to react and returns its result with conversation metadata", async () => {
  const inputs: string[] = [];
  const react = fakeStrategy("react", async (input) => {
    inputs.push(input.input);
    return {
      answer: "Firing alerts checked.",
      trace: [{ type: "answer", content: "Firing alerts checked." }],
      metrics: { llmCalls: 2, latencyMs: 5, ...emptyContextMetrics() },
    };
  });

  test("POST /chat passes only the validated user and current message to learning", async () => {
    let receivedLearningInput: { userId: string; message: string } | undefined;

    await withServer(
      {
        registry: new Map([["react", fakeStrategy("react")]]),
        learningReflector: {
          async learn(userId, message) {
            receivedLearningInput = { userId, message };
          },
        },
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userId: "user-1",
            message: "Please check this alert.",
          }),
        });

        assert.equal(response.status, 200);
        assert.deepEqual(receivedLearningInput, {
          userId: "user-1",
          message: "Please check this alert.",
        });
        assert.deepEqual(Object.keys(await response.json()).sort(), [
          "answer",
          "conversationId",
          "metrics",
          "trace",
        ]);
      },
    );
  });

  await withServer({ registry: new Map([["react", react]]) }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "user-1", message: "List alerts" }),
    });

    assert.equal(response.status, 200);
    const result = (await response.json()) as {
      answer: string;
      trace: unknown[];
      metrics: { llmCalls: number; latencyMs: number; historyMessages: number };
      conversationId: string;
    };
    assert.deepEqual(result, {
      answer: "Firing alerts checked.",
      trace: [{ type: "answer", content: "Firing alerts checked." }],
      metrics: {
        llmCalls: 2,
        latencyMs: 5,
        historyMessages: 0,
        ...emptyContextMetrics(),
      },
      conversationId: result.conversationId,
    });
    assert.match(result.conversationId, /^conv-/);
    assert.deepEqual(inputs, ["List alerts"]);
  });
});

test("POST /chat returns actual usage separately from estimated source counts", async () => {
  const contextMetrics = aggregateContextMetrics([
    {
      inputTokens: 13,
      sources: {
        currentMessage: "hello",
        conversationHistory: "old",
        recalledMemories: "",
        agentInstructions: "",
        operationalToolContext: "",
      },
    },
  ]);
  const strategy = fakeStrategy("react", async () => ({
    answer: "A measured answer.",
    trace: [],
    metrics: { llmCalls: 1, latencyMs: 1, ...contextMetrics },
  }));

  await withServer({ registry: new Map([["react", strategy]]) }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "user-1", message: "Hello" }),
    });

    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.metrics, {
      llmCalls: 1,
      latencyMs: 1,
      historyMessages: 0,
      promptTokens: 13,
      contextBreakdown: {
        estimated: true,
        total: 3,
        sources: {
          currentMessage: 2,
          conversationHistory: 1,
          recalledMemories: 0,
          agentInstructions: 0,
          operationalToolContext: 0,
        },
      },
    });
  });
});

test("POST /chat preserves unavailable real usage without substituting estimates", async () => {
  const contextMetrics = aggregateContextMetrics([
    {
      inputTokens: null,
      sources: {
        currentMessage: "hello",
        conversationHistory: "",
        recalledMemories: "",
        agentInstructions: "",
        operationalToolContext: "",
      },
    },
  ]);
  const strategy = fakeStrategy("react", async () => ({
    answer: "An answer with unavailable usage.",
    trace: [],
    metrics: { llmCalls: 1, latencyMs: 1, ...contextMetrics },
  }));

  await withServer({ registry: new Map([["react", strategy]]) }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "user-1", message: "Hello" }),
    });

    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.metrics.promptTokens, null);
    assert.equal(result.metrics.contextBreakdown.estimated, true);
    assert.equal(result.metrics.contextBreakdown.sources.currentMessage, 2);
  });
});

test("POST /chat supports a strategy composed with an injected SQLite store", async (t) => {
  const store = new SqliteOpsStore(":memory:");
  t.after(() => store.close());
  const [listAlerts] = createOpsTools(store);
  const strategy = fakeStrategy("react", async () => {
    const alerts = JSON.parse(
      await listAlerts.invoke({ status: "firing" }),
    ) as unknown[];
    return {
      answer: `${alerts.length} alerts firing.`,
      trace: [],
      metrics: { llmCalls: 0, latencyMs: 1, ...emptyContextMetrics() },
    };
  });

  await withServer(
    { registry: new Map([["react", strategy]]) },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "user-1",
          message: "Check firing alerts",
        }),
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).answer, "3 alerts firing.");
    },
  );
});

test("POST /chat selects an explicit strategy and decorates it only when requested", async () => {
  let selectedCalls = 0;
  let decoratedCalls = 0;
  const selected = fakeStrategy("selected", async () => {
    selectedCalls += 1;
    return {
      answer: "Selected strategy response",
      trace: [],
      metrics: { llmCalls: 1, latencyMs: 1, ...emptyContextMetrics() },
    };
  });
  const registry = new Map([["selected", selected]]);

  await withServer(
    {
      registry,
      reflect: (strategy) => ({
        name: `reflected:${strategy.name}`,
        async run(input) {
          decoratedCalls += 1;
          return strategy.run(input);
        },
      }),
    },
    async (baseUrl) => {
      const normalResponse = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "user-1",
          message: "Normal",
          strategy: "selected",
        }),
      });
      assert.equal(normalResponse.status, 200);
      assert.equal(decoratedCalls, 0);

      const reflectedResponse = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "user-1",
          message: "Reflect this",
          strategy: "selected",
          reflect: true,
        }),
      });
      assert.equal(reflectedResponse.status, 200);
      assert.equal(decoratedCalls, 1);
      assert.equal(selectedCalls, 2);
    },
  );
});

test("POST /chat returns 400 issues for invalid and malformed bodies", async () => {
  let calls = 0;
  const react = fakeStrategy("react", async () => {
    calls += 1;
    return {
      answer: "Unexpected call",
      trace: [],
      metrics: { llmCalls: 1, latencyMs: 1, ...emptyContextMetrics() },
    };
  });

  await withServer({ registry: new Map([["react", react]]) }, async (baseUrl) => {
    for (const body of [
      JSON.stringify({ message: "  ", reflect: "yes" }),
      JSON.stringify({ message: "Hi", unexpected: true }),
      JSON.stringify({ message: "Missing user ID" }),
      JSON.stringify({ userId: " ", message: "Empty user ID" }),
      "{",
    ]) {
      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      assert.equal(response.status, 400);
      const payload = (await response.json()) as { issues: unknown[] };
      assert.ok(Array.isArray(payload.issues));
      assert.ok(payload.issues.length > 0);
    }
    assert.equal(calls, 0);
  });
});

test("POST /chat returns 422 for unknown strategies without execution", async () => {
  let calls = 0;
  const react = fakeStrategy("react", async () => {
    calls += 1;
    return {
      answer: "Unexpected call",
      trace: [],
      metrics: { llmCalls: 1, latencyMs: 1, ...emptyContextMetrics() },
    };
  });

  await withServer({ registry: new Map([["react", react]]) }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: "user-1",
        message: "Hi",
        strategy: "missing",
      }),
    });
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), { error: "Unknown strategy" });
    assert.equal(calls, 0);
  });
});

test("POST /chat rejects malformed and unknown conversation IDs without executing the strategy", async () => {
  let createCalls = 0;
  let strategyCalls = 0;
  const strategy = fakeStrategy("react", async () => {
    strategyCalls += 1;
    return {
      answer: "Unexpected call",
      trace: [],
      metrics: { llmCalls: 1, latencyMs: 1, ...emptyContextMetrics() },
    };
  });
  const conversationStore: ConversationStore = {
    create() {
      createCalls += 1;
      return "conv-unexpected";
    },
    append() {
      throw new Error("Unexpected append");
    },
    lastMessages() {
      return [];
    },
    messagesAfter() {
      return [];
    },
    getSummary() {
      return null;
    },
    saveSummary() {},
    close() {},
  };

  await withServer(
    { registry: new Map([["react", strategy]]), conversationStore },
    async (baseUrl) => {
      const malformedResponse = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Hi", conversationId: " " }),
      });
      assert.equal(malformedResponse.status, 400);

      const unknownResponse = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "user-1",
          message: "Hi",
          conversationId: "conv-not-found",
        }),
      });
      assert.equal(unknownResponse.status, 404);
      assert.deepEqual(await unknownResponse.json(), {
        error: "Unknown conversation",
      });
      assert.equal(createCalls, 0);
      assert.equal(strategyCalls, 0);
    },
  );
});

test("POST /chat returns 504 when strategy execution exceeds the deadline", async () => {
  const slow = fakeStrategy(
    "react",
    () => new Promise((resolve) => setTimeout(() => resolve({
      answer: "Too late",
      trace: [],
      metrics: { llmCalls: 1, latencyMs: 50, ...emptyContextMetrics() },
    }), 50)),
  );

  await withServer(
    { registry: new Map([["react", slow]]), timeoutMs: 5 },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "user-1", message: "Wait" }),
      });
      assert.equal(response.status, 504);
      assert.deepEqual(await response.json(), { error: "Request timed out" });
    },
  );
});

test("POST /chat returns 500 for strategy failures without leaking the error", async () => {
  const failing = fakeStrategy("react", async () => {
    throw new Error("sensitive internal details");
  });

  await withServer({ registry: new Map([["react", failing]]) }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "user-1", message: "Fail" }),
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Internal server error" });
  });
});

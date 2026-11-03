import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createApp } from "./server.js";
import type { ReasoningStrategy } from "../agents/types.js";
import type { ChatServerOptions } from "./server.js";

function fakeStrategy(
  name: string,
  run: ReasoningStrategy["run"] = async () => ({
    answer: `${name} answer`,
    trace: [{ type: "answer", content: `${name} answer` }],
    metrics: { llmCalls: 1, latencyMs: 2 },
  }),
): ReasoningStrategy {
  return { name, run };
}

async function withServer(
  options: ChatServerOptions,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer(createApp(options));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("POST /chat defaults to react and returns exactly the reasoning result fields", async () => {
  const inputs: string[] = [];
  const react = fakeStrategy("react", async (input) => {
    inputs.push(input.input);
    return {
      answer: "Firing alerts checked.",
      trace: [{ type: "answer", content: "Firing alerts checked." }],
      metrics: { llmCalls: 2, latencyMs: 5 },
    };
  });

  await withServer({ registry: new Map([["react", react]]) }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "List alerts" }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      answer: "Firing alerts checked.",
      trace: [{ type: "answer", content: "Firing alerts checked." }],
      metrics: { llmCalls: 2, latencyMs: 5 },
    });
    assert.deepEqual(inputs, ["List alerts"]);
  });
});

test("POST /chat selects an explicit strategy and decorates it only when requested", async () => {
  let selectedCalls = 0;
  let decoratedCalls = 0;
  const selected = fakeStrategy("selected", async () => {
    selectedCalls += 1;
    return {
      answer: "Selected strategy response",
      trace: [],
      metrics: { llmCalls: 1, latencyMs: 1 },
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
        body: JSON.stringify({ message: "Normal", strategy: "selected" }),
      });
      assert.equal(normalResponse.status, 200);
      assert.equal(decoratedCalls, 0);

      const reflectedResponse = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
      metrics: { llmCalls: 1, latencyMs: 1 },
    };
  });

  await withServer({ registry: new Map([["react", react]]) }, async (baseUrl) => {
    for (const body of [
      JSON.stringify({ message: "  ", reflect: "yes" }),
      JSON.stringify({ message: "Hi", unexpected: true }),
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
      metrics: { llmCalls: 1, latencyMs: 1 },
    };
  });

  await withServer({ registry: new Map([["react", react]]) }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Hi", strategy: "missing" }),
    });
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), { error: "Unknown strategy" });
    assert.equal(calls, 0);
  });
});

test("POST /chat returns 504 when strategy execution exceeds the deadline", async () => {
  const slow = fakeStrategy(
    "react",
    () => new Promise((resolve) => setTimeout(() => resolve({
      answer: "Too late",
      trace: [],
      metrics: { llmCalls: 1, latencyMs: 50 },
    }), 50)),
  );

  await withServer(
    { registry: new Map([["react", slow]]), timeoutMs: 5 },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Wait" }),
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
      body: JSON.stringify({ message: "Fail" }),
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Internal server error" });
  });
});

import assert from "node:assert/strict";
import test from "node:test";
import { runLongConversation } from "./conversa-longa.js";

function chatResponse(conversationId: string, promptTokens: number | null) {
  return {
    answer: "Answer",
    trace: [],
    conversationId,
    metrics: {
      llmCalls: 1,
      latencyMs: 1,
      historyMessages: 0,
      promptTokens,
      contextBreakdown: {
        estimated: true,
        total: 0,
        sources: {
          currentMessage: 0,
          conversationHistory: 0,
          recalledMemories: 0,
          agentInstructions: 0,
          operationalToolContext: 0,
        },
      },
    },
  };
}

test("long conversation sends sequential turns and prints only real usage", async () => {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const outputs: string[] = [];
  const responses = [
    chatResponse("conv-123e4567-e89b-12d3-a456-426614174000", 31),
    chatResponse("conv-123e4567-e89b-12d3-a456-426614174000", null),
    chatResponse("conv-123e4567-e89b-12d3-a456-426614174000", 68),
  ];

  await runLongConversation({
    baseUrl: "http://127.0.0.1:3000",
    userId: "cli-user",
    messages: ["First question", "Follow-up", "One more"],
    fetchImpl: async (url, init) => {
      requests.push({
        url: String(url),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      const payload = responses[requests.length - 1];
      assert.ok(payload);
      return new Response(JSON.stringify(payload), { status: 200 });
    },
    writeLine: (line) => outputs.push(line),
  });

  assert.deepEqual(requests, [
    {
      url: "http://127.0.0.1:3000/chat",
      body: { userId: "cli-user", message: "First question" },
    },
    {
      url: "http://127.0.0.1:3000/chat",
      body: {
        userId: "cli-user",
        message: "Follow-up",
        conversationId: "conv-123e4567-e89b-12d3-a456-426614174000",
      },
    },
    {
      url: "http://127.0.0.1:3000/chat",
      body: {
        userId: "cli-user",
        message: "One more",
        conversationId: "conv-123e4567-e89b-12d3-a456-426614174000",
      },
    },
  ]);
  assert.deepEqual(outputs, [
    "Turn 1: promptTokens=31",
    "Turn 2: promptTokens=unavailable",
    "Turn 3: promptTokens=68",
  ]);
});

test("long conversation rejects an unsuccessful HTTP response", async () => {
  await assert.rejects(
    runLongConversation({
      messages: ["First question"],
      fetchImpl: async () => new Response("Internal server error", { status: 500 }),
      writeLine: () => {},
    }),
    /500/,
  );
});

test("long conversation rejects a malformed chat response", async () => {
  await assert.rejects(
    runLongConversation({
      messages: ["First question"],
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            ...chatResponse(
              "conv-123e4567-e89b-12d3-a456-426614174000",
              5,
            ),
            metrics: {
              ...chatResponse(
                "conv-123e4567-e89b-12d3-a456-426614174000",
                5,
              ).metrics,
              promptTokens: -1,
            },
          }),
          { status: 200 },
        ),
      writeLine: () => {},
    }),
  );
});

import assert from "node:assert/strict";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import test from "node:test";
import {
  createConversationSummarizer,
  SUMMARIZER_PROMPT,
} from "./conversation-summarizer.js";

const sourceMessages = [
  {
    id: "message-1",
    conversationId: "conv-1",
    role: "user" as const,
    content: "Payments latency began at 10:00.",
    createdAt: "2026-11-18T10:00:00.000Z",
  },
  {
    id: "message-2",
    conversationId: "conv-1",
    role: "assistant" as const,
    content: "The incident remains open.",
    createdAt: "2026-11-18T10:01:00.000Z",
  },
];

test("conversation summarizer sends the required prompt and validates output and usage", async () => {
  let receivedMessages: readonly BaseMessage[] = [];
  const summarizer = createConversationSummarizer(async (messages) => {
    receivedMessages = messages;
    return {
      raw: new AIMessage({
        content: "summary",
        usage_metadata: { input_tokens: 31, output_tokens: 12, total_tokens: 43 },
      }),
      parsed: {
        summary: "- Payments latency began at 10:00; incident remains open.",
      },
    };
  });

  const result = await summarizer.summarize({
    previousSummary: "- Checkout errors are under investigation.",
    messages: sourceMessages,
  });

  assert.equal(receivedMessages.length, 2);
  assert.ok(receivedMessages[0] instanceof SystemMessage);
  assert.equal(receivedMessages[0]?.content, SUMMARIZER_PROMPT);
  assert.ok(receivedMessages[1] instanceof HumanMessage);
  assert.match(String(receivedMessages[1]?.content), /Resumo anterior:/);
  assert.match(String(receivedMessages[1]?.content), /Checkout errors are under investigation/);
  assert.match(String(receivedMessages[1]?.content), /User: Payments latency began at 10:00\./);
  assert.match(String(receivedMessages[1]?.content), /Assistant: The incident remains open\./);
  assert.deepEqual(result, {
    summary: "- Payments latency began at 10:00; incident remains open.",
    inputTokens: 31,
  });
});

test("conversation summarizer rejects invalid summaries and marks missing usage as unavailable", async () => {
  const invalidSummarizer = createConversationSummarizer(async () => ({
    raw: new AIMessage({ content: "invalid" }),
    parsed: { summary: "   " },
  }));
  await assert.rejects(
    invalidSummarizer.summarize({
      previousSummary: null,
      messages: sourceMessages,
    }),
  );

  const noUsageSummarizer = createConversationSummarizer(async () => ({
    raw: new AIMessage({ content: "valid" }),
    parsed: { summary: "- Open incident: Payments latency." },
  }));
  assert.deepEqual(
    await noUsageSummarizer.summarize({
      previousSummary: null,
      messages: sourceMessages,
    }),
    {
      summary: "- Open incident: Payments latency.",
      inputTokens: null,
    },
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import type {
  ConversationMessage,
  ConversationRole,
  ConversationStore,
} from "../store/conversation-store.js";
import { createChatService } from "./chat-service.js";
import type { ChatStrategy } from "./chat-service.js";

class FakeConversationStore implements ConversationStore {
  readonly messages: ConversationMessage[] = [];
  readonly calls: string[] = [];
  private nextId = 1;

  create(): string {
    this.calls.push("create");
    return "conv-generated";
  }

  append(
    conversationId: string,
    role: ConversationRole,
    content: string,
  ): ConversationMessage {
    this.calls.push(`append:${role}`);
    const message = {
      id: `message-${this.nextId++}`,
      conversationId,
      role,
      content,
      createdAt: new Date().toISOString(),
    };
    this.messages.push(message);
    return message;
  }

  lastMessages(conversationId: string, limit: number): ConversationMessage[] {
    this.calls.push("lastMessages");
    return this.messages
      .filter((message) => message.conversationId === conversationId)
      .slice(-limit);
  }

  close(): void {}
}

function fakeStrategy(
  run: ChatStrategy["run"],
): ChatStrategy {
  return { run };
}

test("chat service creates an ID and appends the user before invoking the strategy", async () => {
  const store = new FakeConversationStore();
  const service = createChatService(store);
  const strategy = fakeStrategy(async ({ message, history }) => {
    assert.equal(message, "Check alerts");
    assert.deepEqual(history, []);
    assert.deepEqual(store.calls, ["create", "lastMessages", "append:user"]);
    assert.deepEqual(
      store.messages.map(({ role, content }) => ({ role, content })),
      [{ role: "user", content: "Check alerts" }],
    );
    return {
      answer: "No active alerts.",
      trace: [],
      metrics: { llmCalls: 1, latencyMs: 2 },
    };
  });

  const result = await service.runChat({
    message: "Check alerts",
    strategy,
  });

  assert.equal(result.conversationId, "conv-generated");
  assert.equal(result.answer, "No active alerts.");
  assert.deepEqual(
    store.messages.map(({ role }) => role),
    ["user", "assistant"],
  );
  assert.deepEqual(store.calls, [
    "create",
    "lastMessages",
    "append:user",
    "append:assistant",
  ]);
});

test("chat service passes saved messages as history and retains the supplied ID", async () => {
  const store = new FakeConversationStore();
  store.messages.push(
    {
      id: "message-old-user",
      conversationId: "conv-existing",
      role: "user",
      content: "What is firing?",
      createdAt: new Date().toISOString(),
    },
    {
      id: "message-old-assistant",
      conversationId: "conv-existing",
      role: "assistant",
      content: "Three alerts.",
      createdAt: new Date().toISOString(),
    },
  );
  const service = createChatService(store);
  const strategy = fakeStrategy(async ({ message, history }) => {
    assert.equal(message, "Which services?");
    assert.deepEqual(
      history.map(({ role, content }) => ({ role, content })),
      [
        { role: "user", content: "What is firing?" },
        { role: "assistant", content: "Three alerts." },
      ],
    );
    return {
      answer: "Checkout, Payments, and Auth.",
      trace: [],
      metrics: { llmCalls: 1, latencyMs: 3 },
    };
  });

  const result = await service.runChat({
    conversationId: "conv-existing",
    message: "Which services?",
    strategy,
  });

  assert.equal(result.conversationId, "conv-existing");
  assert.deepEqual(store.calls, [
    "lastMessages",
    "append:user",
    "append:assistant",
  ]);
});

test("chat service leaves the user message saved if the strategy fails", async () => {
  const store = new FakeConversationStore();
  const service = createChatService(store);
  const strategy = fakeStrategy(async () => {
    throw new Error("strategy failed");
  });

  await assert.rejects(
    service.runChat({ message: "Investigate", strategy }),
    /strategy failed/,
  );
  assert.deepEqual(
    store.messages.map(({ role, content }) => ({ role, content })),
    [{ role: "user", content: "Investigate" }],
  );
  assert.deepEqual(store.calls, ["create", "lastMessages", "append:user"]);
});

test("chat service reports the exact recent-history count and passes messages in order", async () => {
  for (const savedCount of [0, 5, 12, 15]) {
    const store = new FakeConversationStore();
    const conversationId = "conv-existing";
    for (let index = 1; index <= savedCount; index += 1) {
      store.messages.push({
        id: `message-${index}`,
        conversationId,
        role: index % 2 === 0 ? "assistant" : "user",
        content: `message-${index}`,
        createdAt: new Date().toISOString(),
      });
    }

    let receivedHistory: ConversationMessage[] = [];
    const strategy = fakeStrategy(async ({ history }) => {
      receivedHistory = [...history];
      return {
        answer: "Answer",
        trace: [],
        metrics: { llmCalls: 1, latencyMs: 1 },
      };
    });
    const service = createChatService(store);
    const result = await service.runChat({
      ...(savedCount > 0 ? { conversationId } : {}),
      message: "Next question",
      strategy,
    });
    const expectedCount = Math.min(savedCount, 12);

    assert.equal(result.metrics.historyMessages, expectedCount);
    assert.deepEqual(
      receivedHistory.map(({ content }) => content),
      Array.from(
        { length: expectedCount },
        (_value, index) => `message-${savedCount - expectedCount + index + 1}`,
      ),
    );
  }
});

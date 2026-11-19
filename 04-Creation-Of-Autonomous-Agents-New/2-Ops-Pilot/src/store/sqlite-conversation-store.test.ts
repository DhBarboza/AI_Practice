import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SqliteConversationStore } from "./sqlite-conversation-store.js";

test("SQLite conversation store creates conversations and returns appended messages in order", (t) => {
  const store = new SqliteConversationStore(":memory:");
  t.after(() => store.close());

  const conversationId = store.create();
  assert.match(conversationId, /^conv-[0-9a-f-]{36}$/i);

  const user = store.append(conversationId, "user", "First message");
  const assistant = store.append(conversationId, "assistant", "First answer");

  assert.equal(user.conversationId, conversationId);
  assert.equal(user.role, "user");
  assert.equal(user.content, "First message");
  assert.ok(user.createdAt);
  assert.notEqual(user.id, assistant.id);
  assert.deepEqual(
    store.lastMessages(conversationId, 12).map(({ role, content }) => ({
      role,
      content,
    })),
    [
      { role: "user", content: "First message" },
      { role: "assistant", content: "First answer" },
    ],
  );
  assert.deepEqual(
    store.lastMessages(conversationId, 1).map(({ content }) => content),
    ["First answer"],
  );
});

test("SQLite conversation store keeps messages available after closing and reopening", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "opspilot-conversation-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "conversations.db");

  const firstStore = new SqliteConversationStore(path);
  const conversationId = firstStore.create();
  firstStore.append(conversationId, "user", "Persist this");
  firstStore.append(conversationId, "assistant", "Persisted");
  firstStore.close();

  const secondStore = new SqliteConversationStore(path);
  t.after(() => secondStore.close());
  assert.deepEqual(
    secondStore.lastMessages(conversationId, 12).map(({ content }) => content),
    ["Persist this", "Persisted"],
  );
});

test("SQLite conversation store persists summaries and selects messages after the coverage cursor", (t) => {
  const store = new SqliteConversationStore(":memory:");
  t.after(() => store.close());
  const conversationId = store.create();
  const first = store.append(conversationId, "user", "First");
  const second = store.append(conversationId, "assistant", "Second");
  const third = store.append(conversationId, "user", "Third");

  assert.equal(store.getSummary(conversationId), null);
  assert.deepEqual(
    store.messagesAfter(conversationId).map(({ id }) => id),
    [first.id, second.id, third.id],
  );
  assert.deepEqual(
    store.messagesAfter(conversationId, first.id).map(({ id }) => id),
    [second.id, third.id],
  );

  const summary = {
    conversationId,
    summary: "- Incident opened; Payments errors started at 10:00.",
    coveredThroughMessageId: second.id,
    updatedAt: new Date().toISOString(),
  };
  store.saveSummary(summary);
  assert.deepEqual(store.getSummary(conversationId), summary);

  const replacement = {
    ...summary,
    summary: "- Incident resolved; Payments latency returned to normal.",
    coveredThroughMessageId: third.id,
    updatedAt: new Date().toISOString(),
  };
  store.saveSummary(replacement);
  assert.deepEqual(store.getSummary(conversationId), replacement);
});

test("SQLite conversation store persists summary coverage after reopening", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "opspilot-summary-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "conversations.db");
  const firstStore = new SqliteConversationStore(path);
  const conversationId = firstStore.create();
  const covered = firstStore.append(conversationId, "user", "Covered");
  const pending = firstStore.append(conversationId, "assistant", "Pending");
  const summary = {
    conversationId,
    summary: "- Decision: investigate Payments latency.",
    coveredThroughMessageId: covered.id,
    updatedAt: new Date().toISOString(),
  };
  firstStore.saveSummary(summary);
  firstStore.close();

  const secondStore = new SqliteConversationStore(path);
  t.after(() => secondStore.close());
  assert.deepEqual(secondStore.getSummary(conversationId), summary);
  assert.deepEqual(
    secondStore.messagesAfter(
      conversationId,
      summary.coveredThroughMessageId,
    ),
    [pending],
  );
});

test("SQLite conversation store rejects a summary cursor from another conversation", (t) => {
  const store = new SqliteConversationStore(":memory:");
  t.after(() => store.close());
  const conversationId = store.create();
  const otherConversationId = store.create();
  const foreignMessage = store.append(otherConversationId, "user", "Foreign");

  assert.throws(() =>
    store.saveSummary({
      conversationId,
      summary: "- No cross-conversation coverage.",
      coveredThroughMessageId: foreignMessage.id,
      updatedAt: new Date().toISOString(),
    }),
  );
  assert.equal(store.getSummary(conversationId), null);
});

test("SQLite conversation store validates summary fields before persistence", (t) => {
  const store = new SqliteConversationStore(":memory:");
  t.after(() => store.close());
  const conversationId = store.create();
  const message = store.append(conversationId, "user", "Covered");
  const validSummary = {
    conversationId,
    summary: "- The incident remains open.",
    coveredThroughMessageId: message.id,
    updatedAt: new Date().toISOString(),
  };

  for (const invalidSummary of [
    { ...validSummary, conversationId: " " },
    { ...validSummary, summary: "  " },
    { ...validSummary, coveredThroughMessageId: " " },
    { ...validSummary, updatedAt: "not-a-datetime" },
  ]) {
    assert.throws(() => store.saveSummary(invalidSummary));
  }
  assert.equal(store.getSummary(conversationId), null);
});

test("SQLite conversation store returns the latest 12 messages in chronological order", (t) => {
  const store = new SqliteConversationStore(":memory:");
  t.after(() => store.close());
  const conversationId = store.create();

  for (let index = 1; index <= 15; index += 1) {
    store.append(
      conversationId,
      index % 2 === 0 ? "assistant" : "user",
      `message-${index}`,
    );
  }

  assert.deepEqual(
    store.lastMessages(conversationId, 12).map(({ content }) => content),
    [
      "message-4",
      "message-5",
      "message-6",
      "message-7",
      "message-8",
      "message-9",
      "message-10",
      "message-11",
      "message-12",
      "message-13",
      "message-14",
      "message-15",
    ],
  );

  const exactConversationId = store.create();
  for (let index = 1; index <= 12; index += 1) {
    store.append(exactConversationId, "user", `exact-${index}`);
  }
  assert.deepEqual(
    store.lastMessages(exactConversationId, 12).map(({ content }) => content),
    Array.from({ length: 12 }, (_value, index) => `exact-${index + 1}`),
  );
});

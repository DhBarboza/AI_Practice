import assert from "node:assert/strict";
import test from "node:test";
import { SqliteMemoryStore } from "../store/sqlite-memory-store.js";

test("semantic recall finds a fact without shared words using the local model", async (t) => {
  const store = new SqliteMemoryStore({ databasePath: ":memory:" });
  t.after(() => store.close());

  await store.remember("semantic-user", "Deployments happen on Tuesdays.");
  const memories = await store.recall(
    "semantic-user",
    "What weekday are releases scheduled for?",
  );

  assert.ok(
    memories.some(
      ({ fact }) => fact === "Deployments happen on Tuesdays.",
    ),
  );
});

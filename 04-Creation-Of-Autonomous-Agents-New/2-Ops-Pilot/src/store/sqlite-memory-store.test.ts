import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  MEMORY_EMBEDDING_DIMENSIONS,
  isDuplicateMemoryScore,
  type MemoryEmbedding,
} from "../memory/memory-store.js";
import {
  SqliteMemoryStore,
  decodeMemoryEmbedding,
  encodeMemoryEmbedding,
  initializeSqliteMemorySchema,
} from "./sqlite-memory-store.js";

function vector(first: number, second = 0): MemoryEmbedding {
  return [
    first,
    second,
    ...Array.from({ length: MEMORY_EMBEDDING_DIMENSIONS - 2 }, () => 0),
  ];
}

function makeStore(
  embeddings: ReadonlyMap<string, MemoryEmbedding>,
  database = new DatabaseSync(":memory:"),
): { database: DatabaseSync; store: SqliteMemoryStore } {
  const store = new SqliteMemoryStore({
    database,
    embed: async (text) => {
      const embedding = embeddings.get(text);
      if (!embedding) throw new Error(`Unexpected embedding request: ${text}`);
      return embedding;
    },
  });
  return { database, store };
}

test("memory schema is idempotent and embeddings round-trip as little-endian Float32", (t) => {
  const database = new DatabaseSync(":memory:");
  t.after(() => database.close());
  initializeSqliteMemorySchema(database);
  initializeSqliteMemorySchema(database);

  const original = vector(0.25, -0.75);
  const encoded = encodeMemoryEmbedding(original);
  assert.equal(encoded.byteLength, 1536);
  assert.deepEqual(decodeMemoryEmbedding(encoded), original);
  assert.equal(database.prepare("PRAGMA table_info(memories)").all().length, 5);
});

test("recall ranks user-scoped memories, applies the strict cutoff, and honors k", async (t) => {
  const embeddings = new Map<string, MemoryEmbedding>([
    ["query", vector(1)],
    ["highest", vector(0.8)],
    ["middle", vector(0.5)],
    ["eligible-low", vector(0.31)],
    ["below-cutoff", vector(0.29)],
    ["other-user-fact", vector(0.9)],
  ]);
  const { database, store } = makeStore(embeddings);
  t.after(() => store.close());

  for (const fact of ["highest", "middle", "eligible-low", "below-cutoff"]) {
    await store.remember("user-a", fact);
  }
  await store.remember("user-b", "other-user-fact");

  assert.deepEqual(
    (await store.recall("user-a", "query")).map(({ fact }) => fact),
    ["highest", "middle", "eligible-low"],
  );
  assert.deepEqual(
    (await store.recall("user-a", "query", 2)).map(({ fact }) => fact),
    ["highest", "middle"],
  );
  assert.deepEqual(
    (await store.recall("user-b", "query")).map(({ fact }) => fact),
    ["other-user-fact"],
  );
  await assert.rejects(store.recall("user-a", "query", 4));
});

test("remember validates, trims, persists vectors, and deduplicates per user", async (t) => {
  assert.equal(isDuplicateMemoryScore(0.92), false);
  assert.equal(isDuplicateMemoryScore(0.9201), true);

  const embeddings = new Map<string, MemoryEmbedding>([
    ["Tuesday", vector(1)],
    ["Similar Tuesday", vector(0.93)],
  ]);
  const { database, store } = makeStore(embeddings);
  t.after(() => store.close());

  await store.remember(" user-a ", " Tuesday ");
  await store.remember("user-a", "Similar Tuesday");
  await store.remember("user-b", "Tuesday");

  const rows = database
    .prepare(
      `SELECT user_id AS userId, fact, typeof(embedding) AS embeddingType,
              length(embedding) AS embeddingLength, created_at AS createdAt
       FROM memories ORDER BY user_id`,
    )
    .all() as Array<{
    userId: string;
    fact: string;
    embeddingType: string;
    embeddingLength: number;
    createdAt: string;
  }>;
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map(({ userId, fact }) => ({ userId, fact })),
    [
      { userId: "user-a", fact: "Tuesday" },
      { userId: "user-b", fact: "Tuesday" },
    ],
  );
  assert.ok(rows.every((row) => row.embeddingType === "blob"));
  assert.ok(rows.every((row) => row.embeddingLength === 1536));
  assert.ok(rows.every((row) => Number.isFinite(Date.parse(row.createdAt))));
  await assert.rejects(store.remember(" ", "valid"));
  await assert.rejects(store.remember("user-a", " "));
});

test("forget removes an exact fact only for the requesting user", async (t) => {
  const embeddings = new Map<string, MemoryEmbedding>([
    ["alert preference", vector(1)],
  ]);
  const { database, store } = makeStore(embeddings);
  t.after(() => store.close());

  await store.remember("user-a", "alert preference");
  await store.remember("user-b", "alert preference");
  await store.forget("user-a", "alert preference");
  await store.forget("user-a", "missing fact");

  const remaining = database
    .prepare("SELECT user_id AS userId, fact FROM memories")
    .all() as Array<{ userId: string; fact: string }>;
  assert.deepEqual(
    remaining.map(({ userId, fact }) => ({ userId, fact })),
    [{ userId: "user-b", fact: "alert preference" }],
  );
  await assert.rejects(store.forget("", "alert preference"));
  await assert.rejects(store.forget("user-a", " "));
});

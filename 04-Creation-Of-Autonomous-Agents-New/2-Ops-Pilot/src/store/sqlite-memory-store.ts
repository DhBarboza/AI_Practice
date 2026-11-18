import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { StatementSync } from "node:sqlite";
import { z } from "zod";
import { embedText } from "../memory/embeddings.js";
import {
  MEMORY_EMBEDDING_BYTE_LENGTH,
  MemoryFactSchema,
  MemorySchema,
  MemoryEmbeddingSchema,
  MemoryUserIdSchema,
  RecallLimitSchema,
  dotProduct,
  isDuplicateMemoryScore,
  isRelevantMemoryScore,
} from "../memory/memory-store.js";
import type {
  Memory,
  MemoryEmbedder,
  MemoryEmbedding,
  MemoryStore,
} from "../memory/memory-store.js";
import { DEFAULT_OPSPILOT_DB_PATH } from "./sqlite-ops-store.js";

const MemoryRowSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    fact: z.string(),
    embedding: z.instanceof(Uint8Array),
    createdAt: z.string(),
  })
  .strict();

const MemoryBlobSchema = z.instanceof(Uint8Array).refine(
  (bytes) => bytes.byteLength === MEMORY_EMBEDDING_BYTE_LENGTH,
  `Memory embedding must contain ${MEMORY_EMBEDDING_BYTE_LENGTH} bytes.`,
);

export function initializeSqliteMemorySchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
      fact TEXT NOT NULL CHECK (length(trim(fact)) > 0),
      embedding BLOB NOT NULL
        CHECK (
          typeof(embedding) = 'blob'
          AND length(embedding) = ${MEMORY_EMBEDDING_BYTE_LENGTH}
        ),
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS memories_user_id_idx
      ON memories (user_id);
  `);
}

export function encodeMemoryEmbedding(
  embedding: MemoryEmbedding,
): Uint8Array {
  const vector = MemoryEmbeddingSchema.parse(embedding);
  const bytes = new Uint8Array(MEMORY_EMBEDDING_BYTE_LENGTH);
  const view = new DataView(bytes.buffer);

  for (let index = 0; index < vector.length; index += 1) {
    view.setFloat32(index * Float32Array.BYTES_PER_ELEMENT, vector[index], true);
  }

  return bytes;
}

export function decodeMemoryEmbedding(value: unknown): MemoryEmbedding {
  const bytes = MemoryBlobSchema.parse(value);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const embedding = Array.from(
    { length: MEMORY_EMBEDDING_BYTE_LENGTH / Float32Array.BYTES_PER_ELEMENT },
    (_value, index) =>
      view.getFloat32(index * Float32Array.BYTES_PER_ELEMENT, true),
  );
  return MemoryEmbeddingSchema.parse(embedding);
}

function parseMemoryRow(row: unknown): Memory {
  const parsed = MemoryRowSchema.parse(row);
  return MemorySchema.parse({
    id: parsed.id,
    userId: parsed.userId,
    fact: parsed.fact,
    embedding: decodeMemoryEmbedding(parsed.embedding),
    createdAt: parsed.createdAt,
  });
}

export interface SqliteMemoryStoreOptions {
  database?: DatabaseSync;
  databasePath?: string;
  embed?: MemoryEmbedder;
}

interface SqliteMemoryStatements {
  selectForUser: StatementSync;
  insert: StatementSync;
  deleteByFact: StatementSync;
}

export class SqliteMemoryStore implements MemoryStore {
  private readonly db: DatabaseSync;
  private readonly embed: MemoryEmbedder;
  private readonly statements: SqliteMemoryStatements;
  private closed = false;

  constructor(options: SqliteMemoryStoreOptions = {}) {
    this.embed = options.embed ?? embedText;

    if (options.database) {
      this.db = options.database;
    } else {
      const databasePath = z
        .string()
        .trim()
        .min(1)
        .parse(
          options.databasePath ??
            process.env.OPSPILOT_DB ??
            DEFAULT_OPSPILOT_DB_PATH,
        );
      if (databasePath !== ":memory:") {
        mkdirSync(dirname(resolve(databasePath)), { recursive: true });
      }
      this.db = new DatabaseSync(databasePath, {
        enableForeignKeyConstraints: true,
      });
    }

    try {
      initializeSqliteMemorySchema(this.db);
      this.statements = {
        selectForUser: this.db.prepare(
          `SELECT id, user_id AS userId, fact, embedding,
                  created_at AS createdAt
           FROM memories
           WHERE user_id = ?
           ORDER BY created_at, id`,
        ),
        insert: this.db.prepare(
          `INSERT INTO memories (id, user_id, fact, embedding, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        ),
        deleteByFact: this.db.prepare(
          "DELETE FROM memories WHERE user_id = ? AND fact = ?",
        ),
      };
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  close(): void {
    if (this.closed) return;
    this.db.close();
    this.closed = true;
  }

  async recall(userId: string, query: string, k = 3): Promise<Memory[]> {
    const parsedUserId = MemoryUserIdSchema.parse(userId);
    const parsedQuery = MemoryFactSchema.parse(query);
    const limit = RecallLimitSchema.parse(k);
    const queryEmbedding = await this.embed(parsedQuery);
    const memories = this.statements
      .selectForUser
      .all(parsedUserId)
      .map(parseMemoryRow);

    return memories
      .map((memory) => ({
        memory,
        score: dotProduct(queryEmbedding, memory.embedding),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .filter(({ score }) => isRelevantMemoryScore(score))
      .map(({ memory }) => memory);
  }

  async remember(userId: string, fact: string): Promise<void> {
    const parsedUserId = MemoryUserIdSchema.parse(userId);
    const parsedFact = MemoryFactSchema.parse(fact);
    const embedding = MemoryEmbeddingSchema.parse(await this.embed(parsedFact));
    const memories = this.statements
      .selectForUser
      .all(parsedUserId)
      .map(parseMemoryRow);

    if (
      memories.some(
        (memory) =>
          isDuplicateMemoryScore(dotProduct(embedding, memory.embedding)),
      )
    ) {
      return;
    }

    this.statements.insert.run(
      randomUUID(),
      parsedUserId,
      parsedFact,
      encodeMemoryEmbedding(embedding),
      new Date().toISOString(),
    );
  }

  async forget(userId: string, fact: string): Promise<boolean> {
    const parsedUserId = MemoryUserIdSchema.parse(userId);
    const parsedFact = MemoryFactSchema.parse(fact);
    const result = this.statements.deleteByFact.run(parsedUserId, parsedFact);
    return Number(result.changes) > 0;
  }
}

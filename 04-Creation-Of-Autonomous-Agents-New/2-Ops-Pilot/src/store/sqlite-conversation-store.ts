import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { StatementSync } from "node:sqlite";
import { z } from "zod";
import { DEFAULT_OPSPILOT_DB_PATH } from "./sqlite-ops-store.js";
import {
  AppendConversationMessageSchema,
  ConversationIdSchema,
  ConversationMessageSchema,
  ConversationRoleSchema,
  LastMessagesLimitSchema,
} from "./conversation-store.js";
import type {
  ConversationId,
  ConversationMessage,
  ConversationRole,
  ConversationStore,
} from "./conversation-store.js";

const ConversationMessageRowSchema = z
  .object({
    id: z.string(),
    conversationId: z.string(),
    role: z.string(),
    content: z.string(),
    createdAt: z.string(),
  })
  .strict();

export function initializeSqliteConversationSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS messages_conversation_id_idx
      ON messages (conversation_id);
  `);
}

function parseConversationMessage(row: unknown): ConversationMessage {
  const parsedRow = ConversationMessageRowSchema.parse(row);
  return ConversationMessageSchema.parse({
    ...parsedRow,
    role: ConversationRoleSchema.parse(parsedRow.role),
  });
}

export class SqliteConversationStore implements ConversationStore {
  private readonly db: DatabaseSync;
  private readonly insertMessage: StatementSync;
  private readonly selectLastMessages: StatementSync;
  private closed = false;

  constructor(path = process.env.OPSPILOT_DB ?? DEFAULT_OPSPILOT_DB_PATH) {
    const databasePath = z.string().trim().min(1).parse(path);
    if (databasePath !== ":memory:") {
      mkdirSync(dirname(resolve(databasePath)), { recursive: true });
    }

    this.db = new DatabaseSync(databasePath, {
      enableForeignKeyConstraints: true,
    });

    try {
      initializeSqliteConversationSchema(this.db);
    } catch (error) {
      this.db.close();
      throw error;
    }

    this.insertMessage = this.db.prepare(
      `INSERT INTO messages (id, conversation_id, role, content, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    this.selectLastMessages = this.db.prepare(
      `SELECT id, conversation_id AS conversationId, role, content,
              created_at AS createdAt
       FROM messages
       WHERE conversation_id = ?
       ORDER BY rowid DESC
       LIMIT ?`,
    );
  }

  create(): ConversationId {
    return ConversationIdSchema.parse(`conv-${randomUUID()}`);
  }

  append(
    conversationId: ConversationId,
    role: ConversationRole,
    content: string,
  ): ConversationMessage {
    const input = AppendConversationMessageSchema.parse({
      conversationId,
      role,
      content,
    });
    const message = ConversationMessageSchema.parse({
      id: randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    });
    this.insertMessage.run(
      message.id,
      message.conversationId,
      message.role,
      message.content,
      message.createdAt,
    );
    return message;
  }

  lastMessages(
    conversationId: ConversationId,
    limit: number,
  ): ConversationMessage[] {
    const id = ConversationIdSchema.parse(conversationId);
    const count = LastMessagesLimitSchema.parse(limit);
    return this.selectLastMessages
      .all(id, count)
      .map(parseConversationMessage)
      .reverse();
  }

  close(): void {
    if (this.closed) return;
    this.db.close();
    this.closed = true;
  }
}

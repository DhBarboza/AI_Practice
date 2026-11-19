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
  ConversationSummarySchema,
  LastMessagesLimitSchema,
} from "./conversation-store.js";
import type {
  ConversationId,
  ConversationMessage,
  ConversationRole,
  ConversationSummary,
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

const ConversationSummaryRowSchema = z
  .object({
    conversationId: z.string(),
    summary: z.string(),
    coveredThroughMessageId: z.string(),
    updatedAt: z.string(),
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

    CREATE UNIQUE INDEX IF NOT EXISTS messages_id_conversation_id_idx
      ON messages (id, conversation_id);

    CREATE TABLE IF NOT EXISTS conversation_summaries (
      conversation_id TEXT PRIMARY KEY NOT NULL,
      summary TEXT NOT NULL CHECK (length(trim(summary)) > 0),
      covered_through_message_id TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (covered_through_message_id, conversation_id)
        REFERENCES messages (id, conversation_id)
    );
  `);
}

function parseConversationMessage(row: unknown): ConversationMessage {
  const parsedRow = ConversationMessageRowSchema.parse(row);
  return ConversationMessageSchema.parse({
    ...parsedRow,
    role: ConversationRoleSchema.parse(parsedRow.role),
  });
}

function parseConversationSummary(row: unknown): ConversationSummary {
  return ConversationSummarySchema.parse(ConversationSummaryRowSchema.parse(row));
}

export class InvalidConversationCursorError extends Error {
  constructor() {
    super("Conversation cursor does not identify a message in this conversation.");
    this.name = "InvalidConversationCursorError";
  }
}

export class SqliteConversationStore implements ConversationStore {
  private readonly db: DatabaseSync;
  private readonly insertMessage: StatementSync;
  private readonly selectLastMessages: StatementSync;
  private readonly selectMessagesAfter: StatementSync;
  private readonly selectMessagesAfterCursor: StatementSync;
  private readonly selectMessageById: StatementSync;
  private readonly selectSummary: StatementSync;
  private readonly upsertSummary: StatementSync;
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
    this.selectMessagesAfter = this.db.prepare(
      `SELECT id, conversation_id AS conversationId, role, content,
              created_at AS createdAt
       FROM messages
       WHERE conversation_id = ?
       ORDER BY rowid ASC`,
    );
    this.selectMessagesAfterCursor = this.db.prepare(
      `SELECT id, conversation_id AS conversationId, role, content,
              created_at AS createdAt
       FROM messages
       WHERE conversation_id = ?
         AND rowid > (
           SELECT rowid FROM messages
           WHERE id = ? AND conversation_id = ?
         )
       ORDER BY rowid ASC`,
    );
    this.selectMessageById = this.db.prepare(
      `SELECT id FROM messages WHERE id = ? AND conversation_id = ?`,
    );
    this.selectSummary = this.db.prepare(
      `SELECT conversation_id AS conversationId, summary,
              covered_through_message_id AS coveredThroughMessageId,
              updated_at AS updatedAt
       FROM conversation_summaries
       WHERE conversation_id = ?`,
    );
    this.upsertSummary = this.db.prepare(
      `INSERT INTO conversation_summaries (
         conversation_id, summary, covered_through_message_id, updated_at
       ) VALUES (?, ?, ?, ?)
       ON CONFLICT (conversation_id) DO UPDATE SET
         summary = excluded.summary,
         covered_through_message_id = excluded.covered_through_message_id,
         updated_at = excluded.updated_at`,
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

  messagesAfter(
    conversationId: ConversationId,
    messageId?: string,
  ): ConversationMessage[] {
    const id = ConversationIdSchema.parse(conversationId);
    if (messageId === undefined) {
      return this.selectMessagesAfter.all(id).map(parseConversationMessage);
    }

    const cursor = z.string().trim().min(1).parse(messageId);
    if (!this.selectMessageById.get(cursor, id)) {
      throw new InvalidConversationCursorError();
    }
    return this.selectMessagesAfterCursor
      .all(id, cursor, id)
      .map(parseConversationMessage);
  }

  getSummary(conversationId: ConversationId): ConversationSummary | null {
    const id = ConversationIdSchema.parse(conversationId);
    const row = this.selectSummary.get(id);
    return row === undefined ? null : parseConversationSummary(row);
  }

  saveSummary(summary: ConversationSummary): void {
    const parsedSummary = ConversationSummarySchema.parse(summary);
    this.upsertSummary.run(
      parsedSummary.conversationId,
      parsedSummary.summary,
      parsedSummary.coveredThroughMessageId,
      parsedSummary.updatedAt,
    );
  }

  close(): void {
    if (this.closed) return;
    this.db.close();
    this.closed = true;
  }
}

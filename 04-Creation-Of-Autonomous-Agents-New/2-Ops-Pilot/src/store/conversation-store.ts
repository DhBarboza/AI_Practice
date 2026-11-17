import { z } from "zod";

export const ConversationIdSchema = z.string().trim().min(1);
export const ConversationRoleSchema = z.enum(["user", "assistant"]);

export const ConversationMessageSchema = z
  .object({
    id: z.string().min(1),
    conversationId: ConversationIdSchema,
    role: ConversationRoleSchema,
    content: z.string(),
    createdAt: z.string().datetime(),
  })
  .strict();

export const AppendConversationMessageSchema = z
  .object({
    conversationId: ConversationIdSchema,
    role: ConversationRoleSchema,
    content: z.string(),
  })
  .strict();

export const LastMessagesLimitSchema = z.number().int().positive().max(12);

export type ConversationId = z.infer<typeof ConversationIdSchema>;
export type ConversationRole = z.infer<typeof ConversationRoleSchema>;
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type AppendConversationMessage = z.infer<
  typeof AppendConversationMessageSchema
>;

export interface ConversationStore {
  create(): ConversationId;
  append(
    conversationId: ConversationId,
    role: ConversationRole,
    content: string,
  ): ConversationMessage;
  lastMessages(
    conversationId: ConversationId,
    limit: number,
  ): ConversationMessage[];
  close(): void;
}

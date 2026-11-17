import { z } from "zod";
import { ReasoningResultSchema } from "../agents/types.js";
import type { ReasoningResult, ReasoningStrategy } from "../agents/types.js";
import {
  ConversationIdSchema,
  ConversationMessageSchema,
} from "../store/conversation-store.js";
import type {
  ConversationId,
  ConversationMessage,
  ConversationStore,
} from "../store/conversation-store.js";

export const MAX_HISTORY_MESSAGES = 12;

const ChatStrategyInputSchema = z
  .object({
    message: z.string().trim().min(1),
    history: z.array(ConversationMessageSchema),
  })
  .strict();

export type ChatStrategyInput = z.infer<typeof ChatStrategyInputSchema>;

export interface ChatStrategy {
  run(input: ChatStrategyInput): Promise<ReasoningResult>;
}

export interface ChatInput {
  message: string;
  conversationId?: ConversationId;
  strategy: ChatStrategy;
}

const ChatResponseSchema = ReasoningResultSchema.extend({
  conversationId: ConversationIdSchema,
  metrics: ReasoningResultSchema.shape.metrics.extend({
    historyMessages: z.number().int().nonnegative().max(MAX_HISTORY_MESSAGES),
  }),
}).strict();

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export class UnknownConversationError extends Error {
  constructor(conversationId: string) {
    super(`Unknown conversation: ${conversationId}`);
    this.name = "UnknownConversationError";
  }
}

function composePrompt(message: string, history: readonly ConversationMessage[]): string {
  if (history.length === 0) return message;
  const transcript = history.map(({ role, content }) =>
    `${role === "user" ? "User" : "Assistant"}: ${content}`,
  );
  return [
    "Conversation history:",
    ...transcript,
    "",
    `Current message: ${message}`,
  ].join("\n");
}

export function composeReasoningStrategy(
  strategy: ReasoningStrategy,
): ChatStrategy {
  return {
    async run({ message, history }): Promise<ReasoningResult> {
      const input = ChatStrategyInputSchema.parse({ message, history });
      return strategy.run({
        input: composePrompt(input.message, input.history),
        maxIterations: 8,
      });
    },
  };
}

export function createChatService(conversations: ConversationStore): {
  runChat(input: ChatInput): Promise<ChatResponse>;
} {
  return {
    async runChat(input): Promise<ChatResponse> {
      const isNewConversation = input.conversationId === undefined;
      const conversationId = isNewConversation
        ? conversations.create()
        : ConversationIdSchema.parse(input.conversationId);
      const history = conversations
        .lastMessages(conversationId, MAX_HISTORY_MESSAGES)
        .map((message) => ConversationMessageSchema.parse(message));

      if (!isNewConversation && history.length === 0) {
        throw new UnknownConversationError(conversationId);
      }

      conversations.append(conversationId, "user", input.message);
      const result = ReasoningResultSchema.parse(
        await input.strategy.run({ message: input.message, history }),
      );
      conversations.append(conversationId, "assistant", result.answer);

      return ChatResponseSchema.parse({
        ...result,
        conversationId,
        metrics: {
          ...result.metrics,
          historyMessages: history.length,
        },
      });
    },
  };
}

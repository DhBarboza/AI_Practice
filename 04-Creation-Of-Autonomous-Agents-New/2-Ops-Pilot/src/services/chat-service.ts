import { z } from "zod";
import { ReasoningResultSchema } from "../agents/types.js";
import type {
  ReasoningResult,
  ReasoningStrategy,
  TraceEvent,
} from "../agents/types.js";
import {
  aggregateContextMetrics,
  combineContextMetrics,
  estimateTokens,
} from "../context/tokens.js";
import type { ContextSourceTexts } from "../context/tokens.js";
import {
  ConversationSummarySchema,
  ConversationIdSchema,
  ConversationMessageSchema,
} from "../store/conversation-store.js";
import type {
  ConversationId,
  ConversationMessage,
  ConversationSummary,
  ConversationStore,
} from "../store/conversation-store.js";
import {
  MemoryUserIdSchema,
  MemoryFactSchema,
} from "../memory/memory-store.js";
import type { MemoryStore } from "../memory/memory-store.js";
import type { LearningReflector } from "../memory/learning-reflector.js";
import {
  ConversationSummaryResultSchema,
  createConversationSummarizer,
  formatConversationSummaryInput,
  SUMMARIZER_PROMPT,
} from "./conversation-summarizer.js";
import type {
  ConversationSummarizer,
  ConversationSummaryInput,
} from "./conversation-summarizer.js";

import {
  buildContext,
  loadContextBudgets,
  ScoredMemoryCandidateSchema,
} from "../context/context-builder.js";
import type {
  SectionBudget,
  ScoredMemoryCandidate,
} from "../context/context-builder.js";

export const SUMMARY_REFRESH_THRESHOLD = 8;
export const MAX_RECENT_HISTORY_MESSAGES = SUMMARY_REFRESH_THRESHOLD;
export const MAX_HISTORY_MESSAGES =
  MAX_RECENT_HISTORY_MESSAGES + SUMMARY_REFRESH_THRESHOLD - 1;

const ScoredMemoryInputSchema = z.union([
  ScoredMemoryCandidateSchema,
  MemoryFactSchema,
]);

const ChatStrategyInputSchema = z
  .object({
    userId: MemoryUserIdSchema,
    message: z.string().trim().min(1),
    summary: z.string().nullable(),
    history: z.array(ConversationMessageSchema),
    memories: z.array(ScoredMemoryInputSchema),
  })
  .strict();

export type ChatStrategyInput = z.infer<typeof ChatStrategyInputSchema>;

export interface ChatStrategy {
  run(input: ChatStrategyInput): Promise<ReasoningResult>;
}

export interface ChatInput {
  userId: string;
  message: string;
  conversationId?: ConversationId;
  strategy: ChatStrategy;
}

export interface ChatServiceOptions {
  learningReflector?: LearningReflector;
  onLearningError?: (category: string) => void;
  summarizer?: ConversationSummarizer;
}

export const ChatResponseSchema = ReasoningResultSchema.extend({
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

export interface ComposeReasoningStrategyOptions {
  budgets?: SectionBudget;
  env?: Record<string, string | undefined>;
}

export function composeReasoningStrategy(
  strategy: ReasoningStrategy,
  options: ComposeReasoningStrategyOptions = {},
): ChatStrategy {
  return {
    async run({
      userId,
      message,
      summary,
      history,
      memories,
    }): Promise<ReasoningResult> {
      const input = ChatStrategyInputSchema.parse({
        userId,
        message,
        summary,
        history,
        memories,
      });
      const scoredMemories: ScoredMemoryCandidate[] = input.memories.map(
        (item, index) =>
          typeof item === "string"
            ? { fact: item, score: input.memories.length - index }
            : item,
      );
      const budgets =
        options.budgets ??
        loadContextBudgets(options.env ?? process.env);
      const built = buildContext({
        agentInstructions: "",
        message: input.message,
        summary: input.summary,
        history: input.history,
        memories: scoredMemories,
        budgets,
      });
      const result = await strategy.run({
        input: built.prompt,
        maxIterations: 8,
        userId: input.userId,
        contextSources: built.contextSources,
      });
      return {
        ...result,
        retainedHistory: built.retainedHistory,
      } as ReasoningResult;
    },
  };
}

export function createChatService(
  conversations: ConversationStore,
  memoryStore: MemoryStore,
  options: ChatServiceOptions = {},
): {
  runChat(input: ChatInput): Promise<ChatResponse>;
} {
  const summarizer = options.summarizer ?? createConversationSummarizer();

  return {
    async runChat(input): Promise<ChatResponse> {
      const userId = MemoryUserIdSchema.parse(input.userId);
      const isNewConversation = input.conversationId === undefined;
      const conversationId = isNewConversation
        ? conversations.create()
        : ConversationIdSchema.parse(input.conversationId);
      const recentHistory = conversations
        .lastMessages(conversationId, MAX_RECENT_HISTORY_MESSAGES)
        .map((message) => ConversationMessageSchema.parse(message));
      const savedSummary = conversations.getSummary(conversationId);
      let summary: ConversationSummary | null = savedSummary
        ? ConversationSummarySchema.parse(savedSummary)
        : null;
      const recentIds = new Set(recentHistory.map(({ id }) => id));
      let pendingHistory = conversations
        .messagesAfter(conversationId, summary?.coveredThroughMessageId)
        .map((message) => ConversationMessageSchema.parse(message))
        .filter(({ id }) => !recentIds.has(id));
      let summarizeEvent: TraceEvent | undefined;
      let summaryMetrics:
        | ReturnType<typeof aggregateContextMetrics>
        | undefined;

      if (pendingHistory.length >= SUMMARY_REFRESH_THRESHOLD) {
        const summaryInput: ConversationSummaryInput = {
          previousSummary: summary?.summary ?? null,
          messages: pendingHistory,
        };
        const generated = ConversationSummaryResultSchema.parse(
          await summarizer.summarize(summaryInput),
        );
        const coveredMessage = pendingHistory[pendingHistory.length - 1];
        if (!coveredMessage) {
          throw new Error("Cannot persist an empty conversation summary batch.");
        }

        const updatedSummary = ConversationSummarySchema.parse({
          conversationId,
          summary: generated.summary,
          coveredThroughMessageId: coveredMessage.id,
          updatedAt: new Date().toISOString(),
        });
        conversations.saveSummary(updatedSummary);
        summary = updatedSummary;
        pendingHistory = [];
        summarizeEvent = {
          type: "summarize",
          messagesSummarized: summaryInput.messages.length,
          estimatedTokens: estimateTokens(generated.summary),
        };
        const summarySources: ContextSourceTexts = {
          currentMessage: "",
          conversationHistory: formatConversationSummaryInput(summaryInput),
          recalledMemories: "",
          agentInstructions: SUMMARIZER_PROMPT,
          operationalToolContext: "",
        };
        summaryMetrics = aggregateContextMetrics([
          {
            inputTokens: generated.inputTokens,
            sources: summarySources,
          },
        ]);
      }

      const history = [...pendingHistory, ...recentHistory];

      if (!isNewConversation && history.length === 0 && summary === null) {
        throw new UnknownConversationError(conversationId);
      }

      const memories = await memoryStore.recall(userId, input.message);
      const scoredMemories: ScoredMemoryCandidate[] = memories.map(
        (memory, index) => ({
          fact: typeof memory === "string" ? memory : memory.fact,
          score:
            "score" in memory && typeof memory.score === "number"
              ? memory.score
              : memories.length - index,
        }),
      );
      conversations.append(conversationId, "user", input.message);
      const rawResult = await input.strategy.run({
        userId,
        message: input.message,
        summary: summary?.summary ?? null,
        history,
        memories: scoredMemories,
      });
      const rawRetained =
        typeof rawResult === "object" &&
        rawResult !== null &&
        "retainedHistory" in rawResult &&
        Array.isArray(
          (rawResult as { retainedHistory?: unknown }).retainedHistory,
        )
          ? (rawResult as { retainedHistory: unknown[] }).retainedHistory
          : undefined;
      const { retainedHistory: _ignored, ...resultCandidate } =
        (rawResult ?? {}) as unknown as Record<string, unknown>;
      const result = ReasoningResultSchema.parse(resultCandidate);
      const retainedHistoryCount = rawRetained
        ? rawRetained.length
        : buildContext({
            agentInstructions: "",
            message: input.message,
            summary: summary?.summary ?? null,
            history,
            memories: scoredMemories,
          }).retainedHistory.length;

      conversations.append(conversationId, "assistant", result.answer);
      const combinedContextMetrics = summaryMetrics
        ? combineContextMetrics([summaryMetrics, result.metrics])
        : result.metrics;

      const response = ChatResponseSchema.parse({
        ...result,
        trace: summarizeEvent ? [summarizeEvent, ...result.trace] : result.trace,
        conversationId,
        metrics: {
          ...combinedContextMetrics,
          llmCalls: result.metrics.llmCalls + (summaryMetrics ? 1 : 0),
          latencyMs: result.metrics.latencyMs,
          historyMessages: retainedHistoryCount,
        },
      });

      const learningReflector = options.learningReflector;
      if (learningReflector) {
        void Promise.resolve()
          .then(() => learningReflector.learn(userId, input.message))
          .catch((error: unknown) => {
            const category =
              error instanceof z.ZodError ? "ValidationError" : "LearningError";
            if (options.onLearningError) {
              options.onLearningError(category);
            } else {
              console.error("Background learning failed", category);
            }
          });
      }

      return response;
    },
  };
}

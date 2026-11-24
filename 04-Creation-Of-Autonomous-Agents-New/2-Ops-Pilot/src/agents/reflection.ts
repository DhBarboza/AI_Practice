import { z } from "zod";
import { AIMessage } from "@langchain/core/messages";
import {
  aggregateContextMetrics,
  combineContextMetrics,
  UsageObservationSchema,
} from "../context/tokens.js";
import type {
  ContextSourceTexts,
  ContextMetrics,
  UsageObservation,
} from "../context/tokens.js";
import { createModel } from "./model.js";
import { contextSourcesForInput } from "./helpers.js";
import { ReasoningResultSchema } from "./types.js";
import type {
  ReasoningInput,
  ReasoningResult,
  ReasoningStrategy,
  TraceEvent,
} from "./types.js";

const CritiqueSchema = z
  .object({
    approved: z.boolean(),
    feedback: z.string().describe(
      "If rejected, explain specifically and actionably what should be corrected.",
    ),
  })
  .strict();

const ReflectionOptionsSchema = z
  .object({
    maxReflections: z.number().int().nonnegative().optional(),
    critic: z
      .custom<ReflectionCritic>((value) => typeof value === "function")
      .optional(),
  })
  .strict();

const CRITIC_PROMPT =
  "Evaluate the answer only against the original request and the observations in the trace. " +
  "Do not use assumptions or outside knowledge. Approve only when the answer is supported " +
  "by the observations and fulfills the request. If rejecting, give specific actionable feedback.";

export interface Critique {
  approved: boolean;
  feedback: string;
}

export type ReflectionUsageRecorder = (observation: UsageObservation) => void;

export type ReflectionCritic = (
  input: string,
  result: ReasoningResult,
  recordUsage: ReflectionUsageRecorder,
  contextSources: ContextSourceTexts,
) => Promise<Critique>;

export interface ReflectionOptions {
  maxReflections?: number;
  critic?: ReflectionCritic;
}

function observationsOf(trace: readonly TraceEvent[]): string {
  const observations = trace.filter((event) => event.type === "observation");
  return observations.length
    ? JSON.stringify(observations)
    : "No observations were recorded.";
}

function joinSourceText(...sources: string[]): string {
  return sources.filter((source) => source.length > 0).join("\n");
}

function createDefaultCritic(): ReflectionCritic {
  const criticModel = createModel().withStructuredOutput(CritiqueSchema, {
    includeRaw: true,
  });

  return async (input, result, recordUsage, contextSources) => {
    const observations = observationsOf(result.trace);
    const response = await criticModel.invoke([
      ["system", CRITIC_PROMPT],
      [
        "user",
        `Request: ${input}\n` +
          `Observations: ${observations}\n` +
          `Answer: ${result.answer}`,
      ],
    ]);
    recordUsage({
      inputTokens:
        response.raw instanceof AIMessage
          ? response.raw.usage_metadata?.input_tokens ?? null
          : null,
      sources: {
        currentMessage: contextSources.currentMessage,
        conversationHistory: contextSources.conversationHistory,
        recalledMemories: contextSources.recalledMemories,
        agentInstructions: [
          contextSources.agentInstructions,
          CRITIC_PROMPT,
          "Request:",
        ]
          .filter((source) => source.length > 0)
          .join("\n"),
        operationalToolContext: [
          contextSources.operationalToolContext,
          `Observations: ${observations}`,
          `Answer: ${result.answer}`,
        ]
          .filter((source) => source.length > 0)
          .join("\n"),
      },
    });
    return CritiqueSchema.parse(response.parsed);
  };
}

function feedbackInput(input: ReasoningInput, feedback: string): ReasoningInput {
  const contextSources = contextSourcesForInput(input);
  const feedbackContext =
    `Reflection feedback from the critic (address it while following the original request):\n${feedback}`;
  return {
    ...input,
    input: `${input.input}\n\n${feedbackContext}`,
    contextSources: {
      ...contextSources,
      operationalToolContext: [
        contextSources.operationalToolContext,
        feedbackContext,
      ]
        .filter((source) => source.length > 0)
        .join("\n"),
    },
  };
}

export function withReflection(
  strategy: ReasoningStrategy,
  opts: ReflectionOptions = {},
): ReasoningStrategy {
  const options = ReflectionOptionsSchema.parse(opts);
  const maxReflections = options.maxReflections ?? 2;
  let defaultCritic: ReflectionCritic | undefined;

  return {
    name: `reflect:${strategy.name}`,
    async run(input: ReasoningInput): Promise<ReasoningResult> {
      if (maxReflections === 0) {
        return strategy.run(input);
      }

      const startedAt = performance.now();
      const trace: TraceEvent[] = [];
      let llmCalls = 0;
      let reflections = 0;
      let currentInput = input;
      const contextMetrics: ContextMetrics[] = [];
      const contextSources = contextSourcesForInput(input);

      while (true) {
        const candidate = ReasoningResultSchema.parse(
          await strategy.run(currentInput),
        );
        contextMetrics.push({
          promptTokens: candidate.metrics.promptTokens,
          contextBreakdown: candidate.metrics.contextBreakdown,
        });
        trace.push(...candidate.trace);
        llmCalls += candidate.metrics.llmCalls;

        const critic =
          options.critic ?? (defaultCritic ??= createDefaultCritic());
        const criticResult = ReasoningResultSchema.parse({
          ...candidate,
          trace: [...trace],
        });
        const criticObservations: UsageObservation[] = [];
        const recordUsage: ReflectionUsageRecorder = (observation) => {
          criticObservations.push(UsageObservationSchema.parse(observation));
        };
        const critique = CritiqueSchema.parse(
          await critic(
            input.input,
            criticResult,
            recordUsage,
            contextSources,
          ),
        );
        if (criticObservations.length === 0) {
          const observations = observationsOf(criticResult.trace);
          criticObservations.push({
            inputTokens: null,
            sources: {
              ...contextSources,
              agentInstructions: joinSourceText(
                contextSources.agentInstructions,
                CRITIC_PROMPT,
                "Request:",
              ),
              operationalToolContext: joinSourceText(
                contextSources.operationalToolContext,
                `Observations: ${observations}`,
                `Answer: ${candidate.answer}`,
              ),
            },
          });
        }
        contextMetrics.push(aggregateContextMetrics(criticObservations));
        llmCalls += 1;
        trace.push({
          node: "reflect",
          type: "critique",
          content: `Approved: ${critique.approved}\nFeedback: ${critique.feedback}`,
        });

        if (critique.approved || reflections >= maxReflections) {
          return ReasoningResultSchema.parse({
            answer: candidate.answer,
            trace,
            metrics: {
              llmCalls,
              latencyMs: Math.max(0, performance.now() - startedAt),
              ...combineContextMetrics(contextMetrics),
            },
          });
        }

        reflections += 1;
        currentInput = feedbackInput(input, critique.feedback);
      }
    },
  };
}

import { z } from "zod";

export const ContextSourceTextsSchema = z
  .object({
    currentMessage: z.string(),
    conversationHistory: z.string(),
    recalledMemories: z.string(),
    agentInstructions: z.string(),
    operationalToolContext: z.string(),
  })
  .strict();

export type ContextSourceTexts = z.infer<typeof ContextSourceTextsSchema>;

const ContextBreakdownSourcesSchema = z
  .object({
    currentMessage: z.number().int().nonnegative(),
    conversationHistory: z.number().int().nonnegative(),
    recalledMemories: z.number().int().nonnegative(),
    agentInstructions: z.number().int().nonnegative(),
    operationalToolContext: z.number().int().nonnegative(),
  })
  .strict();

export const ContextBreakdownSchema = z
  .object({
    estimated: z.literal(true),
    total: z.number().int().nonnegative(),
    sources: ContextBreakdownSourcesSchema,
  })
  .strict()
  .superRefine((breakdown, context) => {
    const sourceTotal = Object.values(breakdown.sources).reduce(
      (total, count) => total + count,
      0,
    );
    if (breakdown.total !== sourceTotal) {
      context.addIssue({
        code: "custom",
        path: ["total"],
        message: "Total must equal the sum of source estimates.",
      });
    }
  });

export type ContextBreakdown = z.infer<typeof ContextBreakdownSchema>;

export const UsageObservationSchema = z
  .object({
    inputTokens: z.number().int().nonnegative().nullable(),
    sources: ContextSourceTextsSchema,
  })
  .strict();

export type UsageObservation = z.infer<typeof UsageObservationSchema>;

export const ContextMetricsSchema = z
  .object({
    promptTokens: z.number().int().nonnegative().nullable(),
    contextBreakdown: ContextBreakdownSchema,
  })
  .strict();

export type ContextMetrics = z.infer<typeof ContextMetricsSchema>;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function estimatedSourceTotal(
  observations: readonly UsageObservation[],
  source: keyof ContextSourceTexts,
): number {
  return observations.reduce(
    (total, observation) =>
      total + estimateTokens(observation.sources[source]),
    0,
  );
}

export function aggregateContextMetrics(
  observations: readonly UsageObservation[],
): ContextMetrics {
  const parsedObservations = observations.map((observation) =>
    UsageObservationSchema.parse(observation),
  );
  const sources: ContextBreakdown["sources"] = {
    currentMessage: estimatedSourceTotal(
      parsedObservations,
      "currentMessage",
    ),
    conversationHistory: estimatedSourceTotal(
      parsedObservations,
      "conversationHistory",
    ),
    recalledMemories: estimatedSourceTotal(
      parsedObservations,
      "recalledMemories",
    ),
    agentInstructions: estimatedSourceTotal(
      parsedObservations,
      "agentInstructions",
    ),
    operationalToolContext: estimatedSourceTotal(
      parsedObservations,
      "operationalToolContext",
    ),
  };
  const contextBreakdown = ContextBreakdownSchema.parse({
    estimated: true,
    total: Object.values(sources).reduce((total, count) => total + count, 0),
    sources,
  });
  const reportedTokenCounts = parsedObservations
    .map(({ inputTokens }) => inputTokens)
    .filter((inputTokens): inputTokens is number => inputTokens !== null);
  const promptTokens =
    parsedObservations.length > 0 &&
    reportedTokenCounts.length === parsedObservations.length
      ? reportedTokenCounts.reduce((total, inputTokens) => total + inputTokens, 0)
      : null;

  return ContextMetricsSchema.parse({ promptTokens, contextBreakdown });
}

export function emptyContextMetrics(): ContextMetrics {
  return aggregateContextMetrics([]);
}

export function combineContextMetrics(
  metrics: readonly ContextMetrics[],
): ContextMetrics {
  const parsedMetrics = metrics.map(({ promptTokens, contextBreakdown }) =>
    ContextMetricsSchema.parse({ promptTokens, contextBreakdown }),
  );
  const reportedTokenCounts = parsedMetrics
    .map((metric) => metric.promptTokens)
    .filter((inputTokens): inputTokens is number => inputTokens !== null);
  const promptTokens =
    parsedMetrics.length > 0 &&
    reportedTokenCounts.length === parsedMetrics.length
      ? reportedTokenCounts.reduce((total, inputTokens) => total + inputTokens, 0)
      : null;
  const sources: ContextBreakdown["sources"] = {
    currentMessage: 0,
    conversationHistory: 0,
    recalledMemories: 0,
    agentInstructions: 0,
    operationalToolContext: 0,
  };

  for (const { contextBreakdown } of parsedMetrics) {
    sources.currentMessage += contextBreakdown.sources.currentMessage;
    sources.conversationHistory += contextBreakdown.sources.conversationHistory;
    sources.recalledMemories += contextBreakdown.sources.recalledMemories;
    sources.agentInstructions += contextBreakdown.sources.agentInstructions;
    sources.operationalToolContext +=
      contextBreakdown.sources.operationalToolContext;
  }

  return ContextMetricsSchema.parse({
    promptTokens,
    contextBreakdown: {
      estimated: true,
      total: Object.values(sources).reduce((total, count) => total + count, 0),
      sources,
    },
  });
}

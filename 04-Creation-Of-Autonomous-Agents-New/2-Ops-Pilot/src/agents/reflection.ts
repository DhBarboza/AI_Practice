import { z } from "zod";
import { createModel } from "./model.js";
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

export type ReflectionCritic = (
  input: string,
  result: ReasoningResult,
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

function createDefaultCritic(): ReflectionCritic {
  const criticModel = createModel().withStructuredOutput(CritiqueSchema);

  return async (input, result) => {
    const critique = await criticModel.invoke([
      ["system", CRITIC_PROMPT],
      [
        "user",
        `Request: ${input}\n` +
          `Observations: ${observationsOf(result.trace)}\n` +
          `Answer: ${result.answer}`,
      ],
    ]);
    return CritiqueSchema.parse(critique);
  };
}

function feedbackInput(input: ReasoningInput, feedback: string): ReasoningInput {
  return {
    ...input,
    input:
      `${input.input}\n\n` +
      `Reflection feedback from the critic (address it while following the original request):\n${feedback}`,
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

      while (true) {
        const candidate = ReasoningResultSchema.parse(
          await strategy.run(currentInput),
        );
        trace.push(...candidate.trace);
        llmCalls += candidate.metrics.llmCalls;

        const critic =
          options.critic ?? (defaultCritic ??= createDefaultCritic());
        const criticResult = ReasoningResultSchema.parse({
          ...candidate,
          trace: [...trace],
        });
        const critique = CritiqueSchema.parse(
          await critic(input.input, criticResult),
        );
        llmCalls += 1;
        trace.push({
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
            },
          });
        }

        reflections += 1;
        currentInput = feedbackInput(input, critique.feedback);
      }
    },
  };
}

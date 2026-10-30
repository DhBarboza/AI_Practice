import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { createModel } from "./model.js";
import { MemoryOpsStore } from "./store.js";
import { createOpsTools } from "./tools.js";
import { assertValidReasoningInput, ReasoningResultSchema } from "./types.js";
import type {
  ReasoningInput,
  ReasoningResult,
  ReasoningStrategy,
  TraceEvent,
} from "./types.js";

const PlanStepSchema = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("list_alerts"),
    args: z.object({ status: z.enum(["firing", "resolved", "all"]).optional() }),
  }),
  z.object({
    tool: z.literal("open_incident"),
    args: z.object({
      title: z.string().trim().min(1),
      service: z.string().trim().min(1),
      severity: z.enum(["critical", "high", "medium", "low"]),
    }),
  }),
  z.object({
    tool: z.literal("resolve_incident"),
    args: z.object({ id: z.string().trim().min(1) }),
  }),
]);

const PlanSchema = z.object({
  steps: z.array(PlanStepSchema).max(8),
  answer: z.string().optional(),
});
const ReplanSchema = z.object({
  steps: z.array(PlanStepSchema).max(8),
  answer: z.string().optional(),
  critique: z.string().optional(),
});

type PlanStep = z.infer<typeof PlanStepSchema>;
type Plan = z.infer<typeof PlanSchema>;
type Replan = z.infer<typeof ReplanSchema>;

export interface PlanEngine {
  plan(prompt: string): Promise<Plan>;
  replan(prompt: string): Promise<Replan>;
  execute(step: PlanStep): Promise<unknown>;
}

interface PlanDependencies {
  createEngine(store: MemoryOpsStore): PlanEngine;
}

function stepLabel(step: PlanStep): string {
  return `${step.tool}(${JSON.stringify(step.args)})`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function observationText(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value) ?? String(value);
}

function createDefaultPlanEngine(store: MemoryOpsStore): PlanEngine {
  const model = createModel();
  const planner = model.withStructuredOutput(PlanSchema);
  const replanner = model.withStructuredOutput(ReplanSchema);
  const [listAlertsTool, openIncidentTool, resolveIncidentTool] =
    createOpsTools(store);

  return {
    async plan(prompt) {
      return PlanSchema.parse(await planner.invoke(prompt));
    },
    async replan(prompt) {
      return ReplanSchema.parse(await replanner.invoke(prompt));
    },
    async execute(step) {
      switch (step.tool) {
        case "list_alerts":
          return listAlertsTool.invoke(step.args);
        case "open_incident":
          return openIncidentTool.invoke(step.args);
        case "resolve_incident":
          return resolveIncidentTool.invoke(step.args);
      }
    },
  };
}

export function createPlanAndExecuteStrategy(
  dependencies: PlanDependencies = { createEngine: createDefaultPlanEngine },
): ReasoningStrategy {
  return {
    name: "plan-and-execute",
    async run(input: ReasoningInput): Promise<ReasoningResult> {
      assertValidReasoningInput(input);
      const startedAt = performance.now();
      const actionLimit = Math.min(input.maxIterations, 8);
      const store = new MemoryOpsStore();
      const engine = dependencies.createEngine(store);
      const PlanState = Annotation.Root({
        input: Annotation<string>(),
        remaining: Annotation<PlanStep[]>(),
        trace: Annotation<TraceEvent[]>(),
        llmCalls: Annotation<number>(),
        iterations: Annotation<number>(),
        maxIterations: Annotation<number>(),
        answer: Annotation<string>(),
        failures: Annotation<string[]>(),
      });

      const graph = new StateGraph(PlanState)
        .addNode("planner", async (state) => {
          const proposed = await engine.plan(
            `Create a safe, concise tool plan for the request. Return no more than 8 steps and include a final answer if no steps are needed.\n` +
              `Request: ${state.input}`,
          );
          const steps = proposed.steps.slice(0, state.maxIterations);
          const trace: TraceEvent[] = [...state.trace];
          let answer = "";

          if (steps.length) {
            trace.push({
              type: "plan",
              content: steps
                .map((step, index) => `${index + 1}. ${stepLabel(step)}`)
                .join("\n"),
            });
          } else {
            answer =
              proposed.answer?.trim() ||
              "No tool actions were needed to respond to the request.";
            trace.push({ type: "answer", content: answer });
          }

          return {
            remaining: steps,
            trace,
            answer,
            llmCalls: state.llmCalls + 1,
          };
        })
        .addNode("executor", async (state) => {
          const step = state.remaining[0];
          if (!step) throw new Error("Executor received an empty plan.");

          const action: TraceEvent = {
            type: "action",
            tool: step.tool,
            args: step.args,
          };
          let observation: TraceEvent;
          let failures = state.failures;

          try {
            const output = await engine.execute(step);
            observation = {
              type: "observation",
              tool: step.tool,
              content: observationText(output),
            };
          } catch (error) {
            const message = errorText(error);
            failures = [...failures, `${step.tool}: ${message}`];
            observation = {
              type: "observation",
              tool: step.tool,
              content: `Tool error: ${message}`,
            };
          }

          return {
            remaining: state.remaining.slice(1),
            trace: [...state.trace, action, observation],
            iterations: state.iterations + 1,
            failures,
          };
        })
        .addNode("replanner", async (state) => {
          const remainingCapacity = Math.max(
            0,
            state.maxIterations - state.iterations,
          );
          const reviewed = await engine.replan(
            `Review completed tool actions and update the remaining plan. Do not repeat completed actions. ` +
              `Return at most ${remainingCapacity} next steps. If no steps remain, include a final answer. ` +
              `If any observation contains a tool error, do not claim that action succeeded.\n` +
              `Original request: ${state.input}\n` +
              `Completed trace: ${JSON.stringify(state.trace)}\n` +
              `Previously remaining steps: ${state.remaining.map(stepLabel).join("; ") || "none"}`,
          );
          const steps = reviewed.steps.slice(0, remainingCapacity);
          const trace = [...state.trace];
          if (reviewed.critique?.trim()) {
            trace.push({ type: "critique", content: reviewed.critique });
          }
          if (steps.length) {
            trace.push({
              type: "plan",
              content: steps
                .map((step, index) => `${index + 1}. ${stepLabel(step)}`)
                .join("\n"),
            });
          }
          if (steps.length === 0) {
            const answer =
              reviewed.answer?.trim() ||
              `Stopped after completing ${state.iterations} tool action(s).`;
            const truthfulAnswer = state.failures.length
              ? `Some requested actions failed: ${state.failures.join("; ")}. ${answer}`
              : answer;
            trace.push({ type: "answer", content: truthfulAnswer });
            return {
              remaining: steps,
              answer: truthfulAnswer,
              trace,
              llmCalls: state.llmCalls + 1,
            };
          }
          return {
            remaining: steps,
            trace,
            llmCalls: state.llmCalls + 1,
          };
        })
        .addEdge(START, "planner")
        .addConditionalEdges(
          "planner",
          (state) => (state.remaining.length ? "executor" : END),
          { executor: "executor", [END]: END },
        )
        .addEdge("executor", "replanner")
        .addConditionalEdges(
          "replanner",
          (state) => (state.remaining.length ? "executor" : END),
          { executor: "executor", [END]: END },
        )
        .compile();

      const result = await graph.invoke(
        {
          input: input.input,
          remaining: [],
          trace: [],
          llmCalls: 0,
          iterations: 0,
          maxIterations: actionLimit,
          answer: "",
          failures: [],
        },
        { recursionLimit: 3 * actionLimit + 4 },
      );

      return ReasoningResultSchema.parse({
        answer: result.answer,
        trace: result.trace,
        metrics: {
          llmCalls: result.llmCalls,
          latencyMs: Math.max(0, performance.now() - startedAt),
        },
      });
    },
  };
}

export const planAndExecuteStrategy = createPlanAndExecuteStrategy();

export async function runPlanAndExecute(
  input: ReasoningInput,
): Promise<ReasoningResult> {
  return planAndExecuteStrategy.run(input);
}

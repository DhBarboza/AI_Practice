import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { createModel } from "./model.js";
import { MemoryOpsStore } from "./store.js";
import { createOpsTools } from "./tools.js";
import { assertValidReasoningInput } from "./types.js";
import type {
  ReasoningInput,
  ReasoningResult,
  ReasoningStrategy,
  TraceEvent,
} from "./types.js";

const PlanStepSchema = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("list_alerts"),
    args: z.object({ status: z.enum(["firing", "resolved"]).optional() }),
  }),
  z.object({
    tool: z.literal("open_incident"),
    args: z.object({
      title: z.string().min(1),
      service: z.string().min(1),
      severity: z.enum(["critical", "high", "medium", "low"]),
    }),
  }),
  z.object({
    tool: z.literal("resolve_incident"),
    args: z.object({ id: z.string().min(1) }),
  }),
]);

const PlanSchema = z.object({ steps: z.array(PlanStepSchema).max(8) });
const ReplanSchema = z.object({
  steps: z.array(PlanStepSchema).max(8),
  answer: z.string(),
  critique: z.string().optional(),
});

type PlanStep = z.infer<typeof PlanStepSchema>;

const PlanState = Annotation.Root({
  input: Annotation<string>(),
  remaining: Annotation<PlanStep[]>(),
  trace: Annotation<TraceEvent[]>(),
  llmCalls: Annotation<number>(),
  iterations: Annotation<number>(),
  maxIterations: Annotation<number>(),
  answer: Annotation<string>(),
});

function stepLabel(step: PlanStep): string {
  return `${step.tool}(${JSON.stringify(step.args)})`;
}

export const planAndExecuteStrategy: ReasoningStrategy = {
  name: "plan-and-execute",
  async run(input: ReasoningInput): Promise<ReasoningResult> {
    assertValidReasoningInput(input);
    const startedAt = performance.now();
    const actionLimit = Math.min(input.maxIterations, 8);
    const model = createModel();
    const [listAlertsTool, openIncidentTool, resolveIncidentTool] = createOpsTools(
      new MemoryOpsStore(),
    );

    const planner = model.withStructuredOutput(PlanSchema);
    const replanner = model.withStructuredOutput(ReplanSchema);

    const graph = new StateGraph(PlanState)
      .addNode("planner", async (state) => {
        const proposed = await planner.invoke(
          `Create a safe, concise tool plan for the request. Return no more than 8 steps;` +
            ` the caller allows at most ${state.maxIterations} tool actions.\n` +
            `Request: ${state.input}`,
        );
        const steps = proposed.steps.slice(0, state.maxIterations);
        const planText = steps.length
          ? steps.map((step, index) => `${index + 1}. ${stepLabel(step)}`).join("\n")
          : "No tool actions are required.";
        return {
          remaining: steps,
          trace: [...state.trace, { type: "plan" as const, content: planText }],
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
        let output: unknown;
        switch (step.tool) {
          case "list_alerts":
            output = await listAlertsTool.invoke(step.args);
            break;
          case "open_incident":
            output = await openIncidentTool.invoke(step.args);
            break;
          case "resolve_incident":
            output = await resolveIncidentTool.invoke(step.args);
            break;
        }
        const observation: TraceEvent = {
          type: "observation",
          tool: step.tool,
          content: typeof output === "string" ? output : JSON.stringify(output),
        };
        return {
          remaining: state.remaining.slice(1),
          trace: [...state.trace, action, observation],
          iterations: state.iterations + 1,
        };
      })
      .addNode("replanner", async (state) => {
        const remainingCapacity = Math.max(
          0,
          state.maxIterations - state.iterations,
        );
        const reviewed = await replanner.invoke(
          `Review the completed tool actions and update the remaining plan. Do not repeat completed actions. ` +
            `Return at most ${remainingCapacity} next steps. If no steps remain, return an empty steps list and a final answer. ` +
            `If steps remain, answer may be empty. Include a short critique when useful.\n` +
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
          if (!reviewed.answer.trim()) {
            throw new Error("Replanner returned no remaining steps and no answer.");
          }
          trace.push({ type: "answer", content: reviewed.answer });
        }
        return {
          remaining: steps,
          answer: steps.length ? "" : reviewed.answer,
          trace,
          llmCalls: state.llmCalls + 1,
        };
      })
      .addEdge(START, "planner")
      .addConditionalEdges(
        "planner",
        (state) => (state.remaining.length ? "executor" : "replanner"),
        { executor: "executor", replanner: "replanner" },
      )
      .addEdge("executor", "replanner")
      .addConditionalEdges(
        "replanner",
        (state) => (state.remaining.length ? "executor" : END),
        { executor: "executor", [END]: END },
      )
      .compile();

    const result = await graph.invoke({
      input: input.input,
      remaining: [],
      trace: [],
      llmCalls: 0,
      iterations: 0,
      maxIterations: actionLimit,
      answer: "",
    });

    return {
      answer: result.answer,
      trace: result.trace,
      metrics: {
        llmCalls: result.llmCalls,
        latencyMs: Math.round(performance.now() - startedAt),
      },
    };
  },
};

export async function runPlanAndExecute(
  input: ReasoningInput,
): Promise<ReasoningResult> {
  return planAndExecuteStrategy.run(input);
}

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import {
  aggregateContextMetrics,
  UsageObservationSchema,
} from "../context/tokens.js";
import type {
  ContextSourceTexts,
  UsageObservation,
} from "../context/tokens.js";
import { createModel } from "./model.js";
import { ProviderSchema } from "./provider-status.js";
import { MemoryOpsStore } from "./store.js";
import type { OpsStore } from "./store.js";
import {
  createForgetPreferenceTool,
  createOpsTools,
} from "./tools.js";
import type { ChatMemoryContext } from "./tools.js";
import type { MemoryStore } from "../memory/memory-store.js";
import { contextSourcesForInput } from "./helpers.js";
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
  }).strict(),
  z.object({
  tool: z.literal("list_incidents"),
  args: z.object({ status: z.enum(["open", "resolved", "all"]).optional() }),
  }).strict(),
  z.object({
    tool: z.literal("open_incident"),
    args: z.object({
      title: z.string().trim().min(1),
      service: z.string().trim().min(1),
      severity: z.enum(["critical", "high", "medium", "low"]),
    }).strict(),
  }).strict(),
  z.object({
    tool: z.literal("resolve_incident"),
    args: z.object({ id: z.string().trim().min(1) }),
  }).strict(),
  z.object({
    tool: z.literal("consultar_runbook"),
    args: z.object({ service: z.string().trim().min(1) }),
  }).strict(),
  z.object({
    tool: z.literal("check_provider_status"),
    args: z.object({ provider: ProviderSchema.optional() }),
  }).strict(),
  z.object({
    tool: z.literal("forget_preference"),
    args: z.object({ fact: z.string().trim().min(1) }).strict(),
  }).strict(),
]);

const PlanSchema = z
  .object({
    steps: z.array(z.string().trim().min(1)).max(8),
    answer: z.string().optional(),
  })
  .strict();

const ReplanSchema = z
  .object({
    decision: z.enum(["continue", "adjust", "finish"]),
    steps: z.array(z.string().trim().min(1)).max(8).optional(),
    answer: z.string().optional(),
    critique: z.string().optional(),
  })
  .strict();

const PLANNER_PROMPT =
  "Create a short, ordered plan with one action per step, using only these tools: " +
  "list_alerts(status?: firing|resolved|all) reads the seeded alerts; " +
  "list_incidents(status?: open|resolved|all) lists incidents and defaults to open; " +
  "open_incident(title, service, severity) creates an incident for a known service; " +
  "resolve_incident(id) resolves an existing incident; " +
  "consultar_runbook(service) reads the service's runbook; " +
  "check_provider_status(provider?: github|cloudflare) checks a public provider status page. " +
  "Return no more than 8 steps. If no tool is needed, return an empty steps array and a concise answer.";

const EXECUTOR_PROMPT =
  "Execute exactly one requested plan step using exactly one available operational tool. " +
  "Use the request and previous results as context. Do not invent tool results or call more than one tool.";

const REPLANNER_PROMPT =
  "Review the completed steps and their results. Decide whether to continue the remaining plan, " +
  "adjust it with a replacement plan, or finish with a truthful answer. Never repeat completed actions. " +
  "If an action failed, do not claim it succeeded.";

type PlanStep = z.infer<typeof PlanStepSchema>;
type Plan = z.infer<typeof PlanSchema>;
type Replan = z.infer<typeof ReplanSchema>;

interface ToolExecution {
  tool: PlanStep["tool"];
  args: PlanStep["args"];
  output: unknown;
}

interface ExecutionContext {
  input: string;
  done: readonly [string, string][];
}

export interface PlanEngine {
  plan(prompt: string): Promise<Plan>;
  replan(prompt: string, operationalToolContext?: string): Promise<Replan>;
  execute(step: string, context: ExecutionContext): Promise<ToolExecution>;
}

type UsageRecorder = (observation: UsageObservation) => void;

interface PlanDependencies {
  createEngine?(
    store: OpsStore,
    memoryContext: ChatMemoryContext | undefined,
    recordUsage: UsageRecorder,
    contextSources: ContextSourceTexts,
  ): PlanEngine;
  createStore?: () => OpsStore;
  memoryStore?: MemoryStore;
  enableReplanning?: boolean;
}

class ToolExecutionError extends Error {
  constructor(
    readonly tool: PlanStep["tool"],
    readonly args: PlanStep["args"],
    message: string,
  ) {
    super(message);
    this.name = "ToolExecutionError";
  }
}

function stepLabel(step: string): string {
  return step.trim();
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function observationText(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value) ?? String(value);
}

function joinSourceText(...sources: string[]): string {
  return sources.filter((source) => source.length > 0).join("\n");
}

function createDefaultPlanEngine(
  store: OpsStore,
  memoryContext: ChatMemoryContext | undefined,
  contextSources: ContextSourceTexts,
  recordUsage: UsageRecorder,
): PlanEngine {
  const model = createModel();
  const planner = model.withStructuredOutput(PlanSchema, { includeRaw: true });
  const replanner = model.withStructuredOutput(ReplanSchema, { includeRaw: true });
  const tools = createOpsTools(store);
  const [
    listAlertsTool,
    openIncidentTool,
    resolveIncidentTool,
    listIncidentsTool,
    consultarRunbookTool,
    checkProviderStatusTool,
  ] = tools;
  const forgetPreferenceTool = memoryContext
    ? createForgetPreferenceTool(memoryContext)
    : undefined;
  const executorTools = forgetPreferenceTool
    ? [...tools, forgetPreferenceTool]
    : [...tools];
  const executor = model.bindTools(executorTools);
  const plannerPrompt = memoryContext
    ? `${PLANNER_PROMPT} forget_preference(fact) removes one exact saved preference for the active user.`
    : PLANNER_PROMPT;
  const executorToolDescriptions = executorTools
    .map((tool) => `${tool.name}: ${tool.description}`)
    .join("\n");

  function recordModelUsage(
    message: unknown,
    agentInstructions: string,
    operationalToolContext = "",
  ): void {
    recordUsage({
      inputTokens:
        message instanceof AIMessage
          ? message.usage_metadata?.input_tokens ?? null
          : null,
      sources: {
        ...contextSources,
        agentInstructions: joinSourceText(
          contextSources.agentInstructions,
          agentInstructions,
        ),
        operationalToolContext: joinSourceText(
          contextSources.operationalToolContext,
          operationalToolContext,
        ),
      },
    });
  }

  return {
    async plan(prompt) {
      const response = await planner.invoke([
        new SystemMessage(plannerPrompt),
        new HumanMessage(prompt),
      ]);
      recordModelUsage(response.raw, plannerPrompt);
      return PlanSchema.parse(response.parsed);
    },
    async replan(prompt, operationalToolContext = "") {
      const response = await replanner.invoke([
        new SystemMessage(REPLANNER_PROMPT),
        new HumanMessage(prompt),
      ]);
      recordModelUsage(
        response.raw,
        REPLANNER_PROMPT,
        operationalToolContext,
      );
      return ReplanSchema.parse(response.parsed);
    },
    async execute(step, context) {
      const executionPrompt =
        `Request: ${context.input}\n` +
        `Plan step: ${step}\n` +
        `Completed steps and results: ${JSON.stringify(context.done)}`;
      const response = await executor.invoke([
        new SystemMessage(EXECUTOR_PROMPT),
        new HumanMessage(executionPrompt),
      ]);
      recordModelUsage(
        response,
        EXECUTOR_PROMPT,
        joinSourceText(
          executorToolDescriptions,
          `Plan step: ${step}`,
          `Completed steps and results: ${JSON.stringify(context.done)}`,
        ),
      );
      const toolCalls = response.tool_calls ?? [];
      if (toolCalls.length !== 1) {
        throw new Error(
          `Executor must request exactly one operational tool; received ${toolCalls.length}.`,
        );
      }

      const selectedStep = PlanStepSchema.parse({
        tool: toolCalls[0]?.name,
        args: toolCalls[0]?.args,
      });

      try {
        switch (selectedStep.tool) {
          case "list_alerts":
            return {
              tool: selectedStep.tool,
              args: selectedStep.args,
              output: await listAlertsTool.invoke(selectedStep.args),
            };
          case "open_incident":
            return {
              tool: selectedStep.tool,
              args: selectedStep.args,
              output: await openIncidentTool.invoke(selectedStep.args),
            };
          case "resolve_incident":
            return {
              tool: selectedStep.tool,
              args: selectedStep.args,
              output: await resolveIncidentTool.invoke(selectedStep.args),
            };
          case "list_incidents":
            return {
              tool: selectedStep.tool,
              args: selectedStep.args,
              output: await listIncidentsTool.invoke(selectedStep.args),
            };
          case "consultar_runbook":
            return {
              tool: selectedStep.tool,
              args: selectedStep.args,
              output: await consultarRunbookTool.invoke(selectedStep.args),
            };
          case "check_provider_status":
            return {
              tool: selectedStep.tool,
              args: selectedStep.args,
              output: await checkProviderStatusTool.invoke(selectedStep.args),
            };
          case "forget_preference":
            if (!forgetPreferenceTool) {
              throw new Error("forget_preference is unavailable without user context.");
            }
            return {
              tool: selectedStep.tool,
              args: selectedStep.args,
              output: await forgetPreferenceTool.invoke(selectedStep.args),
            };
        }
      } catch (error) {
        throw new ToolExecutionError(
          selectedStep.tool,
          selectedStep.args,
          errorText(error),
        );
      }
    },
  };
}

export function createPlanAndExecuteStrategy(
  dependencies: PlanDependencies = {},
): ReasoningStrategy {
  return {
    name: "plan-and-execute",
    async run(input: ReasoningInput): Promise<ReasoningResult> {
      assertValidReasoningInput(input);
      const startedAt = performance.now();
      const actionLimit = Math.min(input.maxIterations, 8);
      const store = dependencies.createStore?.() ?? new MemoryOpsStore();
      const memoryContext =
        input.userId && dependencies.memoryStore
          ? {
              memoryStore: dependencies.memoryStore,
              userId: input.userId,
            }
          : undefined;
      const contextSources = contextSourcesForInput(input);
      const usageObservations: UsageObservation[] = [];
      const recordUsage: UsageRecorder = (observation) => {
        usageObservations.push(UsageObservationSchema.parse(observation));
      };
      const engine =
        dependencies.createEngine?.(
          store,
          memoryContext,
          recordUsage,
          contextSources,
        ) ??
        createDefaultPlanEngine(
          store,
          memoryContext,
          contextSources,
          recordUsage,
        );
      const enableReplanning = dependencies.enableReplanning !== false;
      const PlanState = Annotation.Root({
        input: Annotation<string>(),
        plan: Annotation<string[]>(),
        done: Annotation<[string, string][]>({
          reducer: (existing, next) => existing.concat(next),
          default: () => [],
        }),
        trace: Annotation<TraceEvent[]>(),
        llmCalls: Annotation<number>(),
        iterations: Annotation<number>(),
        maxIterations: Annotation<number>(),
        answer: Annotation<string>(),
        failures: Annotation<string[]>(),
      });

      const graph = new StateGraph(PlanState)
        .addNode("planner", async (state) => {
          const proposed = await engine.plan(state.input);
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
            plan: steps,
            trace,
            answer,
            llmCalls: state.llmCalls + 1,
          };
        })
        .addNode("executor", async (state) => {
          const step = state.plan[0];
          if (step === undefined) throw new Error("Executor received an empty plan.");

          let tool = "plan_executor";
          let args: Record<string, unknown> = { step };
          let observation: string;
          let failures = state.failures;

          try {
            const execution = await engine.execute(step, {
              input: state.input,
              done: state.done,
            });
            tool = execution.tool;
            args = execution.args;
            observation = observationText(execution.output);
          } catch (error) {
            const message = errorText(error);
            if (error instanceof ToolExecutionError) {
              tool = error.tool;
              args = error.args;
            }
            observation = `Tool error: ${message}`;
            failures = [...failures, `${tool}: ${message}`];
          }

          const remainingPlan = state.plan.slice(1);
          const trace: TraceEvent[] = [
            ...state.trace,
            { type: "action", tool, args },
            { type: "observation", tool, content: observation },
          ];
          let answer = state.answer;
          if (!enableReplanning && remainingPlan.length === 0) {
            answer = failures.length > 0
              ? `Some requested actions failed: ${failures.join("; ")}. Completed ${state.iterations + 1} planned action(s).`
              : `Completed ${state.iterations + 1} planned action(s).`;
            trace.push({ type: "answer", content: answer });
          }
          return {
            plan: remainingPlan,
            done: [[step, observation] as [string, string]],
            trace,
            iterations: state.iterations + 1,
            failures,
            answer,
            llmCalls: state.llmCalls + 1,
          };
        })
        .addNode("replanner", async (state) => {
          const remainingCapacity = Math.max(
            0,
            state.maxIterations - state.iterations,
          );
          const operationalToolContext =
            `Completed steps and results: ${JSON.stringify(state.done)}\n` +
            `Remaining plan: ${state.plan.join("; ") || "none"}\n` +
            `Remaining action capacity: ${remainingCapacity}`;
          const reviewed = await engine.replan(
            `Original request: ${state.input}\n` +
              `${operationalToolContext}\n` +
              `Return decision=continue to keep the remaining plan, decision=adjust to replace it, ` +
              `or decision=finish to stop. If finishing, include a final answer.`,
            operationalToolContext,
          );
          const proposedSteps =
            reviewed.decision === "continue"
              ? state.plan
              : reviewed.decision === "adjust"
                ? (reviewed.steps ?? [])
                : [];
          const steps = proposedSteps.slice(0, remainingCapacity);
          const trace: TraceEvent[] = [...state.trace];

          if (reviewed.critique?.trim()) {
            trace.push({ type: "critique", content: reviewed.critique });
          }
          if (reviewed.decision === "adjust" && steps.length) {
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
              plan: steps,
              answer: truthfulAnswer,
              trace,
              llmCalls: state.llmCalls + 1,
            };
          }

          return {
            plan: steps,
            trace,
            llmCalls: state.llmCalls + 1,
          };
        })
        .addEdge(START, "planner")
        .addConditionalEdges(
          "planner",
          (state) => (state.plan.length ? "executor" : END),
          { executor: "executor", [END]: END },
        )
        .addConditionalEdges(
          "executor",
          (state) =>
            enableReplanning
              ? "replanner"
              : state.plan.length
                ? "executor"
                : END,
          { executor: "executor", replanner: "replanner", [END]: END },
        )
        .addConditionalEdges(
          "replanner",
          (state) => (state.plan.length ? "executor" : END),
          { executor: "executor", [END]: END },
        )
        .compile();

      const result = await graph.invoke(
        {
          input: input.input,
          plan: [],
          done: [],
          trace: [],
          llmCalls: 0,
          iterations: 0,
          maxIterations: actionLimit,
          answer: "",
          failures: [],
        },
        { recursionLimit: 3 * actionLimit + 4 },
      );
      const missingObservations = Math.max(
        0,
        result.llmCalls - usageObservations.length,
      );
      const allUsageObservations = [
        ...usageObservations,
        ...Array.from({ length: missingObservations }, (): UsageObservation => ({
          inputTokens: null,
          sources: contextSources,
        })),
      ];

      return ReasoningResultSchema.parse({
        answer: result.answer,
        trace: result.trace,
        metrics: {
          llmCalls: result.llmCalls,
          latencyMs: Math.max(0, performance.now() - startedAt),
          ...aggregateContextMetrics(allUsageObservations),
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

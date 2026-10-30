import assert from "node:assert/strict";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import test from "node:test";
import {
  createPlanAndExecuteStrategy,
  type PlanEngine,
} from "./plan-and-execute.js";
import { createReactStrategy } from "./react.js";
import { ReasoningResultSchema } from "./types.js";

test("ReAct strategy produces a typed trace and counts returned model messages", async () => {
  const strategy = createReactStrategy({
    runAgent: async () => [
      new AIMessage({
        content: "",
        tool_calls: [
          {
            name: "list_alerts",
            args: { status: "firing" },
            id: "call-1",
            type: "tool_call",
          },
        ],
      }),
      new ToolMessage({
        content: '[{"id":"alert-001"}]',
        tool_call_id: "call-1",
        name: "list_alerts",
      }),
      new AIMessage("One alert is firing."),
    ],
  });

  const result = await strategy.run({ input: "List firing alerts", maxIterations: 1 });
  assert.equal(result.answer, "One alert is firing.");
  assert.equal(result.metrics.llmCalls, 2);
  assert.equal(result.trace[1]?.type, "action");
  assert.deepEqual(
    result.trace[1]?.type === "action" ? result.trace[1].args : undefined,
    { status: "firing" },
  );
  assert.deepEqual(ReasoningResultSchema.parse(result), result);
});

test("ReAct strategy rejects invalid inputs before invoking its agent", async () => {
  let invoked = false;
  const strategy = createReactStrategy({
    runAgent: async () => {
      invoked = true;
      return [];
    },
  });

  await assert.rejects(
    strategy.run({ input: " ", maxIterations: 1 }),
  );
  assert.equal(invoked, false);
});

test("ReAct strategy refuses tool actions beyond maxIterations", async () => {
  const allowed: boolean[] = [];
  const strategy = createReactStrategy({
    runAgent: async (_input, _maxIterations, _store, allowToolCall) => {
      allowed.push(allowToolCall());
      allowed.push(allowToolCall());
      return [new AIMessage("Stopped at the action limit.")];
    },
  });

  await strategy.run({ input: "List alerts", maxIterations: 1 });
  assert.deepEqual(allowed, [true, false]);
});

test("Plan-and-Execute replans after each tool action and respects the action budget", async () => {
  const calls = { planned: 0, replanned: 0, executed: 0 };
  const engine: PlanEngine = {
    async plan() {
      calls.planned += 1;
      return {
        steps: [
          { tool: "list_alerts", args: { status: "firing" } },
          {
            tool: "open_incident",
            args: {
              title: "Checkout errors",
              service: "Checkout",
              severity: "critical",
            },
          },
        ],
      };
    },
    async execute() {
      calls.executed += 1;
      return '[{"id":"alert-001"}]';
    },
    async replan() {
      calls.replanned += 1;
      return { steps: [], answer: "There are firing alerts." };
    },
  };
  const strategy = createPlanAndExecuteStrategy({
    createEngine: () => engine,
  });

  const result = await strategy.run({ input: "Check and open incident", maxIterations: 1 });
  assert.equal(calls.planned, 1);
  assert.equal(calls.replanned, 1);
  assert.equal(calls.executed, 1);
  assert.equal(result.metrics.llmCalls, 2);
  assert.equal(result.trace.filter((event) => event.type === "action").length, 1);
  assert.equal(result.answer, "There are firing alerts.");
});

test("Plan-and-Execute never executes more than eight steps", async () => {
  let executed = 0;
  let replanned = 0;
  const engine: PlanEngine = {
    async plan() {
      return {
        steps: Array.from({ length: 10 }, () => ({
          tool: "list_alerts" as const,
          args: { status: "all" as const },
        })),
      };
    },
    async execute() {
      executed += 1;
      return "[]";
    },
    async replan() {
      replanned += 1;
      return {
        steps:
          replanned < 8
            ? [{ tool: "list_alerts" as const, args: { status: "all" as const } }]
            : [],
        answer: "Stopped at the action limit.",
      };
    },
  };
  const result = await createPlanAndExecuteStrategy({
    createEngine: () => engine,
  }).run({ input: "List alerts repeatedly", maxIterations: 20 });

  assert.equal(executed, 8);
  assert.equal(result.trace.filter((event) => event.type === "action").length, 8);
  assert.equal(result.metrics.llmCalls, 9);
  assert.equal(result.answer, "Stopped at the action limit.");
});

test("Plan-and-Execute returns directly when the planner has no steps", async () => {
  let replanned = false;
  let executed = false;
  const engine: PlanEngine = {
    async plan() {
      return { steps: [], answer: "No action is needed." };
    },
    async execute() {
      executed = true;
      return "";
    },
    async replan() {
      replanned = true;
      return { steps: [], answer: "" };
    },
  };
  const strategy = createPlanAndExecuteStrategy({
    createEngine: () => engine,
  });

  const result = await strategy.run({ input: "Say hello", maxIterations: 2 });
  assert.equal(result.answer, "No action is needed.");
  assert.equal(result.metrics.llmCalls, 1);
  assert.equal(replanned, false);
  assert.equal(executed, false);
});

test("Plan-and-Execute includes tool failures in observations and final answer", async () => {
  const engine: PlanEngine = {
    async plan() {
      return {
        steps: [{ tool: "resolve_incident", args: { id: "missing" } }],
      };
    },
    async execute() {
      throw new Error("Unknown incident: missing");
    },
    async replan() {
      return { steps: [], answer: "I could not resolve the incident." };
    },
  };
  const result = await createPlanAndExecuteStrategy({
    createEngine: () => engine,
  }).run({ input: "Resolve missing incident", maxIterations: 1 });

  assert.match(result.answer, /Some requested actions failed/);
  assert.ok(
    result.trace.some(
      (event) =>
        event.type === "observation" &&
        event.content.includes("Unknown incident: missing"),
    ),
  );
});

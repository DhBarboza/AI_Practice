# Data Model: Unified Production Graph

This document details the state schemas, event definitions, routing types, and state transitions for the Unified Production Graph (`src/agents/production-graph.ts`).

---

## 1. Graph State Schema (`ProductionGraphState`)

The state passed along the LangGraph execution channel is defined as an annotated root state.

```ts
import { Annotation } from "@langchain/langgraph";
import type { ConversationMessage, ConversationSummary } from "../store/conversation-store.js";
import type { ContextSourceTexts } from "../context/tokens.js";
import type { ReasoningResult, TraceEvent } from "./types.js";

export const ProductionGraphAnnotation = Annotation.Root({
  // Inputs
  userId: Annotation<string>(),
  conversationId: Annotation<string>(),
  message: Annotation<string>(),
  strategyOverride: Annotation<string | undefined>(),
  reflectOverride: Annotation<boolean | undefined>(),

  // Context node outputs
  context: Annotation<{
    prompt: string;
    contextSources: ContextSourceTexts;
    retainedHistory: ConversationMessage[];
    summary: ConversationSummary | null;
  }>(),

  // Router node outputs
  routing: Annotation<{
    route: "react" | "plan-and-execute" | "reflect";
    reason: string;
    override: boolean;
  }>(),

  // Strategy node outputs
  strategyResult: Annotation<ReasoningResult | null>(),

  // Unified trace accumulated across nodes
  trace: Annotation<TraceEvent[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => [],
  }),

  // Response metrics
  llmCalls: Annotation<number>({
    reducer: (curr, update) => curr + update,
    default: () => 0,
  }),
});
```

---

## 2. Router Entities

### RouteDecision

The structured output returned by the classification model:

| Field | Type | Description |
|---|---|---|
| `route` | `"react" \| "plan-and-execute" \| "reflect"` | Target reasoning strategy |
| `reason` | `string` | Explanation based on the prompt decision table |

**Zod Schema**:
```ts
export const RouteDecisionSchema = z.object({
  route: z.enum(["react", "plan-and-execute", "reflect"]),
  reason: z.string().trim().min(1),
}).strict();

export type RouteDecision = z.infer<typeof RouteDecisionSchema>;
```

---

## 3. Trace Event Schemas with `node` Field

All trace events must include the mandatory `node: string` attribute identifying the generating graph node.

```ts
export const BaseTraceEventSchema = z.object({
  node: z.string().trim().min(1),
});

export const ContentTraceEventSchema = BaseTraceEventSchema.extend({
  type: z.enum(["thought", "plan", "critique", "answer"]),
  content: z.string(),
}).strict();

export const ActionTraceEventSchema = BaseTraceEventSchema.extend({
  type: z.literal("action"),
  tool: z.string().min(1),
  args: z.record(z.string(), z.unknown()),
}).strict();

export const ObservationTraceEventSchema = BaseTraceEventSchema.extend({
  type: z.literal("observation"),
  tool: z.string().min(1),
  content: z.string(),
}).strict();

export const SummarizeTraceEventSchema = BaseTraceEventSchema.extend({
  type: z.literal("summarize"),
  messagesSummarized: z.number().int().positive(),
  estimatedTokens: z.number().int().nonnegative(),
}).strict();

export const RouteTraceEventSchema = BaseTraceEventSchema.extend({
  type: z.literal("route"),
  node: z.literal("router"),
  route: z.enum(["react", "plan-and-execute", "reflect"]),
  reason: z.string().trim().min(1),
  override: z.boolean().optional(),
}).strict();

export const TraceEventSchema = z.discriminatedUnion("type", [
  ContentTraceEventSchema,
  ActionTraceEventSchema,
  ObservationTraceEventSchema,
  SummarizeTraceEventSchema,
  RouteTraceEventSchema,
]);

export type TraceEvent = z.infer<typeof TraceEventSchema>;
```

---

## 4. Graph State Transitions

```
[START]
   │
   ▼
[context]  (buildContext, summarize older messages, recall memories)
   │
   ▼
[router]   (withStructuredOutput classification OR manual override)
   │
   ├─► route === "react" ────────────► [react]
   │                                     │
   ├─► route === "plan-and-execute" ─► [plan-and-execute]
   │                                     │
   └─► route === "reflect" ──────────► [reflect]
                                         │
   ┌─────────────────────────────────────┘
   ▼
[response] (persist message in store, compute metrics, background learn)
   │
   ▼
 [END]
```

### Transition Table

| Origin Node | Condition | Destination Node | Trace Additions |
|---|---|---|---|
| `START` | Unconditional | `context` | None |
| `context` | Context assembled | `router` | `summarize` event (if threshold reached) |
| `router` | `route === "react"` | `react` | `route` event (`node: "router"`) |
| `router` | `route === "plan-and-execute"` | `plan-and-execute` | `route` event (`node: "router"`) |
| `router` | `route === "reflect"` | `reflect` | `route` event (`node: "router"`) |
| `react` | Strategy completed | `response` | thoughts, actions, observations, answer (`node: "react"`) |
| `plan-and-execute` | Strategy completed | `response` | plans, actions, observations, critiques, answer (`node: "plan-and-execute"`) |
| `reflect` | Strategy completed | `response` | base trace + critiques (`node: "reflect"`) |
| `response` | Persistence completed | `END` | None |

# Implementation Plan: Unified Production Graph

**Branch**: `013-unified-graph` | **Date**: 2026-11-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-unified-graph/spec.md`

## Summary

Unify OpsPilot's execution flow into an explicit LangGraph StateGraph in `src/agents/production-graph.ts` featuring 6 nodes: `context`, `router`, the three strategies (`react`, `plan-and-execute`, and `reflect`), and `response`. The router uses `withStructuredOutput` (`route`, `reason`) grounded by an in-prompt decision table, with support for manual overrides from the HTTP `/chat` endpoint (where `strategy` becomes optional). Every event in the execution trace is stamped with its originating `node`, and a new typed `"route"` trace event records routing decisions and override flags.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 24 LTS, `strict: true`

**Primary Dependencies**: `@langchain/langgraph`, `@langchain/core`, Zod, Express

**Storage**: SQLite (`node:sqlite` / `DatabaseSync`) via existing stores (`conversationStore`, `memoryStore`, `opsStore`). No schema changes required.

**Testing**: `node:test` through `tsx`; deterministic unit and integration tests using mock models without network access; full suite verified with `npm test` and `npm run typecheck`.

**Target Platform**: Linux server / Node.js runtime

**Project Type**: Autonomous agent HTTP service with LangGraph execution workflows

**Performance Goals**: Dynamic routing adds at most 1 fast classifier LLM call when unrouted; manual strategy override incurs 0 additional LLM calls or latency overhead.

**Constraints**:
- Every trace event MUST include a non-empty `node` string.
- Router prompt MUST include an explicit decision table for the 3 strategies.
- `/chat` body `strategy` field MUST be optional; when provided, it acts as an override in the trace.
- Follow boundary security and validation with Zod across all graph inputs and outputs.

**Scale/Scope**: Unified graph replaces procedural chat execution paths; integrates context assembly, dynamic routing, three reasoning engines, conversation persistence, and trace attribution.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle or constraint | Status | Plan alignment |
|---|---|---|
| **Boundary Security** | PASS | All inputs, outputs, router decisions, and trace events validated using Zod at graph and HTTP edges. Secrets remain strictly in process env. |
| **Predictable Domain** | PASS | Graph nodes are modular, functional handlers with isolated side effects (persistence in `response` node, memory recall in `context` node). Domain failures model cleanly. |
| **Layered Architecture** | PASS | Graph topology lives in `src/agents/production-graph.ts`; HTTP server delegates to graph; stores remain behind established interfaces. |
| **Verifiable Quality** | PASS | Graph transitions, routing classifier, override flags, and trace node tagging covered by `node:test` without live model or network dependencies. |
| **SQLite Persistence** | PASS | Uses existing `SqliteConversationStore` and `SqliteMemoryStore` through domain interfaces; no database engines or schema alterations introduced. |
| **Secrets & Privacy** | PASS | No secrets in code, specifications, or tests. Models configured via factory. |

**Gate result**: PASS. All constitutional principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/013-unified-graph/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── unified-graph.md
└── checklists/
    └── requirements.md
```

### Source Code Layout

```text
src/
├── agents/
│   ├── types.ts                     # Add node to TraceEventSchema, add RouteTraceEventSchema & RouteDecisionSchema
│   ├── trace.ts                     # Update formatTrace for node and route events
│   ├── production-graph.ts          # NEW: Unified StateGraph with context, router, strategies, response nodes
│   ├── production-graph.test.ts     # NEW: Tests for graph execution, routing decision table, override, and node tracing
│   ├── react.ts                     # Ensure ReAct trace events include node: "react"
│   ├── plan-and-execute.ts          # Ensure Plan-and-Execute trace events include node: "plan-and-execute"
│   └── reflection.ts                # Ensure Reflection trace events include node: "reflect"
├── services/
│   └── chat-service.ts              # Adapt or integrate chat service with production graph execution
└── http/
    ├── server.ts                    # Make strategy optional in ChatRequestSchema, delegate to production graph
    └── server.test.ts               # Add tests for unrouted /chat and overridden /chat
```

**Structure Decision**: Place the unified graph in `src/agents/production-graph.ts` alongside existing agent definitions. Keep tests next to source files following project conventions.

## Design Decisions

1. **Graph State Design**: Use LangGraph `Annotation.Root` in `src/agents/production-graph.ts` tracking input, assembled context, routing choice, strategy output, accumulated trace events, and metrics.
2. **Router Classifier**: System prompt with decision table using `.withStructuredOutput(RouteDecisionSchema)`. If `strategyOverride` is provided, skip the model call and log `{ route: strategyOverride, override: true }`. If classification fails, fall back safely to `"react"`.
3. **Trace Node Attribution**: Update `TraceEventSchema` in `src/agents/types.ts` so that all variants require `node: string`. Helper functions in `react.ts`, `plan-and-execute.ts`, and `reflection.ts` ensure all generated events carry their node name.
4. **HTTP Server Integration**: Update `POST /chat` in `src/http/server.ts` to accept optional `strategy`. When omitted, invoke the production graph with dynamic routing; when specified, pass as `strategyOverride`.

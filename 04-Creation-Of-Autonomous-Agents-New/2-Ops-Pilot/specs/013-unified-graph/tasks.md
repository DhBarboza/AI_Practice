---

description: "Task list for unified production graph implementation"
---

# Tasks: Unified Production Graph

**Input**: Design documents from `/specs/013-unified-graph/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/unified-graph.md`, `quickstart.md`

**Tests**: Included because the specification explicitly mandates verifiable quality and deterministic tests (FR-013) and the constitution requires tests for every new logic path.

**Organization**: Tasks are grouped by user story after foundational schema and trace updates.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with another task in the same phase because it edits separate files and has no dependency on that task.
- **[Story]**: User-story label (`[US1]`, `[US2]`, `[US3]`) for tasks in user-story phases.
- Every task names the exact source or test path it changes and quotes relevant constraints.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project dependencies and environment.

- [ ] T001 Verify `@langchain/langgraph` dependency, TypeScript ESM configuration, and test runner in `package.json`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema and trace infrastructure required by all user stories.

**⚠️ CRITICAL**: Must complete before user story implementation can begin.

- [ ] T002 [P] Extend `TraceEventSchema` variants with `node: z.string().trim().min(1)`, add `RouteTraceEventSchema` (`type: "route"`, `node: z.literal("router")`, `route: z.enum(["react", "plan-and-execute", "reflect"])`, `reason: z.string().trim().min(1)`, `override: z.boolean().optional()`), and define `RouteDecisionSchema` (`route: z.enum(["react", "plan-and-execute", "reflect"])`, `reason: z.string().trim().min(1)`) in `src/agents/types.ts`.
- [ ] T003 [P] Update `formatTrace` to support the `"route"` event type and display the `node` attribute, updating existing trace test fixtures in `src/agents/trace.ts` and `src/agents/trace.test.ts`.
- [ ] T004 Update trace conversion in `src/agents/helpers.ts` (`toTrace`), `src/agents/react.ts`, `src/agents/plan-and-execute.ts`, and `src/agents/reflection.ts` so that every emitted event (`thought`, `action`, `observation`, `critique`, `summarize`, `answer`) carries its corresponding `node: string` name (`"react"`, `"plan-and-execute"`, `"reflect"`, `"context"`).

**Checkpoint**: Base schemas validate the `node` field and `"route"` events without runtime errors.

---

## Phase 3: User Story 1 - Dynamic Strategy Routing through Unified Graph (Priority: P1) 🎯 MVP

**Goal**: An on-call operator or client submits an operational request without specifying a strategy. The unified graph orchestrates context preparation, classifies the request using structured output (`route: "react" | "plan-and-execute" | "reflect"`, `reason: string`) and the prompt decision table, executes the designated strategy node, persists the conversation turn, and consolidates metrics.

**Independent Test**: Execute queries of varying complexity (direct alert check, multi-step incident procedure, critical verification task) without `strategy`. Verify that the router selects the expected route, emits a `"route"` event with `override: false`, executes the target strategy node, and produces a complete answer with node-attributed trace events.

### Tests for User Story 1

- [ ] T005 [P] [US1] Add failing unit and integration tests for `createProductionGraph` in `src/agents/production-graph.test.ts`: test dynamic routing across known operational prompt archetypes, verifying that direct queries route to `"react"`, multi-step procedures route to `"plan-and-execute"`, and high-stakes verification routes to `"reflect"`, with a `"route"` trace event (`node: "router"`, `override: false`).

### Implementation for User Story 1

- [ ] T006 [US1] Implement `ProductionGraphAnnotation` and the `context` node in `src/agents/production-graph.ts`: integrate `buildContext` from `src/context/context-builder.ts`, handle conversation history retrieval, trigger summarization when pending messages reach `SUMMARY_REFRESH_THRESHOLD`, and recall memories from `MemoryStore`.
- [ ] T007 [US1] Implement the `router` node in `src/agents/production-graph.ts`: use `createModel().withStructuredOutput(RouteDecisionSchema)` with the in-prompt decision table to classify requests into `route` (`"react"`, `"plan-and-execute"`, `"reflect"`) and `reason: string`, append `{ type: "route", node: "router", route, reason, override: false }` to the trace, and fall back safely to `"react"` on classifier error.
- [ ] T008 [US1] Implement the three strategy nodes (`reactNode`, `planAndExecuteNode`, `reflectNode`) and the `responseNode` in `src/agents/production-graph.ts`: strategy nodes execute their respective logic with prepared context and tag trace events with their node name; `responseNode` persists the assistant turn to `ConversationStore`, triggers `learningReflector.learn` in the background, aggregates metrics, and transitions to `END`.
- [ ] T009 [US1] Assemble and compile the full `StateGraph` in `src/agents/production-graph.ts` linking `START` -> `context` -> `router` -> conditional branch -> strategy nodes (`react`, `plan-and-execute`, `reflect`) -> `response` -> `END`, and verify all tests in `src/agents/production-graph.test.ts` pass.

**Checkpoint**: At this point, User Story 1 is functional: queries are dynamically classified and executed through the unified graph with complete trace node attribution.

---

## Phase 4: User Story 2 - Manual Strategy Override via /chat (Priority: P1)

**Goal**: An operator or automated test client optionally includes a `strategy` parameter in the `POST /chat` request. The unified graph honors the override by bypassing classifier model calls, executing the specified strategy node, and recording `override: true` in the trace.

**Independent Test**: Send POST `/chat` requests with `strategy: "react"`, `strategy: "plan-and-execute"`, and `strategy: "reflect"`. Verify that the specified strategy is executed and the trace includes `{ type: "route", node: "router", route: "<strategy>", override: true }`. Send POST `/chat` without `strategy`; verify automated routing executes.

### Tests for User Story 2

- [ ] T010 [P] [US2] Add failing HTTP integration tests in `src/http/server.test.ts` verifying that `POST /chat` accepts requests omitting `strategy`, executes dynamic routing, and when `strategy` is explicitly provided, skips classifier LLM calls and marks `override: true` on the `"route"` trace event while rejecting unknown strategies with HTTP 422.

### Implementation for User Story 2

- [ ] T011 [US2] Update `ChatRequestSchema` in `src/http/server.ts` to make `strategy` optional without defaulting to `"react"` (`strategy: z.enum(["react", "plan-and-execute", "reflect"]).optional()`), preserving validation of unknown strategies.
- [ ] T012 [US2] Connect `POST /chat` in `src/http/server.ts` to the unified production graph runner in `src/agents/production-graph.ts`, passing `strategyOverride` when provided and ensuring `routerNode` records `{ type: "route", node: "router", route: strategyOverride, reason: "Manual operator override requested via strategy parameter.", override: true }`.

**Checkpoint**: User Stories 1 and 2 both work: `/chat` supports dynamic routing when `strategy` is omitted and explicit override when `strategy` is supplied.

---

## Phase 5: User Story 3 - Transparent Trace Attribution & Auditability (Priority: P2)

**Goal**: Every event emitted into the trace across all execution paths is stamped with a non-empty `node: string` matching `"context"`, `"router"`, `"react"`, `"plan-and-execute"`, `"reflect"`, or `"response"`.

**Independent Test**: Inspect traces returned across multiple scenarios; assert that 100% of trace events satisfy `TraceEventSchema` and have a valid non-empty `node` property.

### Tests for User Story 3

- [ ] T013 [P] [US3] Add comprehensive trace audit assertions in `src/agents/production-graph.test.ts` and `src/http/server.test.ts` verifying that 100% of trace events contain a non-empty `node` string, that `"route"` events contain non-empty `reason` and boolean `override`, and that no event has `node === undefined`.

### Implementation for User Story 3

- [ ] T014 [US3] Verify and enforce that reflection critique events in `src/agents/reflection.ts` carry `node: "reflect"` and summarization trace events in `src/agents/production-graph.ts` carry `node: "context"`.

**Checkpoint**: Trace attribution is complete across all graph paths and auditable by external consumers.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: System integration, exports, and full validation.

- [ ] T015 [P] Export `createProductionGraph` and production graph types from `src/agents/index.ts`.
- [ ] T016 Validate the targeted scenarios described in `specs/013-unified-graph/quickstart.md`.
- [ ] T017 Run `npm run typecheck` and `npm test` across the full codebase to ensure zero type errors and zero test regressions.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories because `TraceEventSchema` and `RouteDecisionSchema` are required by the graph and tests.
- **User Story 1 (Phase 3)**: Depends on Phase 2 - Builds the core unified graph and dynamic router (MVP).
- **User Story 2 (Phase 4)**: Depends on Phase 3 - Integrates `/chat` HTTP endpoint with production graph and override handling.
- **User Story 3 (Phase 5)**: Depends on Phase 3 and Phase 4 - Hardens full trace node attribution and audit tests.
- **Polish (Phase 6)**: Depends on all user story phases being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Foundational prerequisites complete. No dependencies on US2 or US3.
- **User Story 2 (P1)**: Depends on US1 graph factory to wire `/chat`.
- **User Story 3 (P2)**: Validates trace attribution across US1 and US2 execution flows.

---

## Parallel Opportunities

- Tasks marked `[P]` in Phase 2 (`T002` and `T003`) can run in parallel.
- Test tasks `T005` (US1), `T010` (US2), and `T013` (US3) target separate test files and can be authored in parallel once Foundational phase is complete.
- Polish task `T015` can run in parallel with `T016`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational schemas and trace updates (`T002`, `T003`, `T004`)
3. Complete Phase 3: User Story 1 (`T005`, `T006`, `T007`, `T008`, `T009`)
4. **STOP and VALIDATE**: Run `node --import tsx --test src/agents/production-graph.test.ts` to confirm dynamic routing and execution work independently.

### Incremental Delivery

1. Foundation ready (`T001` - `T004`)
2. Add Unified Graph & Dynamic Routing (US1, MVP!) -> Test independently
3. Add `/chat` optional `strategy` & override (US2) -> Test independently
4. Complete trace node auditability (US3) -> Test independently
5. Run full typecheck and test suite (`npm run typecheck`, `npm test`)

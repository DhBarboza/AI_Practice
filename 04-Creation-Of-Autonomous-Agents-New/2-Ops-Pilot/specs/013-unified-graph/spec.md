# Feature Specification: Unified Production Graph

**Feature Branch**: `013-unified-graph`

**Created**: 2026-11-23

**Status**: Draft

**Input**: User description: "Grafo unificado:
- production-graph.ts: nós contexto, roteador, as 3 estratégias como nós e resposta.
- Roteador: withStructuredOutput (route, reason); tabela no prompt; evento "route" e campo `node` em todo evento de trace.
- /chat: strategy opcional (se vier, é override no trace)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dynamic Strategy Routing through Unified Graph (Priority: P1)

An on-call operator or client sends an operational request to OpsPilot without having to manually select a reasoning strategy. The unified graph orchestrates the end-to-end lifecycle: the context node prepares the prompt and memory; the router node analyzes the request and automatically classifies it into the best reasoning strategy using structured output guided by a decision table; the selected strategy node executes; and the response node persists the conversation history and compiles metrics. Every event recorded in the execution trace identifies the specific node that generated it.

**Why this priority**: Eliminates manual strategy selection for API clients, transitions OpsPilot from decoupled if/else pipelines to an observable state graph, and establishes an inspectable trace where every step is attributed to its originating node.

**Independent Test**: Submit requests of varying complexity (e.g. simple alert lookups, multi-step incident troubleshooting, and high-stakes operations requiring reflection) without specifying a strategy. Verify that the graph routes dynamically to each expected strategy, logs a typed `"route"` event, executes the chosen strategy node, and produces a complete answer with node-attributed trace events.

**Acceptance Scenarios**:

1. **Given** an operational chat request without an explicit `strategy`, **When** the unified graph executes, **Then** the `context` node prepares the budgeted prompt and recalls memories, the `router` node selects the appropriate strategy via structured output (`{ route, reason }`), the designated strategy node executes, the `response` node records conversation history, and a final answer is returned.
2. **Given** a direct operational query suitable for quick tool execution (such as listing alerts or querying service status), **When** evaluated by the `router` node, **Then** the router selects the `react` strategy node.
3. **Given** a complex, multi-action operational request (such as opening and correlating incidents across services), **When** evaluated by the `router` node, **Then** the router selects the `plan-and-execute` strategy node.
4. **Given** a high-criticality, ambiguous, or multi-stage incident resolution request requiring self-verification, **When** evaluated by the `router` node, **Then** the router selects the `reflect` strategy node.
5. **Given** any event emitted into the trace across the entire execution (including thoughts, plans, actions, observations, critiques, summaries, and routing decisions), **When** the trace is inspected, **Then** every event contains a non-empty `node` field identifying the graph node that generated it.

---

### User Story 2 - Manual Strategy Override via /chat (Priority: P1)

An operator or automated test client optionally includes a `strategy` parameter in the `/chat` request. When provided, the unified graph honors the operator's choice by bypassing automatic classifier routing or forcing the designated strategy node, while recording a `"route"` event in the trace marked as an override.

**Why this priority**: Guarantees backward compatibility with existing API consumers and allows diagnostic tools and automated benchmarks to force specific execution paths deterministically.

**Independent Test**: Send POST `/chat` requests containing `strategy: "react"`, `strategy: "plan-and-execute"`, and `strategy: "reflect"`. Verify that each request invokes the requested strategy node and the trace contains a `"route"` event with `override: true`.

**Acceptance Scenarios**:

1. **Given** a POST `/chat` request containing an explicit valid `strategy`, **When** processed by the unified graph, **Then** the specified strategy node executes regardless of the message content, and the trace contains a `"route"` event indicating the chosen route with `override: true`.
2. **Given** a POST `/chat` request omitting the `strategy` field, **When** processed by the unified graph, **Then** the `router` node dynamically determines the route based on message semantics, and the trace contains a `"route"` event with `override: false` (or omitted override flag) along with the classification `reason`.
3. **Given** a POST `/chat` request with an unsupported or unknown strategy name, **When** validated at the HTTP boundary, **Then** the request is rejected with HTTP 400/422 and actionable validation issues before entering the graph.

---

### User Story 3 - Transparent Trace Attribution & Auditability (Priority: P2)

An incident investigator or SRE reviews the execution trace of an OpsPilot session. The investigator can see the exact graph topology traversed, why the router made its routing decision, and which node produced every action, observation, critique, and answer.

**Why this priority**: Essential for operational transparency, prompt debugging, and forensic auditing of autonomous decisions during incident handling.

**Independent Test**: Inspect the trace returned by the graph across multiple queries. Confirm that each trace event adheres to the updated schema with the `node` field and that routing decisions include the rationale produced by the model.

**Acceptance Scenarios**:

1. **Given** a completed graph run, **When** the trace is formatted or inspected as JSON, **Then** every event contains a `node` field corresponding to `"context"`, `"router"`, `"react"`, `"plan-and-execute"`, `"reflect"`, or `"response"`.
2. **Given** the router classification step, **When** completed, **Then** a trace event of type `"route"` is added to the trace containing `node: "router"`, `route: "<strategy_name>"`, and `reason: "<explanation>"`.
3. **Given** a critique generated during reflection, **When** appended to the trace, **Then** its `node` field is labeled `"reflect"` (or the appropriate critique sub-node).

---

### Edge Cases

- **Model Failure during Routing**: If the routing model call fails or produces invalid JSON, the router node falls back safely to a default conservative strategy (e.g. `react` or controlled error) and logs an observation or error in the trace rather than crashing unhandled.
- **Ambiguous or Mixed User Requests**: When a request contains elements of both simple lookup and complex planning, the router decision table provides clear precedence rules so the classification is stable and predictable.
- **Iteration or Budget Limits Reached in Strategy Node**: If a strategy exhausts its iteration budget or fails on a tool invocation, the partial result and error observations transition cleanly to the `response` node, preserving all trace events with proper node attribution.
- **Empty or Whitespace-Only Request**: Rejected at the HTTP and input validation boundaries with Zod before graph compilation or invocation.
- **Persistence or Memory Failures**: If conversation appending or memory reflection encounters an error in the `response` node, domain error handling ensures the client receives a structured response or actionable failure without corrupting state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define a unified StateGraph in `src/agents/production-graph.ts` linking the following sequential and conditional nodes:
  - `context`: Prepares inputs, summary, recent history window, and recalled memories via the shared context builder.
  - `router`: Evaluates the prepared request and selects the execution strategy node.
  - Strategy nodes: Exactly three reasoning nodes representing `react`, `plan-and-execute`, and `reflect`.
  - `response`: Saves the assistant turn to the conversation store, triggers background learning if configured, and calculates aggregate metrics.
- **FR-002**: The `router` node MUST invoke the model using structured output (`withStructuredOutput`) enforcing a schema with:
  - `route`: enum of the three supported strategies (`"react"`, `"plan-and-execute"`, `"reflect"`).
  - `reason`: non-empty string explaining the classification justification based on the decision table.
- **FR-003**: The router prompt MUST include an explicit decision table defining routing criteria, including at minimum:
  - `react`: Direct operational actions, single-tool queries, alert listings, service status checks, or simple status updates.
  - `plan-and-execute`: Multi-step investigations, procedures involving multiple distinct services, sequenced workflows, or complex dependency resolution.
  - `reflect`: High-severity incident resolution, ambiguous multi-cause alerts, or critical operational tasks where verification against observations is necessary before committing answers.
- **FR-004**: The `router` node MUST emit a trace event of type `"route"` containing:
  - `type`: `"route"`
  - `node`: `"router"`
  - `route`: The chosen strategy name
  - `reason`: The explanation generated by the classifier
  - `override`: Boolean indicating whether the route was chosen by operator override (`true`) or model routing (`false`)
- **FR-005**: Every trace event in `TraceEventSchema` MUST include a mandatory `node` field (string) indicating the graph node responsible for the event.
- **FR-006**: The unified graph MUST conditionally branch from the `router` node to the selected strategy node based on the router decision or manual override.
- **FR-007**: All three strategy nodes MUST converge to the `response` node upon completing their execution.
- **FR-008**: The `response` node MUST append the assistant message to the conversation store, invoke background learning reflection asynchronously if enabled, and return a validated `ChatResponse` with combined context and latency metrics.
- **FR-009**: The HTTP endpoint `POST /chat` in `src/http/server.ts` MUST treat `strategy` as an optional field in `ChatRequestSchema`.
- **FR-010**: When `strategy` is omitted from `POST /chat`, the unified graph MUST execute automated classification via the `router` node.
- **FR-011**: When `strategy` is provided in `POST /chat`, the unified graph MUST override automated routing, execute the requested strategy node, and record `override: true` in the `"route"` trace event.
- **FR-012**: All inputs, outputs, and intermediate graph state structures MUST be validated using Zod schemas at application boundaries, satisfying the project constitution.
- **FR-013**: The implementation MUST include deterministic unit and integration tests using `node:test` and `tsx` covering routing logic, override handling, node trace tagging, and graph transitions without requiring live external network access.

### Key Entities *(include if feature involves data)*

- **ProductionGraphState**: The annotated state object passed through the unified LangGraph channels containing:
  - `userId`: string identifier of the user
  - `conversationId`: optional/resolved conversation ID
  - `message`: raw user message
  - `strategyOverride`: optional manual strategy requested by client
  - `context`: assembled prompt, history, summary, and scored memories
  - `routing`: object containing selected `route`, `reason`, and `override` flag
  - `strategyResult`: output produced by the executed strategy node (answer, strategy-specific trace, metrics)
  - `trace`: cumulative array of `TraceEvent` objects, each carrying a `node` attribute
  - `metrics`: accumulated LLM call counts, latency, and token breakdown
- **RouteDecision**: Structured output from the router classifier `{ route: "react" | "plan-and-execute" | "reflect", reason: string }`.
- **RouteTraceEvent**: Trace event `{ type: "route", node: string, route: string, reason: string, override?: boolean }`.
- **TraceEvent**: Discriminated union of trace events (`thought`, `action`, `observation`, `critique`, `summarize`, `route`), all extended with `node: string`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid `/chat` requests sent without a `strategy` parameter succeed and are dynamically classified and routed to one of the 3 strategies.
- **SC-002**: 100% of trace events emitted during a graph execution contain a non-empty `node` field identifying the active graph node.
- **SC-003**: In 100% of test runs with an explicit `strategy` override, the graph invokes the overridden strategy and records `override: true` on the `"route"` trace event.
- **SC-004**: Automated test scenarios for the router decision table achieve deterministic classification matching the expected strategy for known operational prompt archetypes.
- **SC-005**: All test suites pass via `npm test` and type verification completes with zero errors under `npm run typecheck`.

## Assumptions

- The three target strategies correspond to the existing OpsPilot reasoning implementations: `react`, `plan-and-execute`, and `reflect` (wrapping one of the reasoning cores).
- The LangGraph framework (`@langchain/langgraph`) is already a core project dependency and will be used to construct the StateGraph.
- If a client supplies `reflect: true` in `/chat` alongside a strategy name, it maps to the `reflect` strategy node or reflects the specified base strategy.
- Node identifiers in trace events use standard lowercase names: `"context"`, `"router"`, `"react"`, `"plan-and-execute"`, `"reflect"`, and `"response"`.
- The decision table in the router prompt provides clear guidelines for distinguishing between single-tool execution (`react`), multi-action planning (`plan-and-execute`), and critical/ambiguous verification (`reflect`).
- All graph execution in unit/integration tests can be run with mock or seeded models to prevent non-deterministic network dependencies.

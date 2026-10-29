# Feature Specification: OpsPilot Reasoning Core

**Feature Branch**: `[001-reasoning-core]`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: Create OpsPilot reasoning strategies (ReAct and Plan-and-Execute), shared typed traces and metrics, OpenRouter model configuration, mock incident tools and seeded data, a strategy arena, and deterministic store/trace tests.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyze an operational request (Priority: P1)

An on-call operator submits a request about current service alerts and receives a useful answer supported by alert observations and incident actions.

**Why this priority**: This is the core operational value: help an operator understand and act on an incident using a consistent, inspectable reasoning run.

**Independent Test**: Run either reasoning strategy against the seeded alert data and verify it returns an answer, a typed trace, and call-count and latency metrics.

**Acceptance Scenarios**:

1. **Given** seeded services and alerts, **When** an operator asks which alerts are firing, **Then** the strategy can list firing alerts and return an answer with corresponding observations in its trace.
2. **Given** a request to create or resolve an incident, **When** the strategy invokes an incident tool, **Then** the trace records the tool name and arguments and the store reflects the action.
3. **Given** the request cannot be completed within the iteration limit, **When** the strategy stops, **Then** it returns the best available answer and trace without exceeding the configured limit.
4. **Given** valid OpenRouter configuration, **When** a reasoning strategy is created, **Then** it uses the configured model with temperature zero; missing configuration produces an explicit error that does not reveal the API key.
5. **Given** a reasoning run, **When** it finishes, **Then** its result contains the answer, all available typed events in order, and measured LLM-call count and elapsed time.
6. **Given** a Plan-and-Execute request, **When** the strategy processes it, **Then** it creates structured steps, executes one step at a time, replans after each execution, and stops when no work remains or its configured limit is reached.
7. **Given** malformed tool arguments or a tool failure, **When** a strategy attempts the operation, **Then** it surfaces the validation/domain failure and does not silently report success.

### User Story 2 - Compare reasoning strategies (Priority: P2)

An operator or developer runs one or more reasoning strategies against the same input to compare their outcomes, traces, and costs.

**Why this priority**: Comparable runs make it possible to evaluate and improve the reasoning approaches without changing the operator's request.

**Independent Test**: Run the arena with each supported strategy against one input and verify that each run prints its own answer, trace, and metrics.

**Acceptance Scenarios**:

1. **Given** one or more valid strategy names and an input, **When** the arena runs, **Then** every selected strategy receives the same input and its trace and metrics are printed.
2. **Given** a maximum-iteration setting, **When** the arena starts the strategies, **Then** every strategy honors that limit.
3. **Given** an unknown strategy name or invalid iteration limit, **When** the arena is invoked, **Then** it reports an actionable input error rather than silently selecting a different strategy.
4. **Given** Plan-and-Execute has more work than the supported ceiling, **When** it runs, **Then** it executes no more than eight steps.

### User Story 3 - Reproduce and verify tool behavior (Priority: P3)

A developer runs a deterministic seed and tests the alert/incident store and trace formatting without making network calls.

**Why this priority**: Reliable, repeatable mock data and offline tests let the team validate the domain behavior independently of an external model provider.

**Independent Test**: Run the seed command, then the store and trace-formatting tests with network access unavailable; verify the expected dataset and stable formatted output.

**Acceptance Scenarios**:

1. **Given** an empty mock store, **When** the seed script runs, **Then** it populates five services and six varied alerts, exactly three firing and three resolved.
2. **Given** the seed script has already run, **When** it runs again, **Then** it leaves the store in the same known seeded state without duplicating records.
3. **Given** valid or invalid store operations, **When** deterministic tests execute, **Then** they verify expected results and validation errors without an LLM or network request.
4. **Given** each supported trace event type, **When** a trace is formatted, **Then** its event type and relevant data are represented consistently, including tool and arguments for actions.

### Edge Cases

- The alert list may be empty for the requested status; the strategy still returns a clear answer and a valid trace.
- Tool arguments may be malformed or refer to an unknown alert, service, or incident; validation or a domain error must be surfaced, and the store must not be partially changed.
- A tool may fail during a strategy run; the failure is recorded as an observation or otherwise surfaced, and the strategy respects the iteration limit.
- The planner may return no steps; Plan-and-Execute must finish without invoking an executor.
- The replanner may remove all remaining work after an execution; the graph must terminate without an extra execution.
- The configured step/iteration limit may be reached while steps remain; the strategy must stop and return the partial result.
- OpenRouter configuration may be absent or invalid; initialization must report the missing or invalid setting without exposing the API key.
- No OpenRouter request is made by deterministic store and trace-formatting tests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every reasoning strategy MUST implement one shared contract that accepts a user input and returns an answer, an ordered trace of typed events, and metrics containing LLM-call count and elapsed latency in milliseconds.
- **FR-002**: The trace MUST support `thought`, `action`, `observation`, `plan`, `critique`, and `answer` events. Every `action` event MUST include the tool name and its arguments. Thought events MUST contain concise decision rationale rather than hidden, private chain-of-thought.
- **FR-003**: The system MUST provide one model factory for strategy model creation. It MUST read `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`, use OpenRouter as the provider endpoint, and set temperature to zero. Missing or invalid configuration MUST produce a clear error without revealing secret values.
- **FR-004**: The system MUST provide validated mock tools to list alerts by status, open an incident with a title, service, and severity, and resolve an incident by identifier.
- **FR-005**: The mock store MUST support five services and six varied alerts, with exactly three firing and three resolved alerts in its primary seed dataset.
- **FR-006**: The system MUST provide a deterministic, repeatable seed script that initializes the mock store with the primary dataset and can be run as the final seed-verification step.
- **FR-007**: Tool inputs and outputs at external or domain boundaries MUST be validated with Zod schemas. Invalid operations MUST produce an explicit validation or domain error and MUST NOT silently succeed.
- **FR-008**: The data model MUST represent services, alerts, and incidents and support MySQL persistence through Sequelize, while mock tool runs use the deterministic in-memory store.
- **FR-009**: The ReAct strategy MUST use the prebuilt LangGraph ReAct agent with the mock tools and capture the complete available structured run trace.
- **FR-010**: The Plan-and-Execute strategy MUST plan a structured list of steps, execute one step at a time using the available tools, and replan the remaining work after each executed step. It MUST terminate when no work remains.
- **FR-011**: Plan-and-Execute MUST execute no more than eight steps in one run. Every strategy MUST also honor the run's configured maximum iteration limit.
- **FR-012**: Every strategy MUST count all model invocations in `llmCalls` and report elapsed run time in `latencyMs`, including when execution stops at a configured limit.
- **FR-013**: The arena MUST accept one or more selected strategies and a maximum-iteration limit, run all selected strategies against the same input, and print each strategy's answer, trace, and metrics.
- **FR-014**: The arena MUST reject unknown strategies and invalid limits with an explicit error.
- **FR-015**: Store and trace-formatting tests MUST be deterministic and MUST run without network access or live LLM calls.
- **FR-016**: New logic MUST include automated tests and preserve the repository's type-check and test commands.

### Key Entities *(include if data involved)*

- **Service**: A monitored operational service with an identifier and descriptive attributes.
- **Alert**: A service signal with status and descriptive details; the seed dataset contains firing and resolved examples.
- **Incident**: An operational response record with an identifier, title, associated service, and severity/resolution state.
- **Reasoning run**: One strategy's processing of a user input, producing an answer, ordered trace, and metrics.
- **Trace event**: A typed record of a reasoning, plan, tool action, observation, critique, or final answer; action records include tool and arguments.
- **Plan step**: One structured unit of work that can be executed and reconsidered by Plan-and-Execute.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A seeded run contains exactly five services and six alerts, with a 3-to-3 split between firing and resolved.
- **SC-002**: Both strategies return the same required output shape: an answer, an ordered typed trace, and metrics with `llmCalls` and `latencyMs`.
- **SC-003**: A Plan-and-Execute run never executes more than eight steps, and no strategy exceeds its configured iteration limit.
- **SC-004**: The arena can run at least one selected strategy and clearly prints its answer, trace, and metrics for the shared input.
- **SC-005**: Store and trace-formatting tests pass without network access or live model calls.
- **SC-006**: Every tool action in a run's trace identifies the invoked tool and preserves its arguments.

## Assumptions

- The mock tools and arena use an in-memory store for deterministic runs; Sequelize/MySQL provides the required persistence model without making mock operations depend on a live database.
- The primary seed uses synthetic service and alert data; only the required counts and status distribution are fixed.
- `maxIterations` is a positive integer supplied to the strategy run; the arena provides a documented default when the flag is omitted. For Plan-and-Execute, the effective executed-step ceiling is the smaller of this limit and eight.
- A model provider may not expose private reasoning. The `thought` trace event therefore records concise rationale available to the application, not hidden chain-of-thought.
- The seed script is expected to run against the mock store's supported seed lifecycle; it must not require access to secrets or a live LLM.

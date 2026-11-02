# Feature Specification: Reflection Layer

**Feature Branch**: `002-reflection-layer`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Camada Reflection: withReflection(strategy, opts) decora qualquer ReasoningStrategy: executa a base; um crítico (mesmo modelo, saída estruturada { approved, feedback }) avalia a resposta contra as observações do trace; se reprovar, regenera com o feedback no contexto; para em approved ou maxReflections (default 2). Evento "critique" no trace; métricas somam as chamadas extras. Arena: reflect:react e reflect:plan-and-execute."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Refine a reasoning response (Priority: P1)

As an OpsPilot user, I want a reasoning strategy to review and improve its own response against the observations collected during execution, so that I can receive a response checked for consistency with the trace.

**Why this priority**: This is the core value of reflection and works independently of how users select the strategy.

**Independent Test**: Wrap a strategy whose first response is rejected and whose next response is approved. Verify the critique uses the trace observations and its feedback is available when generating the improved response.

**Acceptance Scenarios**:

1. **Given** a wrapped strategy and a response that satisfies the trace observations, **When** reflection runs, **Then** the critic uses the same model as the strategy, returns `approved` and `feedback`, approves the response, and no regeneration occurs.
2. **Given** a response that the critic rejects, **When** reflection runs, **Then** the next generation receives the critic's feedback as context.
3. **Given** a critic that approves after a regeneration, **When** reflection runs, **Then** the final response is the approved regenerated response.

### User Story 2 - Bound reflection work (Priority: P1)

As an OpsPilot user, I want reflection to stop when a response is approved or the configured number of reflections is reached, so that repeated revisions are bounded and the latest useful response is returned.

**Why this priority**: A bounded process is necessary for predictable completion and cost.

**Independent Test**: Exercise zero reflections, first-pass approval, and continuous rejection with controlled strategy and critic responses; verify the number of generations and the returned response.

**Acceptance Scenarios**:

1. **Given** `maxReflections` is zero, **When** the wrapped strategy runs, **Then** it behaves like the base strategy without invoking the critic.
2. **Given** the critic approves the initial response, **When** reflection runs, **Then** there is one base generation, one critique, and no regeneration.
3. **Given** every critique rejects the response, **When** reflection runs, **Then** processing stops at `maxReflections` and returns the last generated response.

### User Story 3 - Select reflection in the Arena (Priority: P2)

As an OpsPilot user, I want to run the reflective React and Plan-and-Execute strategies from the Arena, so that I can evaluate reflection through the existing strategy-selection workflow.

**Why this priority**: Arena support makes the feature discoverable and comparable, after the reflection behavior itself is available.

**Independent Test**: List Arena strategies and run each reflective strategy; verify both complete through the Arena workflow.

**Acceptance Scenarios**:

1. **Given** the Arena strategy list, **When** it is displayed, **Then** it includes `reflect:react` and `reflect:plan-and-execute`.
2. **Given** either reflective Arena strategy is selected, **When** it runs, **Then** it uses the corresponding base strategy with reflection enabled.

### Edge Cases

- With `maxReflections` set to zero, no critique event is produced and no extra model call is made.
- If approval occurs on the final allowed critique, the approved response is returned without another generation.
- If all allowed critiques reject, the most recently generated response is returned.
- Each critique, including a critique that leads to the final stop, is represented in the trace and included in call metrics.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow `withReflection(strategy, opts)` to add reflection to any supported reasoning strategy while preserving the base strategy's normal behavior when reflection is disabled.
- **FR-002**: The system MUST generate an initial response by executing the wrapped base strategy.
- **FR-003**: The system MUST evaluate each generated response against the observations in its execution trace using a critic that uses the same model as the wrapped strategy.
- **FR-004**: The critic MUST return a structured result containing `approved` and `feedback`.
- **FR-005**: When a critique rejects a response, the system MUST provide its feedback as context for the next generation.
- **FR-006**: The system MUST stop reflection when a critique approves the response or the configured maximum number of reflections is reached. The default maximum MUST be 2; a maximum of 0 MUST skip critiques and regenerations.
- **FR-007**: When the maximum is reached without approval, the system MUST return the latest generated response.
- **FR-008**: The system MUST add one `critique` event to the trace for every critic evaluation.
- **FR-009**: The system MUST include critic and regeneration model calls in the reported metrics, in addition to the base strategy's calls.
- **FR-010**: The Arena MUST offer and run `reflect:react` and `reflect:plan-and-execute`, each applying reflection to its corresponding base strategy.

### Key Entities

- **Reasoning response**: The output produced by a base or regenerated strategy and considered by the critic.
- **Trace observations**: Observations recorded during strategy execution and used as evidence in a critique.
- **Critique**: A structured approval decision and feedback for a generated response; each evaluation is recorded in the trace.
- **Reflection limit**: The configured maximum number of reflections, defaulting to 2, that bounds retries.
- **Call metrics**: The reported model-call totals, including calls made for critique and regeneration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With reflection disabled by setting the maximum to 0, the base strategy runs once, the critic and regeneration run zero times, and the base response is returned.
- **SC-002**: When the initial response is approved, exactly one base generation and one critique occur, with no regeneration.
- **SC-003**: When every critique rejects, the number of regenerations never exceeds `maxReflections`, and the last generated response is returned.
- **SC-004**: For any run, the number of `critique` trace events equals the number of critic evaluations.
- **SC-005**: Reported call metrics include every critic and regeneration call made during the run.
- **SC-006**: Both `reflect:react` and `reflect:plan-and-execute` are selectable and complete a run through the Arena.

## Assumptions

- The maximum reflection count is a non-negative integer and counts regenerations after the initial base response; therefore, the critic can evaluate the initial response and each regenerated response up to the configured limit.
- A rejected critique at the limit is recorded, but does not trigger another regeneration; this makes the final generated response the one returned after continuous rejection.
- The critic's structured approval and feedback are internal evaluation results; the user-facing result remains the latest generated reasoning response.
- The Arena's reflective options use the same reflection defaults as `withReflection` unless explicitly configured otherwise.

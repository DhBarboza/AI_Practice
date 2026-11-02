---

description: "Task list for Reflection Layer"

---

# Tasks: Reflection Layer

**Input**: Design documents from `/specs/002-reflection-layer/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: Tests are included because the project constitution requires offline `node:test` coverage for new logic.

**Organization**: Tasks are grouped by user story so the core reflection behavior, bounded retries, and Arena integration can be implemented and verified incrementally.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because tasks modify different files and have no unmet dependencies.
- **[Story]**: User-story label corresponding to the priority and numbering in `spec.md`.
- All tasks include concrete file paths.

## Path Conventions

This is the existing single TypeScript project. Runtime code and tests are under `src/`; design and validation documents are under `specs/002-reflection-layer/`.

## Phase 1: Setup

**Purpose**: The repository and TypeScript test tooling already exist; no setup or dependency changes are required.

No tasks.

---

## Phase 2: Foundational

**Purpose**: The shared `ReasoningStrategy` result and trace contracts already support typed `critique` events, so no additional blocking infrastructure is required.

No tasks.

**Checkpoint**: Implement and verify the core reflection decorator in User Story 1 before adding bounded edge behavior or Arena registrations.

---

## Phase 3: User Story 1 - Refine a reasoning response (Priority: P1) 🎯 MVP

**Goal**: Wrap any reasoning strategy, critique its candidate response against trace observations, and pass rejection feedback into a subsequent generation.

**Independent Test**: Using offline fake strategy and critic functions, verify that an approved initial response is returned after one critique, and a rejected response is regenerated with feedback and replaced by a later approved response. Verify observation context, trace events, and summed model-call counts.

### Tests for User Story 1

- [ ] T001 [US1] Add offline tests for approved-first-pass and reject-then-approve behavior, including answer/observation context, feedback in the next input, critique trace events, and summed calls in `src/agents/reflection.test.ts`; confirm the tests fail before implementation.

### Implementation for User Story 1

- [ ] T002 [US1] Implement `withReflection(strategy, opts?)` and the validated structured critic in `src/agents/reflection.ts`; use `createModel()` for the default critic, support an injected critic for deterministic tests/custom models, pass trace observations and the candidate answer to the critic, feed rejection feedback to the next strategy run, and return the approved candidate with combined trace and call metrics.

**Checkpoint**: User Story 1 is independently usable with the default reflection limit and deterministic injected dependencies.

---

## Phase 4: User Story 2 - Bound reflection work (Priority: P1)

**Goal**: Bound additional generations with `maxReflections`, default to two, skip critique when set to zero, and return the latest candidate if every critique rejects.

**Independent Test**: Using offline fakes, verify zero invokes only the base strategy; continuous rejection runs no more than the configured number of regenerations, records one critique per evaluation, and returns the last response; invalid limits are rejected.

### Tests for User Story 2

- [ ] T003 [US2] Add offline tests for `maxReflections: 0`, default and explicit limits, continuous rejection, last-response return, critique-event count, critic and regeneration metrics, and invalid option values in `src/agents/reflection.test.ts`; confirm the tests fail before implementation.

### Implementation for User Story 2

- [ ] T004 [US2] Enforce non-negative integer reflection limits and the default of two, bypass critic construction and invocation at zero, stop after the final allowed critique without another regeneration, append each critique in order, and report whole-run elapsed latency in `src/agents/reflection.ts`.

**Checkpoint**: User Stories 1 and 2 satisfy the full reflection and retry-boundary acceptance criteria.

---

## Phase 5: User Story 3 - Select reflection in the Arena (Priority: P2)

**Goal**: Make `reflect:react` and `reflect:plan-and-execute` selectable through the existing Arena registry and run each against its corresponding base strategy.

**Independent Test**: Use the default Arena registry to confirm both names parse as selectable strategies, then run each name through an injected registry and verify dispatch/output; no model network calls are needed.

### Tests for User Story 3

- [ ] T005 [P] [US3] Add Arena tests that verify both reflective names are available in default selection and that explicitly selected reflective registry entries dispatch through `runArena` in `src/arena.test.ts`; use deterministic strategies and confirm tests fail before registration.

### Implementation for User Story 3

- [ ] T006 [US3] Register `reflect:react` as `withReflection(reactStrategy)` and `reflect:plan-and-execute` as `withReflection(planAndExecuteStrategy)` in the default strategy registry in `src/arena.ts`.
- [ ] T007 [P] [US3] Update the usage example and expected Arena output for reflective strategy names in `specs/002-reflection-layer/contracts/arena-cli.md` and `specs/002-reflection-layer/quickstart.md`.

**Checkpoint**: Both reflective strategies are listed and runnable through the existing Arena workflow.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the complete feature and preserve repository-wide checks.

- [ ] T008 Run `npm test` and `npm run typecheck` from the repository root using the scripts in `package.json`; resolve any regressions in the touched `src/agents/` and `src/arena.ts` files.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; no project setup work is needed.
- **Foundational (Phase 2)**: Depends on Setup; existing shared contracts already provide the required trace event shape.
- **User Story 1 (Phase 3)**: Depends on the existing shared strategy contract; no other feature story is required.
- **User Story 2 (Phase 4)**: Depends on User Story 1's decorator API and core critique loop.
- **User Story 3 (Phase 5)**: Depends on User Story 1's decorator API; may proceed in parallel with User Story 2 after User Story 1 is complete.
- **Polish (Phase 6)**: Depends on the desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: No feature-story dependencies; MVP.
- **US2 (P1)**: Requires the wrapper implemented by US1; completes exact retry-limit and zero-reflection behavior.
- **US3 (P2)**: Requires the wrapper implemented by US1; independent of US2 and parallelizable with it after US1.

### Within Each User Story

- Tests are written first and should fail before implementation.
- User Story 1's test and implementation tasks are sequential because the implementation completes the tested API.
- User Story 2's boundary tests and implementation are sequential and use the same reflection module/test file.
- In User Story 3, Arena tests and default registry implementation touch separate files and can proceed in parallel after User Story 1. Documentation updates touch separate design documents and can also proceed in parallel.

## Parallel Opportunities

### After User Story 1

```text
Stream A: T003 -> T004 (bounded behavior and its tests)
Stream B: T005 || T006 (Arena verification and strategy registration)
Stream C: T007 (Arena contract and quickstart documentation)
```

`T005` is marked parallel because it changes `src/arena.test.ts`, while `T006` changes `src/arena.ts`. Both require the `withReflection` API from T002. T007 changes documentation only.

## Implementation Strategy

### MVP First (User Story 1)

1. Complete T001 and T002.
2. Verify the decorator's first-pass approval and feedback-driven regeneration using injected fakes.
3. Stop for review/demo once a generated response is critiqued and an approved response is returned.

### Incremental Delivery

1. Deliver US1's generic critique and regeneration behavior.
2. Add US2's zero-limit and retry-bound guarantees.
3. Add US3's Arena names, execution path, and usage documentation.
4. Run the full configured test and type-check commands in T008.

### Parallel Team Strategy

After US1 is complete, separate contributors can work on US2's limit behavior, US3's Arena registration/tests, and the Arena documentation in parallel, respecting T003/T004 and T005/T006 dependencies.

## Notes

- `[P]` tasks operate on different files and have no unmet prerequisites.
- `[US1]`, `[US2]`, and `[US3]` map to the user stories in `spec.md`.
- No dependency installation or database changes are needed.

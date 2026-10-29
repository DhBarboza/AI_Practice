---
description: "Task list for OpsPilot Reasoning Core"
---

# Tasks: OpsPilot Reasoning Core

**Input**: Design documents from `/specs/001-reasoning-core/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are required by the specification and project constitution. Store and trace tests must run deterministically without network or live model calls.

**Organization**: Tasks are grouped by user story after shared setup and foundational prerequisites. Dependencies are explicit below.

## Phase 1: Setup

**Purpose**: Confirm the existing project commands and dependency surface used by the feature.

- [ ] T001 Verify the existing `arena`, `seed`, `test`, and `typecheck` scripts and LangChain, LangGraph, Zod, Sequelize, and mysql2 dependencies in `package.json`; make only feature-required corrections.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared domain contracts and deterministic tool/trace behavior required by all user stories.

- [ ] T002 Define Zod-validated service, alert, incident, reasoning input/result, metrics, and discriminated trace-event types, including concise thought rationale and action tool/args, in `src/agents/types.ts`.
- [ ] T003 [P] Write offline store tests in `src/agents/store.test.ts` for five services, six alerts with exactly three firing and three resolved, status filtering, incident creation/resolution, unknown references, and no partial mutation; include field constraints verbatim: Service `id` is "Required, stable primary identifier", `name` is "Required, unique, non-empty", `team` and `environment` are "Required, non-empty"; Alert `id` is "Required, stable primary identifier", `serviceId` is "Required, references a known service", `title` is "Required, non-empty", `severity` is `critical`, `warning`, or `info`, and `status` is `firing` or `resolved`; Incident `id` is "Required, unique primary identifier", `title` is "Required, non-empty", `serviceId` is "Required, references a known service", `severity` is `critical`, `high`, `medium`, or `low`, and `status` is `open` or `resolved`.
- [ ] T004 [P] Write deterministic trace-formatting tests in `src/agents/trace.test.ts` covering all six event types, event order, stable numbering, and action tool/argument formatting.
- [ ] T005 Create the stable, synthetic seed fixtures in `src/agents/seed-data.ts` with exactly five services and six varied alerts, split into three `firing` and three `resolved` records.
- [ ] T006 Implement the deterministic in-memory service, alert, and incident store in `src/agents/store.ts`; validate referenced services and incident IDs, return isolated records, and raise explicit errors without mutation on invalid operations.
- [ ] T007 Implement stable formatting for every typed trace event in `src/agents/trace.ts`, preserving event order and action arguments.
- [ ] T008 [P] Define Sequelize MySQL models and service associations in `src/agents/database.ts`; enforce Service `id` "Required, stable primary identifier", `name` "Required, unique, non-empty", `team` and `environment` "Required, non-empty"; Alert `id` "Required, stable primary identifier", `serviceId` "Required, references a known service", `title` "Required, non-empty", `severity` in `critical`, `warning`, or `info`, and `status` in `firing` or `resolved`; Incident `id` "Required, unique primary identifier", `title` "Required, non-empty", `serviceId` "Required, references a known service", `severity` in `critical`, `high`, `medium`, or `low`, and `status` in `open` or `resolved`.
- [ ] T009 Implement the Zod-validated `list_alerts`, `open_incident`, and `resolve_incident` tools over the in-memory store in `src/agents/tools.ts`; surface schema and domain errors explicitly.

**Checkpoint**: Shared contracts, seeded store, tool schemas, persistence models, and deterministic store/trace tests are ready for strategy and CLI work.

---

## Phase 3: User Story 1 - Analyze an operational request (Priority: P1) 🎯 MVP

**Goal**: A strategy can answer an operational request and return a typed trace and trustworthy execution metrics.

**Independent Test**: With valid model settings, run either strategy against the seeded store and verify an answer, ordered trace, action arguments, LLM-call count, and elapsed latency. With model/tool boundaries replaced by test doubles, verify action limits, plan termination, and configuration errors without making a network request.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add offline tests in `src/agents/strategies.test.ts` using fake model/tool boundaries to verify strategy result shape, actual model-call counts, iteration ceilings, one-step execution/replanning, empty-plan termination, and explicit failures.
- [ ] T011 [P] [US1] Add model-factory configuration tests in `src/agents/model.test.ts` verifying required OpenRouter settings, the configured model, OpenRouter base URL, temperature zero, and secret-free error messages without network access.

### Implementation for User Story 1

- [ ] T012 [US1] Implement the single OpenRouter `ChatOpenAI` factory in `src/agents/model.ts`, reading and validating `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`, setting the OpenRouter base URL and temperature zero, and never logging the API key.
- [ ] T013 [P] [US1] Implement the shared strategy contract with the prebuilt LangGraph ReAct agent in `src/agents/react.ts`; capture structured thought/action/observation/answer events, count model invocations, prevent more than `maxIterations` tool actions, and provide injectable model/tool factories for offline tests without changing `ReasoningStrategy.run(input)`.
- [ ] T014 [P] [US1] Implement the Plan-and-Execute LangGraph in `src/agents/plan-and-execute.ts` with Zod-structured planning, one tool action per executor step, replanning after each observation, termination on no remaining work, a maximum of eight actions or `maxIterations` (whichever is lower), complete call/latency metrics, and injectable model/tool factories for offline tests without changing `ReasoningStrategy.run(input)`.

**Checkpoint**: Either strategy can be independently exercised against the seeded tools and emits the common answer, trace, and metrics shape.

---

## Phase 4: User Story 2 - Compare reasoning strategies (Priority: P2)

**Goal**: Run selected strategies against the same operator input and compare their answers, traces, and costs.

**Independent Test**: Run the arena with one or both valid strategies and verify each receives the identical input and limit and prints its own answer, formatted trace, and metrics. Invalid strategy names, flags, and limits must fail clearly.

### Tests for User Story 2

- [ ] T015 [P] [US2] Add arena CLI tests in `src/arena.test.ts` for strategy selection, shared input/iteration settings, output sections, unknown strategies, unknown flags, empty input, and invalid `--max-iterations`, using injected test strategies instead of live models.

### Implementation for User Story 2

- [ ] T016 [US2] Implement and validate positional/`--input`, `--strategies`, and `--max-iterations` argument handling in `src/arena.ts`; expose parser/runner seams with an injectable strategy registry for offline tests, run every selected strategy with the same input and limit, and print each answer, typed trace, and metrics without exposing secrets.

**Checkpoint**: Operators can invoke the CLI to compare one or more strategy runs and receive actionable errors for invalid options.

---

## Phase 5: User Story 3 - Reproduce and verify tool behavior (Priority: P3)

**Goal**: Developers can restore the known seed and verify store/trace behavior deterministically, without an LLM or network.

**Independent Test**: Run the seed command twice and verify it restores/upserts the same five-service, six-alert baseline with three firing and three resolved alerts and no duplicate records; run store/trace tests offline.

### Tests for User Story 3

- [ ] T017 [P] [US3] Add seed lifecycle tests in `src/agents/seed.test.ts` verifying repeatability and the exact seed counts without requiring MySQL, credentials, or model calls.

### Implementation for User Story 3

- [ ] T018 [US3] Implement the seed entry point in `src/agents/seed.ts` to report the in-memory baseline and optionally persist the idempotent service/alert seed to MySQL in a transaction, always closing the connection and surfacing failures.
- [ ] T019 [US3] Wire the `seed` npm script in `package.json` to execute `src/agents/seed.ts` with the repository's existing Node/tsx conventions.

**Checkpoint**: A developer can reproduce the primary dataset and run its deterministic verification independently of OpenRouter.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the integrated feature and keep the repository's documented commands and feature documentation consistent.

- [ ] T020 Update `specs/001-reasoning-core/quickstart.md` to match the implemented flags, seed behavior, prerequisites, and expected output.
- [ ] T021 Run `npm test` and `npm run typecheck` from the scripts in `package.json`; fix only regressions introduced by this feature and record successful results.
- [ ] T022 Run `npm run seed` from `package.json` as the final seed verification; confirm output reports exactly five services and six alerts (three firing, three resolved), and report a clear error if configured MySQL persistence fails.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No feature dependencies; confirm package conventions first.
- **Foundational (Phase 2)**: Depends on Setup; blocks each story because all rely on shared types, tools, store, or trace contracts.
- **User Story 1 (Phase 3)**: Depends on Foundational; creates the model factory and both reasoning strategies.
- **User Story 2 (Phase 4)**: Depends on Foundational and the strategy interfaces/results from US1 for complete arena integration.
- **User Story 3 (Phase 5)**: Depends on Foundational store, seed fixtures, and Sequelize models; it can proceed in parallel with US1 after Phase 2.
- **Polish (Phase 6)**: Depends on the stories selected for delivery; seed verification T022 runs last.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; no dependency on another user story.
- **US2 (P2)**: Starts after Phase 2; final strategy execution/output integration depends on US1.
- **US3 (P3)**: Starts after Phase 2; seed lifecycle and deterministic tests are independent of US1 and US2.
- Within US1, T010/T011 precede implementation; T012 must finish before T013/T014. T013 and T014 can then run in parallel.
- Within US2, T015 precedes T016. Within US3, T017 precedes T018, then T019 wires the runnable command.

### Within Each User Story

- Write offline tests before implementing their behavior; tests must fail for the missing behavior and pass after implementation.
- Complete the model factory before strategies consume it.
- ReAct and Plan-and-Execute can be implemented in parallel after shared types, tools, and model factory are ready.
- Arena tests use injected strategy doubles; the arena is integrated with real strategy implementations after US1.
- Run complete checks after integrated implementation, then run `npm run seed` as the final seed-validation step.

### Parallel Opportunities

- T003 and T004 are independent test files after T002 and can be authored in parallel.
- After T002, T005 seed data and T008 database models can be developed separately; store depends on seed data, tools depend on store.
- T010 and T011 are separate test files and can be authored in parallel after the common contracts are established.
- T013 and T014 modify separate strategy files and can run in parallel after T012 and T009.
- US3 can proceed in parallel with US1 after Phase 2; T015 can be prepared with injected fakes while US1 strategies are under development.

## Parallel Example: User Story 1

```text
Before the strategy implementations:
Task: Add fake-boundary strategy tests in src/agents/strategies.test.ts (T010)
Task: Add model-factory configuration tests in src/agents/model.test.ts (T011)

After T012 (model factory) and T009 (tools) are complete:
Task: Implement ReAct strategy and trace capture in src/agents/react.ts (T013)
Task: Implement planner/executor/replanner graph in src/agents/plan-and-execute.ts (T014)
```

## Parallel Example: User Story 3

```text
After Phase 2 is complete:
Task: Add repeatable seed lifecycle tests in src/agents/seed.test.ts (T017)
Task: Implement the seed entry point and MySQL persistence lifecycle in src/agents/seed.ts (T018)
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational tasks.
2. Complete US1 tests, model factory, ReAct, and Plan-and-Execute.
3. Validate US1 independently with fake boundaries and a configured end-to-end run when credentials are available.
4. Stop for MVP review before arena comparison and optional MySQL persistence validation.

### Incremental Delivery

1. Setup + Foundational → shared tools and deterministic verification.
2. Add US1 → operational reasoning and both strategy results.
3. Add US2 → CLI strategy comparison.
4. Add US3 → repeatable seed lifecycle and offline verification.
5. Run test/type checks and perform the seed command as the final validation.

## Notes

- Every task uses the required `- [ ] T### [P?] [Story?]` checklist format and names the exact source, test, or documentation path.
- `[P]` marks work in different files with no unfinished-task dependency.
- `[US1]`, `[US2]`, and `[US3]` map to the matching priority stories in spec.md.
- MySQL-dependent seed validation is optional when no database configuration is provided; in-memory seed validation remains mandatory.

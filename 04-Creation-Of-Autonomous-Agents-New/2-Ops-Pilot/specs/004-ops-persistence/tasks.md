---
description: "Executable implementation tasks for Ops Persistence"
---

# Tasks: Ops Persistence

**Input**: Design documents from `/specs/004-ops-persistence/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/ops-tools.md](./contracts/ops-tools.md),
[quickstart.md](./quickstart.md)

**Tests**: Tests are required by the specification and project constitution. Add deterministic
`node:test` coverage using `tsx`, with SQLite tests isolated in `:memory:`.

**Organization**: Tasks are grouped by the three independently verifiable user stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: The task can be implemented in parallel with another task touching different files and
  having no unfinished prerequisite.
- **[Story]**: The user story this task supports: US1, US2, or US3.
- Each task description names the exact repository file paths it changes or validates.

## Phase 1: Setup

**Purpose**: Prepare the repository for a local persistent SQLite database.

- [ ] T001 Add `data/` to `.gitignore` so the default operational database is not versioned.

---

## Phase 2: Foundational

**Purpose**: Define the shared domain/store boundary and preserve the deterministic in-memory
implementation before story-specific work begins.

- [ ] T002 Define the `OpsStore` interface and shared Zod/domain types in `src/agents/store.ts`
  and `src/agents/types.ts`, including Service `tier` (`tier-1`, `tier-2`, `tier-3`), Incident
  nullable `resolvedAt` and `summary`, incident-list filters (`open`, `resolved`, `all`), and
  Runbook fields.
- [ ] T003 Update `MemoryOpsStore` and the mock fixtures to implement the shared contract in
  `src/agents/store.ts`, `src/agents/seed-data.json`, `src/agents/seed-data.ts`, and
  `src/agents/store.test.ts`; keep the mock at the original five services, provide deterministic
  runbook lookup, and update the Catalog benchmark fixture in `src/bench.ts` and
  `src/bench.test.ts` to include a valid tier.

**Checkpoint**: The memory store and domain types satisfy `OpsStore`; SQLite and tool work can now
be developed against that stable contract.

---

## Phase 3: User Story 1 - Preserve operational data (Priority: P1) 🎯 MVP

**Goal**: Persist services, alerts, incidents, and runbooks across application restarts, while
enforcing the closed-domain constraints and preserving incident lifecycle behavior.

**Independent Test**: Using `SqliteOpsStore(':memory:')` and a temporary file-backed database,
verify the seed, repeated initialization, incident creation/resolution, filters, CHECK failures,
and data survival after close/reopen.

### Tests for User Story 1

- [ ] T004 [US1] Add `node:test` cases in `src/store/sqlite-ops-store.test.ts` for constructor DDL,
  six persistent seed services, six alerts split 3/3 by status, three runbooks, and repeated
  initialization without duplicate fixtures or erased incidents.
- [ ] T005 [US1] Add `node:test` cases in `src/store/sqlite-ops-store.test.ts` for opening,
  listing, resolving, and reopening incidents; all/open/resolved store filters; nullable
  `resolvedAt` and `summary`; and SQLite rejection of invalid tier, severity, and status values.

### Implementation for User Story 1

- [ ] T006 [US1] Implement idempotent four-table schema creation, foreign keys, required fields,
  closed-value CHECK constraints, and transactional non-destructive seed inserts in
  `src/store/sqlite-ops-store.ts`; include the six production services (the original five plus
  Auth), six alerts, and Checkout/Payments/Auth runbooks.
- [ ] T007 [US1] Implement `SqliteOpsStore` service/alert/incident/runbook queries in
  `src/store/sqlite-ops-store.ts` using prepared statements and bound values only; support
  `OPSPILOT_DB` with default `./data/opspilot.db`, `:memory:`, file-parent creation, stable
  incident IDs, resolution timestamps, domain errors, and explicit `close()`.

**Checkpoint**: Story 1 is independently testable with both an in-memory SQLite database and a
file-backed database reopened after closing.

---

## Phase 4: User Story 2 - Investigate incidents and runbooks (Priority: P1)

**Goal**: Let the agent inspect incidents by status and retrieve the service-specific runbook,
with tool schemas and descriptions that guide safe and appropriate use.

**Independent Test**: Run all operational tools with an isolated SQLite store and verify the
incident filter defaults, explicit filters, runbook matches and not-found behavior, and validation
of each tool's described inputs.

### Tests for User Story 2

- [ ] T008 [P] [US2] Update `src/agents/tools.test.ts` to use `SqliteOpsStore(':memory:')` and
  cover the existing alert/open/resolve tools plus `list_incidents` default/open/resolved/all
  behavior and `consultar_runbook` for Checkout, Payments, Auth, and an unknown service.

### Implementation for User Story 2

- [ ] T009 [US2] Update `createOpsTools` in `src/agents/tools.ts` to accept `OpsStore`, add
  `list_incidents` and `consultar_runbook`, and ensure all five operational tool descriptions
  state purpose, when to use, accepted values/defaults, and effects/results; add `.describe()` to
  every input field and use enums for closed values.
- [ ] T010 [US2] Extend the plan-and-execute tool schema, planner prompt, and executor dispatch in
  `src/agents/plan-and-execute.ts` to support `list_incidents` and `consultar_runbook` without
  bypassing the validated tools or changing existing planning behavior.

**Checkpoint**: Story 2 is independently testable through the tool interfaces without a model or
network connection.

---

## Phase 5: User Story 3 - Keep behavior reproducible (Priority: P2)

**Goal**: Use persistent SQLite in production while retaining isolated memory stores in tests and
benchmarks.

**Independent Test**: Verify that production composition creates and injects a configured
`SqliteOpsStore`, test and benchmark paths use isolated in-memory stores, and no benchmark accesses
the default database file.

### Tests for User Story 3

- [ ] T011 [US3] Add deterministic composition and regression assertions in
  `src/http/server.test.ts`, `src/arena.test.ts`, `src/agents/strategies.test.ts`, and
  `src/bench.test.ts` proving that production can inject the persistent store while strategy tests
  and benchmarks remain independent of file-backed SQLite.

### Implementation for User Story 3

- [ ] T012 [US3] Update strategy dependencies and store factory signatures in `src/agents/react.ts`
  and `src/agents/plan-and-execute.ts` to depend on `OpsStore`, accept injected stores, and retain
  `MemoryOpsStore` defaults for isolated strategy tests.
- [ ] T013 [US3] Add a store-aware strategy registry factory in `src/agents/index.ts` that builds
  the production ReAct and plan-and-execute strategies with the supplied `OpsStore` while
  preserving a memory-backed registry for deterministic callers.
- [ ] T014 [US3] Wire the HTTP production entry point in `src/http/server.ts` to construct a
  file-backed `SqliteOpsStore` from `OPSPILOT_DB`, inject it into the strategy registry, and close
  its connection during orderly server shutdown.
- [ ] T015 [US3] Wire the production CLI in `src/arena.ts` to construct and inject the configured
  SQLite store, and close the connection on successful completion and error paths.
- [ ] T016 [US3] Update `runSeed` in `src/agents/seed.ts` to initialize and summarize the
  configured persistent store, close it on completion, and preserve the existing `npm run seed`
  command in `package.json`.
- [ ] T017 [US3] Keep benchmark execution isolated from production persistence in `src/bench.ts`
  and `src/bench.test.ts`, using `MemoryOpsStore` and the original five-service fixture regardless
  of `OPSPILOT_DB`.
- [ ] T018 [US3] Remove the superseded database definitions and tests from
  `src/agents/database.ts` and `src/agents/database.test.ts`, then remove Sequelize, MySQL, and
  related type dependencies from `package.json` and `package-lock.json` after confirming no active
  imports remain.

**Checkpoint**: Production HTTP/CLI use SQLite, while model-free tests and benchmarks remain
repeatable and do not touch persistent operational data.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature against project quality gates and its documented
end-to-end scenarios.

- [ ] T019 Run `npm run typecheck`, `npm test`, and the offline persistent-store scenarios in
  `specs/004-ops-persistence/quickstart.md`; confirm benchmark isolation through
  `src/bench.test.ts` and ensure `git diff --check` passes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No prerequisite; T001 can start immediately.
- **Foundational (Phase 2)**: T002 follows setup; T003 depends on T002 and blocks story work until
  the memory implementation satisfies the shared contract.
- **User Stories (Phase 3+)**: All depend on Phase 2 completion.
- **Polish (Phase 6)**: Depends on all three user stories and removal of the obsolete database
  path.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2; no dependency on another story. It establishes and
  tests the persistent store.
- **User Story 2 (P1)**: Starts after Phase 2. Its tool tests can be authored in parallel with US1
  tests; implementation requires the `SqliteOpsStore` contract from US1.
- **User Story 3 (P2)**: Starts after Phase 2, but production wiring depends on the SQLite adapter
  from US1, the expanded tools from US2, and the store-aware strategy types.

### Within Each User Story

- Add or update tests before the implementation tasks and verify they fail for the missing feature.
- US1 schema/seed work (T006) precedes store operations and configuration (T007).
- US2 tool implementation (T009) precedes plan-and-execute registration (T010).
- US3 strategy injection (T012) precedes registry creation (T013), which precedes HTTP/CLI
  composition (T014-T016).
- Retire Sequelize/MySQL only after all active consumers are removed (T018).

### Dependency Graph

```text
T001 -> T002 -> T003
                 ├──> T004 -> T005 -> T006 -> T007
                 ├──> T008 (may be authored alongside T004/T005)
                 │              T007 + T008 -> T009 -> T010
                 └──> T011 (test authoring)
                                T007 + T010 + T011 -> T012 -> T013
                                                        ├──> T014
                                                        ├──> T015
                                                        └──> T016
                                              T017 follows T003; T018 follows T014-T017
                                              T004-T018 -> T019
```

### Parallel Opportunities

- **Setup**: T001 is independent of code tasks.
- **Foundational**: T002 must precede T003; no parallel work is claimed for their shared store
  contract and memory implementation.
- **US1/US2 test authoring**: T004 and T008 touch separate test files and can be authored in
  parallel after T003. T005 follows T004 because both modify `src/store/sqlite-ops-store.test.ts`.
- **US3 test authoring**: T011 can be drafted after the store contract is available; production
  assertions remain red until the later composition tasks.
- **US3 composition**: After T013, the HTTP and CLI wiring tasks T014 and T015 touch separate
  files and can be implemented in parallel. T016 is likewise separable after T013.
- **Benchmark maintenance**: T017 touches only the benchmark paths and can proceed after T003,
  in parallel with SQLite integration tasks if file ownership is kept separate.

## Parallel Example: User Story 1 and User Story 2 Tests

```text
Task: T004 — add SQLite schema, seed, and idempotence tests in src/store/sqlite-ops-store.test.ts
Task: T008 — update tool integration tests in src/agents/tools.test.ts
```

Run these after T003; they target separate files and can be implemented concurrently.

## Parallel Example: User Story 3 Composition

```text
Task: T014 — wire the SQLite store into src/http/server.ts
Task: T015 — wire the SQLite store into src/arena.ts
Task: T016 — update persistent seeding in src/agents/seed.ts
```

Start these after T013; keep each task's edits within its named file(s).

## Implementation Strategy

### MVP First (User Story 1)

1. Complete setup and foundational work (T001-T003).
2. Add the SQLite store tests and implement the schema, seed, and incident lifecycle (T004-T007).
3. **Stop and validate US1** with `node --import tsx --test src/store/sqlite-ops-store.test.ts`.
4. Confirm file-backed reopen persistence using a temporary path before proceeding.

### Incremental Delivery

1. Complete T001-T003; the shared domain/store boundary and memory benchmark path remain usable.
2. Complete US1 (T004-T007); persistent operational data is independently usable.
3. Complete US2 (T008-T010); tools can investigate incidents and runbooks without model calls.
4. Complete US3 (T011-T018); production entry points use SQLite while tests and benchmarks stay
   isolated.
5. Complete T019; validate type safety, full test suite, benchmark scenarios, and quickstart.

### Parallel Team Strategy

1. Complete T001-T003 together because they establish the shared domain/store contract.
2. After T003, split US1 SQLite tests and US2 tool tests across different files.
3. After the adapter and tool contracts are stable, parallelize HTTP/CLI composition (T014/T015)
   and benchmark-only work (T017), avoiding overlapping file edits.

## Notes

- Every task uses the required checkbox, sequential ID, optional `[P]`, applicable story label, and
  exact file path format.
- SQLite queries must bind values; the only SQL executed without bound values is fixed schema DDL
  and transaction control.
- The default persistent seed has six services including Auth; `MemoryOpsStore` and benchmark
  scenarios retain the original five-service baseline.

---

description: "Task list for Chat HTTP API"

---

# Tasks: Chat HTTP API

**Input**: Design documents from `/specs/003-chat-http-api/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: Integration tests are required by the specification and project constitution. Use a deterministic fake strategy and injected short timeout; do not make model-provider or external network calls.

**Organization**: Tasks are grouped by user story. Shared strategy registry work precedes the HTTP stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Tasks on different files with no unmet dependencies may run in parallel.
- **[Story]**: User-story label corresponding to `spec.md`.
- Each task names the file paths to create or modify.

## Path Conventions

Runtime code and tests use the existing single project layout under `src/`; API contracts and run guidance are under `specs/003-chat-http-api/`.

## Phase 1: Setup

**Purpose**: Express, Zod, TypeScript, and the test runner are already installed and configured.

No tasks.

---

## Phase 2: Foundational

**Purpose**: Provide a single named registry of base strategies for the HTTP controller to resolve.

- [ ] T001 [P] Export a readonly name-to-strategy registry containing the base `react` and `plan-and-execute` strategies from `src/agents/index.ts`; do not include reflective aliases because request-level reflection decorates the selected base strategy.

**Checkpoint**: HTTP stories can resolve named strategies without hard-coded route branches.

---

## Phase 3: User Story 1 - Submit a chat request (Priority: P1) 🎯 MVP

**Goal**: Accept valid chat requests, default to ReAct, return the reasoning result shape, and optionally reflect on the selected strategy.

**Independent Test**: Exercise `POST /chat` using an injected deterministic strategy registry. Verify omitted strategy selects `react`, explicit selection works, the response contains exactly `answer`, `trace`, and `metrics`, and `reflect: true` invokes an injected reflection decorator around the selected strategy without network access.

### Tests for User Story 1

- [ ] T002 [US1] Add HTTP integration tests for default `react`, explicit strategy selection, exact 200 response fields, and per-request reflection decoration using fake strategies and an injected decorator in `src/http/server.test.ts`; confirm the tests fail before implementation.

### Implementation for User Story 1

- [ ] T003 [US1] Create the Express app factory and `POST /chat` handler in `src/http/server.ts`; validate strict request JSON with Zod, default omitted strategy to `react`, resolve from the injected/default registry, apply the injectable reflection decorator only when `reflect` is true, validate output with `ReasoningResultSchema`, and return only `answer`, `trace`, and `metrics`.
- [ ] T004 [US1] Add an explicit HTTP startup entry point in `src/http/server.ts` that listens on `PORT` or `3000`, and add the `http` script using the existing Node/tsx conventions in `package.json`.

**Checkpoint**: A valid deterministic request returns the expected successful response and reflection is opt-in.

---

## Phase 4: User Story 2 - Receive actionable request errors (Priority: P1)

**Goal**: Distinguish invalid bodies from valid requests naming unknown strategies and avoid invoking strategies for either failure.

**Independent Test**: Through the HTTP integration harness, send missing/blank message, wrong `reflect` type, unknown fields, malformed JSON, and an unknown strategy; assert 400 with Zod issues for invalid input, 422 for unknown strategy, and no fake strategy invocation.

### Tests for User Story 2

- [ ] T005 [US2] Add integration tests for schema-invalid bodies, unknown fields, malformed JSON, unknown strategy, Zod issue details, and zero strategy calls on failures in `src/http/server.test.ts`; confirm the tests fail before implementation.

### Implementation for User Story 2

- [ ] T006 [US2] Handle Express JSON parser errors and Zod request validation as HTTP 400 with an `issues` array, return HTTP 422 with a generic unknown-strategy error for registry misses, and return a generic HTTP 500 for other errors without stack traces in `src/http/server.ts`.

**Checkpoint**: Request and strategy-selection errors are distinguishable, structured, and do not execute strategies.

---

## Phase 5: User Story 3 - Bound request execution time (Priority: P2)

**Goal**: Return HTTP 504 when reasoning exceeds the 180-second production deadline, without returning partial results.

**Independent Test**: Inject a short deadline and a fake strategy that remains pending; verify HTTP 504. Also verify a strategy resolving before the deadline returns 200. Tests must not wait 180 seconds.

### Tests for User Story 3

- [ ] T007 [US3] Add integration tests for successful completion before an injected short deadline and timeout response after it, asserting HTTP 504 contains no partial answer in `src/http/server.test.ts`; confirm timeout testing completes promptly.

### Implementation for User Story 3

- [ ] T008 [US3] Add an injectable request timeout defaulting to 180,000 ms, race strategy execution against the deadline, clear the timer when execution settles, and return HTTP 504 with a generic timeout body and no partial result in `src/http/server.ts`.

**Checkpoint**: The route responds within the configured deadline and distinguishes timeout from normal strategy failures.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Document invocation and verify the feature against the complete project.

- [ ] T009 [P] Document the HTTP startup command, request example, response shape, and error responses in `specs/003-chat-http-api/quickstart.md` and `specs/003-chat-http-api/contracts/chat-http.md`.
- [ ] T010 Run `npm test` and `npm run typecheck` from the repository root using the scripts in `package.json`; resolve regressions in `src/agents/index.ts`, `src/http/server.ts`, `src/http/server.test.ts`, and `package.json`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; project tooling already exists.
- **Foundational (Phase 2)**: No setup dependency; T001 provides the named strategy registry required by the endpoint.
- **User Story 1 (Phase 3)**: Depends on T001; delivers the MVP request path and runnable HTTP service.
- **User Story 2 (Phase 4)**: Depends on T003's route and request parsing.
- **User Story 3 (Phase 5)**: Depends on T003's route and injectable app options; independent of US2 after the core route exists.
- **Polish (Phase 6)**: Depends on the desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: Depends only on the foundational strategy registry; MVP.
- **US2 (P1)**: Depends on the core route from US1.
- **US3 (P2)**: Depends on the core route from US1; may proceed in parallel with US2 after T003.

### Within Each User Story

- Add integration tests before implementing the behavior they verify.
- T002 precedes T003. T004 can proceed after the app factory contract in T003 is established.
- T005 precedes T006; T007 precedes T008.
- After T003, US2 validation/error handling and US3 timeout behavior touch the same server module and should be coordinated or applied sequentially even though their requirements are independently testable.
- T009 changes documentation and can run in parallel with implementation once the contract is stable.

## Parallel Opportunities

### After the registry and core route

```text
Stream A: T005 -> T006 (validation and error responses)
Stream B: T007 -> T008 (deadline and timeout handling)
Stream C: T009 (documentation in separate files)
```

T005/T007 tests both modify `src/http/server.test.ts`, so those test edits should be coordinated or applied sequentially. Once their test cases are committed, server implementation T006/T008 also modify the same file and should be integrated sequentially. T009 is independent and can proceed in parallel.

## Implementation Strategy

### MVP First (User Story 1)

1. Complete T001 through T004.
2. Verify the default strategy, explicit selection, output shape, and reflected execution using deterministic fakes.
3. Validate a runnable service command before adding error and timeout refinements.

### Incremental Delivery

1. Add the successful request flow and strategy registry.
2. Add structured 400/422 responses and generic failure handling.
3. Add the bounded 180-second response deadline with a short injectable test deadline.
4. Update contract/run documentation and run full tests and type-check.

## Notes

- `[P]` indicates distinct files with no unmet prerequisite, not merely theoretical parallelism.
- User-story labels map directly to the specification.
- The strategy interface has no cancellation signal; timing out ends the HTTP response wait but cannot guarantee cancellation of model/tool work already in progress.

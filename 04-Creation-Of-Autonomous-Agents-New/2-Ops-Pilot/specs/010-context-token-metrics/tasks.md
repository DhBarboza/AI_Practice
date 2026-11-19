---

description: "Task list for context token metrics"
---

# Tasks: Context Token Metrics

**Input**: Design documents from `/specs/010-context-token-metrics/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/chat-context-metrics.md`, `quickstart.md`

**Tests**: Included because the feature specification explicitly requests tests and the
constitution requires tests for every new logic path.

**Organization**: Tasks are grouped by user story after shared foundations. The pure estimator
is a shared prerequisite for both chat breakdowns and the standalone estimate scenario.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with another task in the same phase because it edits separate files
  and has no dependency on that task.
- **[Story]**: User-story label, required for tasks in user-story phases.
- Each task names the exact source, test, or documentation path it changes.

## Phase 1: Setup

**Purpose**: Project initialization.

The existing Node.js, TypeScript, `tsx`, Zod, and test configuration already support this feature;
no dependency or project setup change is needed.

---

## Phase 2: Foundational

**Purpose**: Shared token utilities and strict metric types required by the user stories.

- [ ] T001 Add failing unit tests for the four-character estimate baseline and prompt-usage aggregation in `src/context/tokens.test.ts`.
- [ ] T002 Implement `estimateTokens` (four characters per estimated token, rounded up; empty text is zero) and pure prompt-usage/context-breakdown aggregation in `src/context/tokens.ts`; return `null` for real usage if any call lacks a reported input-token count.
- [ ] T003 Add strict shared context-source and reasoning-metric schemas in `src/agents/types.ts`, including optional source-attributed input that preserves existing direct strategy callers, and update existing reasoning-result fixtures in `src/agents/strategies.test.ts`, `src/agents/reflection.test.ts`, `src/services/chat-service.test.ts`, `src/http/server.test.ts`, `src/bench.test.ts`, and `src/arena.test.ts`. Enforce `promptTokens` as a non-negative integer or `null`; breakdown counts as non-negative integers; `estimated` as literal `true`; and `total` as the sum of the five source values.

**Checkpoint**: Shared schemas and aggregation utilities are ready; strategy-specific usage capture can begin.

---

## Phase 3: User Story 1 - Inspect chat token usage (Priority: P1) 🎯 MVP

**Goal**: Return real prompt-token usage separately from estimated context by source for each chat turn.

**Independent Test**: Run a deterministic chat turn whose model responses provide usage metadata and known context sources; verify the response has the exact real total and separate source estimates. Repeat with one model response missing usage and verify `promptTokens` is `null`.

### Tests for User Story 1

- [ ] T004 [P] [US1] Add deterministic ReAct and Plan-and-Execute tests for summed `AIMessage.usage_metadata.input_tokens` and `null` when any contributing call omits usage in `src/agents/strategies.test.ts`.
- [ ] T005 [P] [US1] Add reflection tests that aggregate candidate and critic usage, and return `null` when a contributing call has no reported input-token count, in `src/agents/reflection.test.ts`.
- [ ] T006 [P] [US1] Add chat-service tests for attribution of current message, history, and recalled memories, aggregation across calls, and separation of real versus estimated values in `src/services/chat-service.test.ts`.
- [ ] T007 [P] [US1] Add `POST /chat` contract tests for the real count, unavailable `null`, and the five-source estimated breakdown in `src/http/server.test.ts`.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Extract usage metadata from every ReAct AI message and record its app-controlled prompt sources in `src/agents/helpers.ts` and `src/agents/react.ts`.
- [ ] T009 [P] [US1] Retain raw AI messages from planner, replanner, and executor structured-output calls and record usage and source estimates per call in `src/agents/plan-and-execute.ts`.
- [ ] T010 [P] [US1] Retain raw critic AI messages and aggregate critic plus candidate metrics, including incomplete-usage behavior, in `src/agents/reflection.ts`.
- [ ] T011 [US1] Preserve current-message, conversation-history, and recalled-memory source segments when composing strategy input; combine strategy metrics into the chat response and export the Zod-validated response schema for the CLI in `src/services/chat-service.ts`.

**Checkpoint**: Chat responses distinguish complete LangChain-reported prompt usage from per-source estimates, including unavailable usage.

---

## Phase 4: User Story 2 - Review a long conversation by turn (Priority: P2)

**Goal**: Print the real prompt-token count or an unavailable marker for each turn in the long-conversation exercise.

**Independent Test**: Run the TypeScript runner against a stub chat endpoint returning multiple turns, including one with `promptTokens: null`; verify one accurate output line per turn and no use of estimated counts.

### Tests for User Story 2

- [ ] T012 [P] [US2] Add CLI tests with stubbed responses for sequential conversation IDs, validated response data, per-turn real counts, unavailable usage, and surfaced HTTP failures in `src/cli/conversa-longa.test.ts`.

### Implementation for User Story 2

- [ ] T013 [US2] Implement the TypeScript runner to send several turns in one conversation, validate each response with the exported chat response schema, and print only the turn number and real `promptTokens` or `unavailable` in `src/cli/conversa-longa.ts`.
- [ ] T014 [US2] Add the executable root launcher that runs `src/cli/conversa-longa.ts` with the repository's Node.js and `tsx` setup in `conversa-longa.sh`.

**Checkpoint**: The long-conversation exercise prints one validated real-usage result per successful turn without exposing prompt contents.

---

## Phase 5: User Story 3 - Estimate context consistently (Priority: P3)

**Goal**: Verify the shared estimator's empty, short, and non-multiple-of-four behavior independently of the chat workflow.

**Independent Test**: Call the exported estimator directly and verify empty input is zero, a four-character string is one, and a five-character string is two.

### Tests for User Story 3

- [ ] T015 [US3] Add direct boundary tests for empty and non-multiple-of-four text lengths to `estimateTokens` in `src/context/tokens.test.ts`.

**Checkpoint**: The pure estimator behavior is independently covered in addition to the chat breakdown tests.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature and its documented manual exercise.

- [ ] T016 Run `npm run typecheck`, `npm test`, and the automated quickstart scenarios in `specs/010-context-token-metrics/quickstart.md` using stubs rather than provider credentials; resolve regressions in the touched feature paths.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependency changes or initialization tasks are required.
- **Foundational (Phase 2)**: Begins immediately; T002 depends on the tests in T001, and T003 depends on the shared context schema from T002. Blocks all user-story implementation.
- **User Stories (Phase 3+)**: US1 depends on Phase 2; US2 depends on US1's chat response schema and metrics; US3 depends on Phase 2 and is otherwise independent.
- **Polish (Phase 6)**: Depends on all desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2. No dependency on another user story.
- **US2 (P2)**: Starts after US1 exposes and validates `promptTokens` in the chat response.
- **US3 (P3)**: Starts after Phase 2. Its estimator behavior is independently testable and does not depend on US1 or US2.

### Within Each User Story

- US1 tests T004-T007 precede the corresponding strategy/service implementation. T008-T010 edit separate agent files and can run in parallel after the tests; T011 depends on the strategy metrics and completes the chat composition.
- US2 test T012 precedes the runner T013; the shell launcher T014 depends on the runner.
- US3 boundary test T015 depends only on the shared estimator from Phase 2 and can run in parallel with US2 after US1 is complete.
- T016 is last and validates the whole feature against the repository commands and quickstart.

### Parallel Opportunities

- T004, T005, T006, and T007 can be prepared in parallel after T003 because they edit separate test files.
- T008, T009, and T010 can be implemented in parallel after their tests because they edit separate agent files.
- T015 can run alongside US2 after Phase 2; it edits only the shared estimator test file.
- US2 cannot be completed before US1 because its runner consumes the chat response contract.

---

## Parallel Example: User Story 1

```text
Task: T004 ReAct and Plan-and-Execute usage tests in src/agents/strategies.test.ts
Task: T005 Reflection usage tests in src/agents/reflection.test.ts
Task: T006 Chat-service breakdown tests in src/services/chat-service.test.ts
Task: T007 HTTP response contract tests in src/http/server.test.ts
```

After those tests are in place:

```text
Task: T008 ReAct usage capture in src/agents/helpers.ts and src/agents/react.ts
Task: T009 Plan-and-Execute usage capture in src/agents/plan-and-execute.ts
Task: T010 Reflection usage capture in src/agents/reflection.ts
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 2, including estimator, aggregation, and metric schemas.
2. Complete Phase 3 and verify real usage and estimated source breakdown independently.
3. Stop and validate with the focused tests before adding the long-conversation runner.

### Incremental Delivery

1. Complete shared foundation and deliver US1 chat metrics as the MVP.
2. Add US2 per-turn CLI output after the chat response contract is available.
3. Verify US3 estimator boundaries independently; it can proceed in parallel with US2 after the foundation.
4. Run all validation commands and the live quickstart scenario.

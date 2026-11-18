---
description: "Implementation tasks for learning reflector"
---

# Tasks: Learning Reflector

**Input**: Design documents from `/specs/009-learning-reflector/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/learning-tools.md](./contracts/learning-tools.md),
[quickstart.md](./quickstart.md)

**Tests**: Tests are required by the feature requirements and project constitution. Write the
focused tests before the corresponding implementation tasks.

**Organization**: Tasks are grouped by user story and ordered by dependencies.

## Phase 1: Setup

**Purpose**: The repository already has the required runtime dependencies, TypeScript setup, and
test runner. No setup changes are required.

No tasks.

---

## Phase 2: Foundational

**Purpose**: The existing semantic-memory store and chat user identity provide the shared
foundation. There are no additional blocking foundation changes.

No tasks.

---

## Phase 3: User Story 1 - Learn durable facts after chat (Priority: P1) 🎯 MVP

**Goal**: Assess only the latest user message after a successful answer and save eligible facts in
the background without affecting the answer.

**Independent Test**: Inject a deterministic assessor and memory store. Verify a durable fact is
eventually remembered for the active user, while one-off requests and credentials are not saved
and delayed or failed learning does not block or change the chat response.

### Tests for User Story 1

- [X] T001 [P] [US1] Add learning-result and eligibility tests in `src/memory/learning-reflector.test.ts` for `hasLearning` false/true, malformed or empty facts, non-durable requests, credential-like content, and validation before `MemoryStore.remember`.
- [X] T002 [P] [US1] Add chat-service tests in `src/services/chat-service.test.ts` proving the assessor receives only the latest user message and active `userId`, is never called after a failed answer, and delayed or rejected background learning does not delay or alter the successful response.

### Implementation for User Story 1

- [X] T003 [US1] Implement the strict structured learning result and injectable assessor in `src/memory/learning-reflector.ts`, preserving these `data-model.md` constraints verbatim: `hasLearning` — “Required”; `fact` — “Required; null when no learning is proposed; when `hasLearning` is true, non-empty after trimming”.
- [X] T004 [US1] Implement durable-fact eligibility and a deterministic credential-content guard in `src/memory/learning-reflector.ts`; reject one-off requests and passwords, access/API tokens, private keys, recovery codes, or other authentication credentials found in the source message or candidate before calling `MemoryStore.remember`, and ensure diagnostics do not include message or fact content.
- [X] T005 [US1] Integrate the reflector into successful chat completion in `src/services/chat-service.ts`; pass only `userId` and the current user message, start learning without awaiting it, and attach a rejection handler that cannot change the response.
- [X] T006 [US1] Wire the production learning reflector and a deterministic test seam through `src/http/server.ts` and `src/http/server.test.ts` without changing the existing `/chat` response shape.

**Checkpoint**: A successful chat response remains independent of learning, and only eligible facts
from the latest user message are remembered for that user.

---

## Phase 4: User Story 2 - Forget a saved preference (Priority: P2)

**Goal**: Let the chat agent remove one exact saved preference for the active user, and accurately
report when there was no matching fact.

**Independent Test**: Invoke `forget_preference` with a scoped memory-store test double. Confirm the
requested user's exact fact is removed, an identical fact for another user remains, and a
non-matching request reports no deletion without changing other facts.

### Tests for User Story 2

- [X] T007 [P] [US2] Add SQLite forget-result tests in `src/store/sqlite-memory-store.test.ts` for exact deletion returning true, missing facts returning false, and preservation of another user's matching fact.
- [X] T008 [P] [US2] Add `forget_preference` tool tests in `src/agents/tools.test.ts` for strict input validation, exact deletion, truthful no-match output, isolation between two user scopes, and absence from the default non-chat tool list.
- [X] T009 [P] [US2] Add strategy-context tests in `src/agents/strategies.test.ts` proving chat `userId` reaches both ReAct and Plan-and-Execute tool factories as trusted context and is not required or accepted as model-supplied tool input.

### Implementation for User Story 2

- [X] T010 [P] [US2] Change `MemoryStore.forget` to return whether an exact row was removed in `src/memory/memory-store.ts` and `src/store/sqlite-memory-store.ts`, preserving `data-model.md`: `fact` — “Required, non-empty after trimming; exact fact to forget”; `userId` — “Required trusted context; never supplied by the model as a tool argument”.
- [X] T011 [P] [US2] Pass the validated active `userId` through the internal chat strategy context in `src/services/chat-service.ts` and `src/agents/types.ts`, without adding it to the prompt or model-generated tool arguments.
- [X] T012 [US2] Implement the strict `forget_preference` tool in `src/agents/tools.ts` with only the exact target `fact` as a model-supplied argument, bind `MemoryStore` and `userId` from trusted invocation context, and return `{ forgotten: boolean }`.
- [X] T013 [P] [US2] Register the scoped `forget_preference` tool for ReAct chat invocations in `src/agents/react.ts` only when the memory store and active user context are available.
- [X] T014 [P] [US2] Add `forget_preference` to Plan-and-Execute planning and execution in `src/agents/plan-and-execute.ts`, restricting it to chat invocations with a trusted user context.
- [X] T015 [US2] Inject the existing memory store into the chat agent registry in `src/agents/index.ts` and `src/http/server.ts`; keep the tool unavailable to non-chat or MCP invocations without user context.

**Checkpoint**: Both chat strategies can forget only the active user's exact preference and report
the actual deletion outcome.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Keep the validation guide aligned and verify the feature against project-wide checks.

- [X] T016 [P] Update `specs/009-learning-reflector/quickstart.md` with the final focused test selectors and expected outcomes for background learning, secret rejection, and preference forgetting.
- [X] T017 [P] Run `npm run typecheck` and `npm test` from the repository root using the scripts in `package.json`; resolve feature-related failures.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks; dependencies and test infrastructure already exist.
- **Foundational (Phase 2)**: No tasks; the semantic-memory contract and chat user identity are
  already available.
- **User Story 1 (Phase 3)**: Starts immediately. T001 and T002 are independent tests; T003 and
  T004 implement the learning service, and T005/T006 integrate and verify it.
- **User Story 2 (Phase 4)**: Scheduled after US1 because it extends chat strategy context and
  modifies shared service/agent composition files. Its feature behavior is independently testable.
- **Polish (Phase 5)**: T016 and T017 can run in parallel after both user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Independent MVP; uses existing `MemoryStore.remember` and chat `userId`.
- **User Story 2 (P2)**: Does not depend on learning behavior, but is scheduled after US1 to avoid
  concurrent edits to `src/services/chat-service.ts` and strategy wiring.

### Task Dependencies

```text
T001 ─┐
      ├─> T003 -> T004 -> T005 -> T006
T002 ─┘

T007 -> T010 ─┐
T009 -> T011 ─┼─> T012 ─┬─> T013 ─┐
T008 ─────────┘          └─> T014 ─┼─> T015

T015 -> T016 / T017
```

### Parallel Opportunities

- T001 and T002 target separate test files and can be written together.
- T007, T008, and T009 target separate store, tool, and strategy test files and can be written
  together after US1 is complete.
- T013 and T014 modify separate strategy implementations and can proceed in parallel after T012.
- T016 and T017 can run in parallel after both stories.

---

## Parallel Examples

### User Story 1

```text
Task: T001 - Learning result and eligibility tests in src/memory/learning-reflector.test.ts
Task: T002 - Non-blocking learning integration tests in src/services/chat-service.test.ts
```

### User Story 2

```text
Task: T007 - SQLite deletion-result tests in src/store/sqlite-memory-store.test.ts
Task: T008 - forget_preference contract tests in src/agents/tools.test.ts
Task: T009 - trusted user-context tests in src/agents/strategies.test.ts
```

---

## Implementation Strategy

### MVP First

1. Complete User Story 1 and validate learning decisions, user scoping, and response independence.
2. Stop and validate the automatic learning flow before adding preference deletion.
3. Implement User Story 2 and expose exact, user-scoped forgetting through both chat strategies.
4. Run quickstart validation, typecheck, and the complete test suite.

### Incremental Delivery

1. Add the reflector with injected model and memory-store boundaries.
2. Trigger it after successful chat answers without awaiting completion.
3. Add and test the scoped tool contract and boolean deletion outcome.
4. Wire the tool into both chat strategies and production registry.
5. Run `npm run typecheck` and `npm test`.

## Notes

- `[P]` is used only for tasks that target separate files and have no unfinished-task dependency.
- `[US1]` and `[US2]` map to the stories in `spec.md`.
- The existing chat response and semantic-memory schema remain unchanged.
- Test fixtures must use placeholders rather than actual or realistic secret values.

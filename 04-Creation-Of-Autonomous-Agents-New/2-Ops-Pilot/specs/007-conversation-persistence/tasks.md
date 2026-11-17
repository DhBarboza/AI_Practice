# Tasks: Conversation Persistence

**Input**: Design documents from `/specs/007-conversation-persistence/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included because FR-010 explicitly requires isolated-storage and deterministic-fake tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with another marked task because they change different files and have no unfinished dependency.
- **[Story]**: Maps a task to a user story from `spec.md`.
- Every task names the file or files to change.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The repository, TypeScript configuration, dependencies, and test scripts already exist. No project initialization or dependency changes are required.

No tasks.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the typed persistence boundary used by the store, service, and HTTP layer.

- [X] T001 Define Zod-validated conversation message types and the `ConversationStore` interface (`create`, single-message `append`, `lastMessages`, and `close`) in `src/store/conversation-store.ts`.

**Checkpoint**: The shared store contract is available before story-specific storage, service, and controller work begins.

---

## Phase 3: User Story 1 - Continue a conversation (Priority: P1) 🎯 MVP

**Goal**: Create a conversation on the first successful chat request, return its identifier, and persist/resume completed exchanges.

**Independent Test**: Make a request without `conversationId`, then continue with the returned ID using a deterministic fake strategy and isolated SQLite storage; verify the ID is stable and previously saved messages are available after reopening the store.

### Tests for User Story 1

- [X] T002 [P] [US1] Add `:memory:` tests for `create`, single-message `append`, and `lastMessages`, plus a temporary-database close/reopen persistence test in `src/store/sqlite-conversation-store.test.ts`.
- [X] T003 [P] [US1] Add `ChatService` tests with a deterministic fake strategy/store for new IDs, resumed conversations, labeled prior context, appending the user before strategy execution, and appending the assistant only after success in `src/services/chat-service.test.ts`.
- [X] T004 [P] [US1] Add HTTP integration tests using a fake strategy and `SqliteConversationStore(":memory:")` for creating a conversation, returning its ID, and continuing with that ID in `src/http/server.test.ts`.

### Implementation for User Story 1

- [X] T005 [US1] Implement `SqliteConversationStore` using the existing `OPSPILOT_DB` configuration and the idempotent `messages` schema with prepared statements, Zod row validation, and append-order reads in `src/store/sqlite-conversation-store.ts` (depends on T001 and T002). Preserve these data-model constraints: `role` is `"user" | "assistant"`; `content` is required message text; `createdAt` is a UTC timestamp; `id` is unique; `conversationId` is required.
- [X] T006 [US1] Implement `ChatService` in `src/services/chat-service.ts` to create or resume a conversation, load up to 12 saved messages in chronological order, compose labeled history before the current message, append the user message before invoking the selected strategy, and append the assistant response only after success (depends on T001 and T003).
- [X] T007 [US1] Integrate `ChatService` and the optional `conversationId` request/response field in `src/http/server.ts`; inject `SqliteConversationStore` in production composition and close it with the server (depends on T004, T005, and T006).

**Checkpoint**: A successful chat creates or resumes a persisted conversation, returns its identifier, and provides saved context to the selected strategy.

---

## Phase 4: User Story 2 - Use recent context and measure it (Priority: P1)

**Goal**: Limit context to the 12 newest saved messages in chronological order and report the exact count as `metrics.historyMessages`.

**Independent Test**: Continue a conversation with 15 saved messages using a fake strategy; verify the prompt contains only messages 4 through 15 in chronological order and the response metric is 12. Also verify zero and fewer-than-12 history counts.

### Tests for User Story 2

- [X] T008 [P] [US2] Extend `:memory:` store tests to verify that `lastMessages` returns the newest requested messages in chronological order, including exact-12 and over-12 cases, in `src/store/sqlite-conversation-store.test.ts`.
- [X] T009 [P] [US2] Add service and HTTP tests for zero, fewer-than-12, exactly-12, and over-12 prior messages, asserting prompt order and exact `historyMessages` counts in `src/services/chat-service.test.ts` and `src/http/server.test.ts`.

### Implementation for User Story 2

- [X] T010 [US2] Add `historyMessages` to the chat response metrics in `src/services/chat-service.ts` and `src/http/server.ts`, equal to the selected prior-message count without changing the shared strategy metrics contract (depends on T009).
- [X] T011 [P] [US2] Update the response example and history-count contract in `specs/007-conversation-persistence/contracts/chat-api.md` and the verification expectations in `specs/007-conversation-persistence/quickstart.md`.

**Checkpoint**: Every successful chat response reports the number of prior messages supplied to the strategy, from 0 through 12.

---

## Phase 5: User Story 3 - Reject an invalid conversation reference (Priority: P2)

**Goal**: Reject malformed identifiers as invalid input and unknown identifiers as not found, without invoking the strategy or creating a replacement conversation.

**Independent Test**: Submit an empty identifier and an unknown non-empty identifier; verify the respective client errors and confirm the fake strategy is not called.

### Tests for User Story 3

- [X] T012 [US3] Add HTTP tests for malformed and unknown `conversationId` values, asserting 400/404 responses and zero strategy calls in `src/http/server.test.ts`.

### Implementation for User Story 3

- [X] T013 [US3] Validate optional `conversationId` as a non-empty string and map unknown conversation references to a not-found response without creating a new conversation in `src/http/server.ts` and `src/services/chat-service.ts` (depends on T012).

**Checkpoint**: Invalid and unknown references fail clearly and do not execute a strategy.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the complete feature and keep the quickstart accurate.

- [X] T014 Update the final focused test paths and expected results in `specs/007-conversation-persistence/quickstart.md`.
- [X] T015 Run `npm run typecheck` and `npm test` from the repository root using the scripts in `package.json`; resolve any failures in the feature files before completion (depends on T014).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No changes required; project tooling is already configured.
- **Foundational (Phase 2)**: T001 defines types and the store boundary; it blocks all feature work.
- **User Story 1 (Phase 3)**: Depends on T001. T002-T004 add independent tests; T005-T006 implement the store and service after their tests; T007 integrates both.
- **User Story 2 (Phase 4)**: Depends on User Story 1 because it refines the shared context and response behavior.
- **User Story 3 (Phase 5)**: Depends on User Story 1 and the response path from User Story 2.
- **Polish (Phase 6)**: T014 follows the API contract update in T011; T015 follows all implementation and documentation tasks.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after T001; delivers persistent creation and continuation.
- **User Story 2 (P1)**: Follows User Story 1; adds precise history-window and metric verification.
- **User Story 3 (P2)**: Follows the chat integration; adds malformed/unknown-reference handling.

### Within Each User Story

- Add or update tests before implementation, then confirm they fail for the missing behavior.
- Implement the storage boundary before code that depends on it.
- Keep each story testable with a fake strategy and isolated storage; no external model or network is needed.
- Run the project-wide typecheck and test suite after all story work.

### Parallel Opportunities

- After T001, T002, T003, and T004 can be authored in parallel because they touch distinct test files.
- After those tests, T005 and T006 can be implemented in parallel because the store and service use the shared interface but occupy distinct files.
- In User Story 2, T008 and T009 can be authored in parallel; T011 can be updated independently of the service implementation.
- User stories themselves are sequential because they refine the same store/service/HTTP flow and response contract.

## Parallel Example: User Story 1

```text
After T001:
Task: Add SQLite persistence tests in src/store/sqlite-conversation-store.test.ts
Task: Add application-service tests in src/services/chat-service.test.ts
Task: Add HTTP integration tests in src/http/server.test.ts

After those tests are in place:
Task: Implement SqliteConversationStore in src/store/sqlite-conversation-store.ts
Task: Implement ChatService in src/services/chat-service.ts
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete T001.
2. Add and run the User Story 1 tests (T002-T004), confirming the new cases fail before implementation.
3. Implement storage and chat composition (T005-T006), then wire `/chat` and production lifecycle (T007).
4. Validate that a returned conversation ID can be reused and that saved context survives store reopening.

### Incremental Delivery

1. User Story 1 establishes persistent conversation continuity.
2. User Story 2 verifies the 12-message window and exposes `historyMessages`.
3. User Story 3 adds explicit errors for malformed and unknown conversation references.
4. Run T015 after the final story and documentation updates.

## Notes

- `[P]` indicates tasks in different files with no unfinished dependency.
- Story labels map to the user stories in `spec.md`.
- Task IDs are sequential; dependencies are also stated in the task text and graph above.
- All tasks use the repository's existing Node.js/TypeScript tooling; no dependency or package-script changes are planned.

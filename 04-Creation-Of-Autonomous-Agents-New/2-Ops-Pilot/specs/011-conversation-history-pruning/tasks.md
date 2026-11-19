---

description: "Task list for conversation history pruning"
---

# Tasks: Conversation History Pruning

**Input**: Design documents from `/specs/011-conversation-history-pruning/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/chat-context-pruning.md`, `quickstart.md`

**Tests**: Included because the specification requires a fake summarizer and the project
constitution requires tests for every new logic path.

**Organization**: Tasks are grouped by user story after shared persistence foundations.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with another task in the same phase because it edits separate files
  and has no dependency on that task.
- **[Story]**: User-story label for tasks in a user-story phase.
- Every task names the exact source or test path it changes.

## Phase 1: Setup

**Purpose**: Project initialization.

The existing Node.js 24, TypeScript, SQLite, Zod, `node:test`, and `tsx` configuration supports
this feature; no dependency or project setup change is needed.

---

## Phase 2: Foundational

**Purpose**: Add validated summary persistence and chronological cursor access required by both
user stories.

- [X] T001 Add failing in-memory and reopen tests for summary read/upsert and cursor queries,
  validating `conversationId: Non-empty; primary key`, `summary: Non-empty string`,
  `coveredThroughMessageId: Non-empty identifier of a message in the same conversation`, and
  `updatedAt: ISO datetime` in `src/store/sqlite-conversation-store.test.ts`.
- [X] T002 Implement the `ConversationSummary` schema and store operations in
  `src/store/conversation-store.ts` and `src/store/sqlite-conversation-store.ts`, preserving the
  field constraints `conversationId: Non-empty; primary key`, `summary: Non-empty string`,
  `coveredThroughMessageId: Non-empty identifier of a message in the same conversation`, and
  `updatedAt: ISO datetime`; create `conversation_summaries`, query messages after a coverage
  cursor, and upsert summary plus cursor atomically.

**Checkpoint**: Summary rows and message coverage can be read, validated, and persisted without
changing or deleting source messages.

---

## Phase 3: User Story 1 - Keep recent context and summarize older history (Priority: P1)

**Goal**: Supply a saved summary and any pending older messages together with the latest eight
prior messages and the current request.

**Independent Test**: Seed a fake conversation store with a summary, pending older messages, and
more than eight prior messages; verify the final strategy receives summary plus correctly ordered
raw history and that `historyMessages` counts only raw prior messages.

### Tests for User Story 1

- [X] T003 Add failing chat-service tests for saved-summary composition, pending older messages,
  the latest eight prior messages in chronological order, the distinct current request, and the
  `historyMessages` count in `src/services/chat-service.test.ts`.

### Implementation for User Story 1

- [X] T004 Implement the eight-message recent window and pass summary separately from raw history
  through context composition in `src/services/chat-service.ts`; include summary and raw messages
  in the conversation-history source and keep `historyMessages` limited to raw prior messages.

**Checkpoint**: A persisted summary can be used without counting it as a raw message or displacing
the current request.

---

## Phase 4: User Story 2 - Refresh and observe a durable summary (Priority: P2)

**Goal**: Refresh summaries only after eight new messages leave the recent window, persist merged
summaries, include them in the triggering request, and report a validated `summarize` event.

**Independent Test**: With a fake summarizer, verify no call or event below the threshold; at the
threshold verify one merged and persisted summary, summary context, event, and usage metrics.
Verify failure leaves the prior summary and cursor unchanged and fails the request.

### Tests for User Story 2

- [X] T005 [P] Add failing fake-summarizer service tests for below-threshold no-op behavior,
  threshold refresh, merging, persistence and reuse, failure without cursor advancement, and
  aggregation of summary-call usage in `src/services/chat-service.test.ts`.
- [X] T006 [P] Add failing tests for the `summarize` trace contract and HTTP response/error behavior
  in `src/agents/trace.test.ts` and `src/http/server.test.ts`; verify
  `messagesSummarized: Positive integer` and `estimatedTokens: Non-negative integer`.
- [X] T007 [P] Add failing tests for the injectable summary adapter's validated output, usage
  extraction, and invalid `summary: Non-empty string` handling in
  `src/services/conversation-summarizer.test.ts`.

### Implementation for User Story 2

- [X] T008 [P] Implement the default `ConversationSummarizer` using the existing model factory,
  a Zod-validated `summary: Non-empty string`, structured output retaining the raw AI message,
  and reported input-token usage in `src/services/conversation-summarizer.ts`.
- [X] T009 [P] Add the strict `summarize` trace schema and deterministic formatter output for
  `messagesSummarized: Positive integer` and `estimatedTokens: Non-negative integer` in
  `src/agents/types.ts` and `src/agents/trace.ts`.
- [X] T010 Implement threshold selection, prior-summary merging, atomic persistence, failure
  propagation, context composition, the `summarize` event, and combined model/context metrics in
  `src/services/chat-service.ts`.
- [X] T011 Expose the optional fake summarizer through `ChatServerOptions` and pass it to the chat
  service so HTTP tests can validate successful events and failed refresh responses in
  `src/http/server.ts`.

**Checkpoint**: Summaries refresh once per eligible batch, persist across requests, and produce a
validated event and complete usage metrics.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature and its documented scenarios.

- [X] T012 Run `npm run typecheck`, `npm test`, and the fake-backed scenarios in
  `specs/011-conversation-history-pruning/quickstart.md`; resolve regressions in the touched paths.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependency changes or initialization tasks are required.
- **Foundational (Phase 2)**: T001 tests precede T002 persistence and block both stories.
- **User Stories (Phase 3+)**: US1 depends on the persistence foundation; US2 depends on US1's
  context composition and shares the summary store.
- **Polish (Phase 5)**: T012 depends on all implementation and test tasks.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; no dependency on US2. It can be verified with a seeded
  summary and fake conversation store.
- **US2 (P2)**: Starts after US1. Its threshold refresh relies on US1's summary-aware context
  composition and the foundational summary persistence.

### Within Each User Story

- US1: T003 tests precede T004 context implementation.
- US2: T005, T006, and T007 edit separate test files and can be prepared in parallel after T004.
- US2 implementation: T008 and T009 edit separate files and can proceed in parallel after their
  tests; T010 depends on both, and T011 depends on T010.
- T012 is last and validates both stories together.

### Parallel Opportunities

- T005 (service lifecycle tests), T006 (trace/HTTP tests), and T007 (summarizer adapter tests) can
  run in parallel after T004.
- T008 (summarizer adapter) and T009 (trace schema/formatter) can run in parallel after the
  corresponding tests.

---

## Parallel Example: User Story 2

```text
Task: T005 fake summarizer lifecycle tests in src/services/chat-service.test.ts
Task: T006 trace and HTTP contract tests in src/agents/trace.test.ts and src/http/server.test.ts
Task: T007 summarizer adapter tests in src/services/conversation-summarizer.test.ts
```

After the tests are in place:

```text
Task: T008 default summarizer adapter in src/services/conversation-summarizer.ts
Task: T009 summarize event schema and formatter in src/agents/types.ts and src/agents/trace.ts
```

## Implementation Strategy

### MVP First

1. Complete T001-T002 for summary persistence and cursor selection.
2. Complete US1 (T003-T004) and validate use of a saved summary with the latest eight messages.
3. Complete US2 (T005-T011) for automatic threshold refresh, persistence, trace, and usage.
4. Run T012 before rollout.

US1 is the first independently testable increment. The practical user-facing MVP includes US2,
because automatic summary creation and persistence are completed there.

### Incremental Delivery

1. Deliver the store foundation and validate cursor and persistence behavior.
2. Deliver US1 and test summary-aware history composition with a seeded summary.
3. Deliver US2 and test the full automatic refresh lifecycle using fakes.
4. Run the full validation commands and quickstart scenarios.

## Notes

- `[P]` tasks edit separate files and have no unresolved prerequisite within their phase.
- User-story labels map tasks to the corresponding specification stories.
- Tests are written before the implementation tasks that make them pass.
- The practical end-to-end MVP includes both US1 and US2.

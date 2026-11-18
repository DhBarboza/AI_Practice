---
description: "Implementation tasks for semantic memory"
---

# Tasks: Semantic Memory

**Input**: Design documents from `/specs/008-semantic-memory/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/chat-api.md](./contracts/chat-api.md),
[quickstart.md](./quickstart.md)

**Tests**: Tests are included because the feature specification explicitly requires semantic
recall to find a fact whose wording has no words in common with the query; the project constitution
also requires tests for new logic paths.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup

**Purpose**: Add the model inference dependency used by the feature.

- [X] T001 Add `@huggingface/transformers` to `package.json` and update `package-lock.json` with the project package manager.

---

## Phase 2: Foundational

**Purpose**: Establish shared memory contracts, local embedding generation, and SQLite persistence
before implementing any user story.

- [X] T002 Define validated memory and embedding schemas plus `MemoryStore` methods `remember(userId, fact): Promise<void>`, `recall(userId, query, k = 3): Promise<Memory[]>`, and `forget(userId, fact): Promise<void>` in `src/memory/memory-store.ts`, preserving these `data-model.md` constraints verbatim: `id` — “Primary key, required, unique”; `user_id` — “Required, non-empty; scopes every memory operation”; `fact` — “Required, non-empty after trimming”; `embedding` — “Required; 384 Float32 little-endian components (1,536 bytes) from the configured model”; `created_at` — “Required; set when the memory is first inserted”.
- [X] T003 Write tests first in `src/memory/embeddings.test.ts` for lazy shared initialization, `pooling: "mean"`, `normalize: true`, output validation, and retry after initialization failure; then implement the `Xenova/all-MiniLM-L6-v2` feature-extraction pipeline in `src/memory/embeddings.ts`.
- [X] T004 Create the idempotent `memories` schema, `user_id` index, prepared statements, row validation, Float32 little-endian BLOB serialization, and injectable `DatabaseSync`/embedder test seams in `src/store/sqlite-memory-store.ts`; use `OPSPILOT_DB` with default `./data/opspilot.db` in production and `:memory:` in tests, preserve the five specified columns and their `data-model.md` constraints: `id` — “Primary key, required, unique”; `user_id` — “Required, non-empty; scopes every memory operation”; `fact` — “Required, non-empty after trimming”; `embedding` — “Required; 384 Float32 little-endian components (1,536 bytes) from the configured model”; `created_at` — “Required; set when the memory is first inserted”.

**Checkpoint**: Shared contracts, embedding generation, and persistence boundary are ready.

---

## Phase 3: User Story 1 - Use relevant memories in chat (Priority: P1)

**Goal**: Recall only the requesting user's top relevant facts and include them as contextual prompt
data without changing existing response or conversation-history behavior.

**Independent Test**: Send a valid `/chat` request with a `userId` and a test memory store that
returns a relevant fact. Verify the selected strategy receives the fact as delimited context; an
empty recall adds no memory section, and missing `userId` is rejected before strategy execution.

### Tests for User Story 1

- [X] T005 [P] [US1] Add deterministic scoring and SQLite recall tests in `src/memory/memory-store.test.ts` and `src/store/sqlite-memory-store.test.ts` for dot-product ranking, a strict score filter `> 0.3` (exclude exactly `0.3`), a maximum of three results, and isolation by `user_id`.
- [X] T006 [P] [US1] Add chat-service tests in `src/services/chat-service.test.ts` for passing recalled facts as delimited contextual data, omitting the memory section for empty recall, and preserving conversation history and response fields.
- [X] T007 [P] [US1] Add HTTP tests in `src/http/server.test.ts` confirming `/chat` rejects a missing or empty `userId`, does not execute the strategy for invalid input, and keeps the existing successful response shape.

### Implementation for User Story 1

- [X] T008 [US1] Implement user-scoped recall and dot-product ranking in `src/memory/memory-store.ts` and `src/store/sqlite-memory-store.ts`; take the top three by descending score, then retain only scores strictly greater than `0.3`.
- [X] T009 [US1] Extend `ChatInput` and the chat strategy context in `src/services/chat-service.ts` to recall by `userId` and add a labeled, delimited memory section only when facts are returned.
- [X] T010 [US1] Require a non-empty `userId` in the strict request schema, inject the memory store into the `/chat` service, and create/close its production SQLite store in `src/http/server.ts` while preserving existing error and response behavior.

**Checkpoint**: `/chat` uses only the requesting user's qualifying memories and remains testable
with a deterministic memory-store test double.

---

## Phase 4: User Story 2 - Remember facts without duplicates (Priority: P2)

**Goal**: Persist user facts and avoid storing a new fact when its similarity to that user's
existing fact is strictly greater than `0.92`.

**Independent Test**: Remember a valid fact twice for one user and verify one matching row remains;
test the exact `0.92` boundary and verify another user can store the same fact independently. Run
the real-model recall case with a semantically related query that shares no words with the fact.

### Tests for User Story 2

- [X] T011 [P] [US2] Add `remember` tests in `src/store/sqlite-memory-store.test.ts` for required non-empty user/fact inputs, persisted user/fact/embedding/creation time, strict similarity `> 0.92` deduplication (including exactly `0.92`), and user isolation.
- [X] T012 [P] [US2] Add a real-model semantic recall test in `src/memory/semantic-recall.test.ts` that remembers “Deployments happen on Tuesdays.” and recalls it for “What weekday are releases scheduled for?” using the local model.

### Implementation for User Story 2

- [X] T013 [US2] Implement `remember(userId, fact)` in `src/store/sqlite-memory-store.ts` to validate inputs, embed the fact, compare only that user's stored vectors, and insert `id`, `user_id`, `fact`, `embedding`, and `created_at` only when no similarity is strictly greater than `0.92`.

**Checkpoint**: Facts can be persisted per user, deduplicated at the specified strict threshold,
and recalled semantically without shared words.

---

## Phase 5: User Story 3 - Forget a stored fact (Priority: P3)

**Goal**: Remove an exact fact only from the requesting user's memory.

**Independent Test**: Remember the same fact for two users, forget it for one, and verify only that
user's row is removed; forgetting a non-existent fact leaves all rows unchanged.

### Tests for User Story 3

- [X] T014 [US3] Add forget tests in `src/store/sqlite-memory-store.test.ts` for exact fact removal, a missing-fact no-op, and preservation of another user's matching fact.

### Implementation for User Story 3

- [X] T015 [US3] Implement `forget(userId, fact)` in `src/store/sqlite-memory-store.ts` with a prepared delete scoped by both `user_id` and exact `fact`; validate both inputs and leave other users' rows unchanged.

**Checkpoint**: A user can remove an exact stored fact without affecting another user's memory.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Keep validation guidance aligned with the implementation and run project-wide checks.

- [X] T016 [P] Update `specs/008-semantic-memory/quickstart.md` with the final focused test command, the real-model semantic example, and the local model-cache/offline prerequisites.
- [X] T017 [P] Run `npm run typecheck` and `npm test` from the repository root using the scripts in `package.json`; resolve any feature-related failures.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on T001; T003 follows T002, and T004 depends on T002 and T003.
- **User Story 1 (Phase 3)**: Depends on Phase 2. T005, T006, and T007 are independent test tasks; T008 follows T005, T009 follows T006 and T008, and T010 follows T007 and T009.
- **User Story 2 (Phase 4)**: Depends on the schema and embeddings from Phase 2 and the recall implementation T008. T011 and T012 can run in parallel; T013 follows both tests.
- **User Story 3 (Phase 5)**: Depends on the Phase 2 schema. Its fixture-based test is independently verifiable, but implementation is scheduled after User Story 2 to avoid concurrent edits to `src/store/sqlite-memory-store.ts` and `src/store/sqlite-memory-store.test.ts`.
- **Polish (Phase 6)**: Depends on all three user stories; T016 and T017 can run in parallel.

### Dependency Graph

```text
T001 → T002 → T003 → T004
                 ├── US1: T005/T006/T007 → T008 → T009 → T010
                 ├── US2: T011/T012 (after T008) → T013
                 └── US3: T014 → T015
                                └── T016/T017 after all stories
```

### User Story Dependencies

- **User Story 1 (P1)**: Starts after the foundational schema and interfaces; it can be tested with a preloaded memory fixture without the `remember` operation.
- **User Story 2 (P2)**: Builds the `remember` capability and real-model recall test on top of the recall contract from User Story 1.
- **User Story 3 (P3)**: The forget operation itself needs only the foundational schema and can be verified with seeded rows; it does not depend on the remember behavior, though its task phase is scheduled after User Story 2 to avoid file conflicts.

### Parallel Opportunities

- T002 follows dependency setup; the embedding task T003 follows the shared memory types from T002.
- T005, T006, and T007 can proceed in parallel after the foundational phase because they target separate test files.
- T011 and T012 can proceed in parallel after T008 because they target separate test files.
- T016 and T017 can proceed in parallel after all user stories.
- User Stories 1 and 2 have a functional dependency for the semantic integration test. User Story 3 is functionally independent but shares the SQLite adapter files, so it is scheduled sequentially.

---

## Parallel Examples

### User Story 1

```text
Task: T005 - recall scoring and SQLite isolation tests in src/memory/memory-store.test.ts and src/store/sqlite-memory-store.test.ts
Task: T006 - prompt-context tests in src/services/chat-service.test.ts
Task: T007 - request validation tests in src/http/server.test.ts
```

### User Story 2

```text
Task: T011 - remember/dedup tests in src/store/sqlite-memory-store.test.ts
Task: T012 - real-model semantic recall test in src/memory/semantic-recall.test.ts
```

### User Story 3

No parallel implementation opportunity: its test and store implementation touch the same SQLite
store files as User Story 2.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational tasks.
2. Complete User Story 1 and validate chat prompt recall with a preloaded memory fixture.
3. Add User Story 2's `remember` operation before demonstrating a full flow that creates and recalls
   a fact; it supplies the normal way to populate the store.
4. Add User Story 3's forgetting operation.

### Incremental Delivery

1. Complete Setup + Foundational → shared model, validation, and persistence boundary ready.
2. Add User Story 1 → validate scoped recall and prompt injection independently.
3. Add User Story 2 → validate persistence, deduplication, and real-model semantic recall.
4. Add User Story 3 → validate exact, user-scoped forgetting.
5. Run quickstart validation, `npm run typecheck`, and `npm test`.

## Notes

- `[P]` tasks touch different files and have no dependency on unfinished work.
- `[US1]`, `[US2]`, and `[US3]` map to the prioritized stories in `spec.md`.
- The real-model semantic test may retrieve model weights on first use; pre-provision the local
  Transformers.js cache for offline test runs.
- No HTTP memory-management routes or automatic agent memory tool are part of this feature.

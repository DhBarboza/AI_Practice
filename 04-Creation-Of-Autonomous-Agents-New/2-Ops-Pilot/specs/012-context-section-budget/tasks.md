---

description: "Task list for context section budget"
---

# Tasks: Context Section Budget

**Input**: Design documents from `/specs/012-context-section-budget/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/context-builder.md`, `quickstart.md`

**Tests**: Included because the specification requires low-cap order tests (FR-010) and the
constitution requires tests for every new logic path.

**Organization**: Tasks are grouped by user story after shared builder schemas and budget parsing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with another task in the same phase because it edits separate files
  and has no dependency on that task.
- **[Story]**: User-story label for tasks in a user-story phase.
- Every task names the exact source or test path it changes.

## Phase 1: Setup

**Purpose**: Project initialization.

The existing Node.js 24, TypeScript, Zod, `estimateTokens`, `node:test`, and `tsx` configuration
supports this feature; no dependency or project setup change is needed.

---

## Phase 2: Foundational

**Purpose**: Add validated section-budget parsing and builder input schemas required by all stories.

- [X] T001 Add failing tests for `loadContextBudgets` in `src/context/context-builder.test.ts`:
  missing or empty env uses `summary: Integer ≥ 0` default `CONTEXT_BUDGET_SUMMARY` = 200,
  `window: Integer ≥ 0` default `CONTEXT_BUDGET_WINDOW` = 1200, and
  `memory: Integer ≥ 0` default `CONTEXT_BUDGET_MEMORY` = 300; non-integer or negative values fail
  and MUST NOT disable the cap.
- [X] T002 Implement `Section Budget` parsing and Zod schemas for Context Builder Input
  (`agentInstructions: String, possibly empty`, `message: Non-empty string`,
  `summary: String or null`, chronological `history`, scored `memories`) and Scored Memory
  Candidate (`fact: Non-empty string`, `score: Finite number`) in
  `src/context/context-builder.ts`.

**Checkpoint**: Budgets and builder inputs validate without assembling or trimming prompt sections.

---

## Phase 3: User Story 1 - Assemble a bounded prompt for every strategy (Priority: P1) 🎯 MVP

**Goal**: One builder formats system, summary, window, memories, and current message and supplies
that prompt to every chat reasoning strategy.

**Independent Test**: Assemble a request whose summary, window, and memories already fit default
caps; verify system and current message are complete and ReAct, Plan-and-Execute, and reflection
receive the same `input` and `contextSources`.

### Tests for User Story 1

- [X] T003 [P] [US1] Add failing builder tests in `src/context/context-builder.test.ts` for
  under-budget assembly: uncut `agentInstructions: String, possibly empty` and
  `message: Non-empty string`, existing section labels, omitted empty sections, and
  `contextSources` matching the assembled prompt.
- [X] T004 [P] [US1] Add failing `composeReasoningStrategy` tests in
  `src/services/chat-service.test.ts` showing every wrapped strategy receives the same budgeted
  prompt and `contextSources`, and `historyMessages` equals `retainedHistory.length`.

### Implementation for User Story 1

- [X] T005 [US1] Implement `buildContext` formatting in `src/context/context-builder.ts` (system,
  summary, chronological window, memories, current message) using default budgets when content
  already fits; return `prompt`, `contextSources`, `retainedHistory`, and `retainedMemories`.
- [X] T006 [US1] Replace `composeContextSources` / `composePrompt` in
  `src/services/chat-service.ts` with `buildContext`; pass scored recall candidates
  (`fact: Non-empty string`, `score: Finite number`) and set `historyMessages` to retained window
  length.

**Checkpoint**: Chat strategies share one assembled prompt; fitting content is unchanged and
uncut.

---

## Phase 4: User Story 2 - Trim overflow in a defined order (Priority: P2)

**Goal**: When a trimmable section exceeds its cap, drop oldest window messages and lowest-scoring
memories first; shorten a last remaining item or the summary; never cut system or current message.

**Independent Test**: Pass deliberately low explicit budgets and oversized fixtures; assert drop
order, last-item shortening, zero-budget omission, and intact system/message text.

### Tests for User Story 2

- [X] T007 [US2] Add failing low-cap tests in `src/context/context-builder.test.ts`: oldest
  window messages drop first; lowest `score: Finite number` memories drop first; equal scores drop
  the later-ranked candidate; summary shortens to its cap; a single remaining window or memory
  item is shortened to fit; budget `0` omits that section; system and current message stay
  complete; `estimateTokens` of each formatted trimmable section is ≤ its cap.

### Implementation for User Story 2

- [X] T008 [US2] Implement overflow handling in `src/context/context-builder.ts`: measure
  formatted sections with `estimateTokens`; drop oldest history while more than one remains;
  drop from the end of score-desc memory order (original index as tie-break); shorten summary or
  the last remaining item so the formatted section fits; omit trimmable sections when budget is 0.

**Checkpoint**: Low caps cut in the specified order without touching system instructions or the
current message.

---

## Phase 5: User Story 3 - Adjust section budgets without changing assembly rules (Priority: P3)

**Goal**: Production assembly reads `CONTEXT_BUDGET_*`; overrides change caps only, not trim
order.

**Independent Test**: Assemble the same oversized inputs with defaults and with lower env
overrides; confirm only numeric caps change and invalid env still fails closed.

### Tests for User Story 3

- [X] T009 [P] [US3] Add failing env-snapshot tests in `src/context/context-builder.test.ts` for
  valid `CONTEXT_BUDGET_SUMMARY`, `CONTEXT_BUDGET_WINDOW`, and `CONTEXT_BUDGET_MEMORY` overrides
  that change section sizes but keep oldest-window and lowest-score-memory order.
- [X] T010 [P] [US3] Add a failing chat-service test in `src/services/chat-service.test.ts` that
  production assembly uses `loadContextBudgets` from the env snapshot rather than hardcoded caps.

### Implementation for User Story 3

- [X] T011 [US3] Wire `buildContext` production calls in `src/services/chat-service.ts` to
  `loadContextBudgets` (`CONTEXT_BUDGET_SUMMARY` = 200, `CONTEXT_BUDGET_WINDOW` = 1200,
  `CONTEXT_BUDGET_MEMORY` = 300 when missing or empty) and keep explicit budgets available for
  tests.

**Checkpoint**: Changing only env caps changes section sizes; trim order and uncut system/message
rules stay the same.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature and documented scenarios.

- [ ] T012 Run `npm run typecheck`, `npm test`, and the targeted commands in
  `specs/012-context-section-budget/quickstart.md`; resolve regressions in the touched paths.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No initialization tasks.
- **Foundational (Phase 2)**: T001 tests precede T002 schemas and block all stories.
- **User Stories (Phase 3+)**: US1 depends on Phase 2; US2 depends on US1 `buildContext`
  formatting; US3 depends on US2 trim rules so env overrides can reuse the same order.
- **Polish (Phase 6)**: T012 depends on all implementation and test tasks.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2. Verifiable with under-budget fixtures and strategy wrappers.
- **US2 (P2)**: Starts after US1. Overflow tests require formatted sections from T005.
- **US3 (P3)**: Starts after US2. Env overrides only make sense once trim order exists.

### Within Each User Story

- US1: T003 and T004 edit separate test files and can proceed in parallel after T002; T005
  precedes T006.
- US2: T007 precedes T008.
- US3: T009 and T010 edit separate test files and can proceed in parallel after T008; T011
  follows both.
- T012 is last.

### Parallel Opportunities

- T003 (builder assembly tests) and T004 (chat-service strategy tests) after T002.
- T009 (env snapshot tests) and T010 (chat-service env wiring test) after T008.

---

## Parallel Example: User Story 1

```text
Task: T003 under-budget assembly tests in src/context/context-builder.test.ts
Task: T004 composeReasoningStrategy tests in src/services/chat-service.test.ts
```

## Parallel Example: User Story 3

```text
Task: T009 env override tests in src/context/context-builder.test.ts
Task: T010 production budget loading test in src/services/chat-service.test.ts
```

## Implementation Strategy

### MVP First

1. Complete T001-T002 for budget parsing and builder schemas.
2. Complete US1 (T003-T006) and validate shared under-budget prompt assembly.
3. Complete US2 (T007-T008) for overflow order.
4. Complete US3 (T009-T011) for env overrides.
5. Run T012 before rollout.

US1 is the first independently testable increment. The practical user-facing MVP includes US2,
because bounded overflow is the reason for the builder.

### Incremental Delivery

1. Deliver validated budgets and builder input schemas.
2. Deliver US1 and test shared assembly with fitting content.
3. Deliver US2 and test low-cap trim order.
4. Deliver US3 and test `CONTEXT_BUDGET_*` overrides.
5. Run typecheck, full tests, and quickstart scenarios.

## Notes

- `[P]` tasks edit separate files and have no unresolved prerequisite within their phase.
- User-story labels map tasks to the corresponding specification stories.
- Tests are written before the implementation tasks that make them pass.
- The practical end-to-end MVP includes US1 and US2.

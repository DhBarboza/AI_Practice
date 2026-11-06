# Tasks: External Provider Status Check

**Input**: Design documents from `/specs/005-check-provider-status/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Tests are required by FR-009 and the project constitution. Use `node:test` through `tsx`
and an injected fake fetch; no test in this feature may access the network.

**Organization**: Tasks are grouped by the prioritized user stories. User Story 2 extends the
provider-status observation introduced for User Story 1 with bounded retry and failure reporting.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with another task in its phase because it edits a different file and
  has no dependency on unfinished work.
- **[Story]**: The user story served by the task (`US1` or `US2`).
- Every task specifies the file it changes or validates.

## Path Conventions

- Single TypeScript project: source and tests are under `src/`; feature design documents are under
  `specs/005-check-provider-status/`.

## Phase 1: Setup

**Purpose**: Confirm project setup assumptions before feature work.

No setup tasks are needed: Node.js 24, TypeScript, Zod, `tsx`, and the repository test/typecheck
commands are already configured in `package.json`.

---

## Phase 2: Foundational

**Purpose**: No shared blocking infrastructure is required; the feature uses existing agent tools,
Zod, Node.js fetch, and test infrastructure.

---

## Phase 3: User Story 1 - Check an external dependency (Priority: P1) 🎯 MVP

**Goal**: Allow the agent to retrieve a compact status observation for GitHub or Cloudflare, using
GitHub when the provider is omitted.

**Independent Test**: With fake fetch, verify both provider URLs and valid one-line observations;
verify omitted provider checks GitHub. Invoke through the tool and confirm it is selectable in
ReAct and plan-and-execute.

### Tests for User Story 1

> Write fake-fetch tests before the corresponding implementation and verify they fail for the
> expected missing behavior.

- [ ] T001 [US1] Add fake-fetch tests for GitHub and Cloudflare endpoint selection, default GitHub, valid status parsing, and one-line output in `src/agents/provider-status.test.ts`

### Implementation for User Story 1

- [ ] T002 [US1] Implement the injectable provider-status service with the two fixed endpoints and Zod validation of non-empty `status.indicator` and `status.description` in `src/agents/provider-status.ts`
- [ ] T003 [US1] Add tool tests for provider default, explicit provider selection, compact output, and tool purpose/parameter descriptions in `src/agents/tools.test.ts`
- [ ] T004 [US1] Add the `check_provider_status` input schema, GitHub default, incident-triage description, and service invocation to `createOpsTools` in `src/agents/tools.ts`
- [ ] T005 [US1] Register `check_provider_status` in plan-and-execute's tool schema, bound-tool list, and execution dispatch in `src/agents/plan-and-execute.ts`

**Checkpoint**: User Story 1 can be independently validated with fake fetch and the tool is
available to both agent strategies.

---

## Phase 4: User Story 2 - Get a usable result when status cannot be checked (Priority: P2)

**Goal**: Bound every request to five seconds, retry only eligible transient failures once, and
return a readable tool result for every final failure without throwing out of the tool.

**Independent Test**: Use fake fetch to simulate timeout/network rejection, HTTP 5xx, other HTTP
errors, malformed JSON, and invalid status objects. Assert eligible failures cause exactly one
retry, terminal failures do not retry, and final failures resolve to readable tool strings.

### Tests for User Story 2

> Write these failure-path tests before implementing retry and final-error handling.

- [ ] T006 [P] [US2] Add fake-fetch tests for timeout/network and 5xx retries, one-retry maximum, no retry for non-5xx HTTP errors, malformed JSON, and invalid/empty status fields in `src/agents/provider-status.test.ts`
- [ ] T007 [P] [US2] Add a tool invocation test proving final provider failures return a readable result instead of rejecting in `src/agents/tools.test.ts`

### Implementation for User Story 2

- [ ] T008 [US2] Add a fresh `AbortSignal.timeout(5000)` per attempt, retry network/timeout and HTTP 5xx failures exactly once, and convert every final failure into a sanitized single-line result in `src/agents/provider-status.ts`

**Checkpoint**: User Story 2 failure paths are independently testable without network access and
never escape the tool as an exception.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify the completed feature against its documented validation procedure and existing
project quality gates.

- [ ] T009 Run the focused provider/tool tests from `specs/005-check-provider-status/quickstart.md`, then run `npm run typecheck` and `npm test` using the scripts in `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No additional work; existing repository setup is used.
- **Foundational (Phase 2)**: No additional work; no shared infrastructure blocks this feature.
- **User Story 1 (Phase 3)**: Can start immediately. T001 precedes T002; T003 precedes T004; T005
  follows tool registration.
- **User Story 2 (Phase 4)**: Depends on the provider service and tool from User Story 1. T006 and
  T007 touch separate test files and can run in parallel; T008 follows those tests.
- **Polish (Phase 5)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No user-story dependencies; delivers the MVP status check.
- **User Story 2 (P2)**: Extends the service and tool from User Story 1 with resilience and
  readable terminal failures; depends on US1's service/tool interface.

### Parallel Opportunities

- The US1 fake-fetch tests precede their service implementation (T001 → T002), and tool tests
  precede tool registration (T003 → T004).
- After US1, T006 and T007 can proceed in parallel because service tests and tool tests are in
  separate files.

---

## Parallel Example: User Story 1

```text
T001: Add service fake-fetch success tests in src/agents/provider-status.test.ts
T002: Implement the injectable provider-status service in src/agents/provider-status.ts
T003: Add tool behavior tests in src/agents/tools.test.ts
T004: Register the tool through createOpsTools in src/agents/tools.ts
T005: Register plan-and-execute support in src/agents/plan-and-execute.ts
```

## Parallel Example: User Story 2

After User Story 1, run:

```text
T006: Add provider service failure-path tests in src/agents/provider-status.test.ts
T007: Add final failure-result tool test in src/agents/tools.test.ts
```

Then complete T008 in `src/agents/provider-status.ts`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001 then T002; verify provider mapping, default selection, validated status, and
   compact formatting with fake fetch.
2. Complete T003 then T004 and T005; verify tool behavior and registration in both agent strategies.
3. Stop and validate the User Story 1 independent test before adding resilience behavior.

### Incremental Delivery

1. Deliver User Story 1 as the useful status-check MVP.
2. Add User Story 2 retry, timeout, and readable failure results; verify all failure paths with fake
   fetch and exact request counts.
3. Complete T009 and require focused tests, typecheck, and the full test suite to pass.

## Notes

- Task labels map directly to the P1 and P2 stories in `spec.md`.
- Every task has a sequential ID, checkbox, required story label where applicable, and an exact
  source, test, or validation-document path.
- `[P]` appears only where tasks can work on different files without unfinished prerequisites.

---

description: "Task list for the OpsPilot MCP server"

---

# Tasks: OpsPilot MCP Server

**Input**: Design documents from `/specs/006-mcp-server/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Integration tests are required by FR-008 and FR-009. Use `node:test` through `tsx` and
the MCP SDK client over a child process.

**Organization**: Tasks are grouped by user story. The shared process-level client harness is
foundational; each story then has its own acceptance tests and implementation work.

## Phase 1: Setup

**Purpose**: Add the runtime SDK and the supported server command.

- [ ] T001 Add `@modelcontextprotocol/sdk` as a runtime dependency and add the `mcp` npm script using `node --env-file-if-exists=.env --import tsx src/mcp/server.ts` in `package.json` and update `package-lock.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Provide a reusable, isolated test-process harness before story-specific tests.

- [ ] T002 Create a stdio-client test helper that launches `npm run --silent mcp` with `OPSPILOT_DB=:memory:` and closes the MCP client and child process in `src/mcp/test-utils.ts`

**Checkpoint**: The SDK dependency and isolated child-process test harness are ready.

---

## Phase 3: User Story 1 - Discover OpsPilot tools (Priority: P1) 🎯 MVP

**Goal**: Start the `opspilot` MCP server over stdio and expose exactly the three requested tools
with their existing metadata and input schemas.

**Independent Test**: Connect through the configured npm command, initialize MCP, list tools, and
verify exact names, descriptions, schemas, and protocol-clean stdout.

### Tests for User Story 1

- [ ] T003 [US1] Add a child-process integration test that initializes the server, asserts the exact three tool names and their metadata, and fails on non-protocol stdout in `src/mcp/server.test.ts`

### Implementation for User Story 1

- [ ] T004 [US1] Implement `opspilot` stdio server composition and lifecycle in `src/mcp/server.ts`, constructing one `SqliteOpsStore`, creating tools from that store, registering only `list_alerts`, `open_incident`, and `resolve_incident` with their existing names/descriptions/Zod schemas, delegating calls to those same tool instances, writing diagnostics only to stderr, and closing the store on shutdown

**Checkpoint**: An MCP client can discover exactly the requested tools and stdout remains usable
as the protocol channel.

---

## Phase 4: User Story 2 - Operate on alerts and incidents (Priority: P1)

**Goal**: Preserve existing operational behavior and errors when the three tools are called via
MCP.

**Independent Test**: Through the child-process MCP client, list alerts, open an incident, resolve
that incident, and verify invalid inputs or domain failures are reported as failed tool calls.

### Tests for User Story 2

- [ ] T005 [US2] Add integration tests for alert listing, incident creation and resolution, invalid arguments, unknown services/IDs, and repeated resolution through MCP in `src/mcp/tools.test.ts`

### Implementation for User Story 2

- [ ] T006 [US2] Ensure tool validation and domain exceptions are returned as failed MCP tool results with clear messages, without false success responses, in `src/mcp/server.ts`

**Checkpoint**: All three tools return their established results and mutations, and failures are
surfaced without being represented as successful calls.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Align the validation guide with the shipped command and run all required checks.

- [ ] T007 Update the launch and verification instructions to match the final `mcp` command and test behavior in `specs/006-mcp-server/quickstart.md`
- [ ] T008 Run `npm run typecheck`, `npm test`, and the quickstart MCP process scenario; resolve any failures in `src/mcp/server.ts`, `src/mcp/server.test.ts`, `src/mcp/tools.test.ts`, or `specs/006-mcp-server/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on T001; blocks the story tests that use the MCP SDK client.
- **User Story 1 (Phase 3)**: Depends on T002; its test is written before the server implementation.
- **User Story 2 (Phase 4)**: Depends on the server and tool registration from T004; its tests precede the error-mapping work in T006.
- **Polish (Phase 5)**: Depends on both stories being implemented.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after the foundational test harness; no dependency on another user story.
- **User Story 2 (P1)**: Depends on User Story 1's MCP entry point and tool registration, then verifies operational calls and error behavior.

### Within Each User Story

- Write and run acceptance tests before implementing the corresponding behavior.
- Keep each test's database isolated with `OPSPILOT_DB=:memory:`.
- Reuse the same process-level test harness and avoid duplicating schemas or tool logic.

### Parallel Opportunities

- No implementation tasks are marked `[P]`: the server discovery test must fail before implementing the shared entry point, while both stories use that single process and tool-registration boundary.
- After T002, test cases can be prepared independently by story, but implementation remains sequential because User Story 2 requires the MCP server established by User Story 1.

---

## Parallel Example: User Story 1

```text
No safe parallel task pair is identified for User Story 1: T003 must first establish the failing
protocol-level acceptance test, then T004 implements the same server boundary.
```

## Parallel Example: User Story 2

```text
No safe parallel task pair is identified for User Story 2: T005 establishes the failing
end-to-end behavior checks, then T006 implements the corresponding error mapping in the server.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001-T002 to add the SDK command and test harness.
2. Complete T003-T004 to implement and verify MCP initialization and exact tool discovery.
3. Stop and validate that the stdio process produces no invalid stdout.

### Incremental Delivery

1. Deliver User Story 1 with a discoverable MCP server.
2. Add User Story 2 call/error verification and ensure behavior matches the existing tools.
3. Update the quickstart and run typecheck and the full test suite.

## Notes

- Every task uses the required checkbox, sequential ID, optional parallel marker, story label where applicable, and explicit file path.
- The MCP adapter must use existing tool metadata, schemas, invocation, and the same store instance; do not add another schema definition.
- Commit boundaries are implementation choices and are not represented as required tasks.

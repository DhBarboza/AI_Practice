# Implementation Plan: Ops Persistence

**Branch**: `004-ops-persistence` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-ops-persistence/spec.md`

## Summary

Implement durable operational data with a SQLite-backed store that satisfies a shared `OpsStore`
contract. Initialize four constrained tables and idempotently seed the Mercadinho scenario, adding
the Auth service required to own its runbook. Inject the persistent store into production agent
composition; keep the in-memory implementation for isolated strategy tests and benchmarks. Extend
agent tools and descriptions, and verify persistence, domain constraints, and tool behavior with
in-memory SQLite tests.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 24 LTS, strict mode

**Primary Dependencies**: Node.js built-in `node:sqlite` (`DatabaseSync`), Zod, LangChain JS,
LangGraph JS, `tsx`; remove unused Sequelize/MySQL dependencies after replacing their definitions.

**Storage**: SQLite file at `OPSPILOT_DB`, default `./data/opspilot.db`; isolated tests use
`:memory:`. The schema contains `services`, `alerts`, `incidents`, and `runbooks`.

**Testing**: `node:test` through `tsx`; focused store/tool tests plus `npm test` and
`npm run typecheck`.

**Target Platform**: Node.js 24 LTS on the project's Linux server/CLI environments.

**Project Type**: TypeScript backend application with HTTP and CLI/agent entry points.

**Performance Goals**: Synchronous local operations over the seeded dataset must complete as
ordinary agent tool calls without perceptible delay; no throughput target is specified.

**Constraints**: All operational data reads and writes use prepared statements with bound values.
Only fixed, static schema DDL and transaction control may use `DatabaseSync.exec()`. Enable
foreign-key enforcement, use SQLite `CHECK` constraints for closed values, and make fixture
insertion repeatable and non-destructive. Create the parent directory for file-backed paths, but
do not attempt to create a directory for `:memory:`. Close the file-backed connection on orderly
application shutdown. Keep database access behind `OpsStore`.

**Scale/Scope**: Six seeded services (the original five plus Auth), six alerts, three runbooks,
incident lifecycle and filters, five operational tools, production HTTP/CLI composition, and the
existing in-memory benchmark path.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Boundary security**: Pass. Validate tool inputs with Zod, describe every field, and bind all
  query values instead of constructing SQL from input.
- **Predictable domain**: Pass. Keep `OpsStore` as the domain boundary and put SQLite access and
  lifecycle in the store/composition edge.
- **Layered architecture**: Pass. Keep domain types and the store contract separate from SQLite
  implementation, agent tools/strategies, and HTTP/CLI composition.
- **Verifiable quality**: Pass. Test store behavior with `:memory:`, keep model/network access out
  of store tests, and run `npm run typecheck` and `npm test`.
- **Versioned specifications**: Pass. Keep plan, research, model, contracts, and validation guide
  under `specs/004-ops-persistence/`.
- **SQLite constraint**: Pass. Use Node.js `node:sqlite`; remove the obsolete MySQL/Sequelize
  implementation and dependencies if no active consumers remain.

No constitution gate violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/004-ops-persistence/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ops-tools.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # Created by /speckit-tasks, not this command
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── index.ts             # Registry factory wired with the supplied OpsStore
│   ├── tools.ts             # Five tools consume OpsStore; describe all input fields
│   ├── tools.test.ts        # Tool integration tests with :memory: SQLite
│   ├── types.ts             # Service tier and incident resolution domain fields
│   ├── store.ts             # OpsStore contract and MemoryOpsStore implementation
│   ├── seed-data.json       # Original five-service and six-alert mock fixture
│   ├── seed-data.ts         # Validated mock fixtures
│   ├── seed.ts              # Initialize and summarize the persistent store
│   ├── react.ts             # Accept injected OpsStore, retain memory default for tests
│   ├── plan-and-execute.ts  # Register and select the new operational tools
│   ├── database.ts          # Retire obsolete Sequelize/MySQL implementation
│   └── database.test.ts     # Retire obsolete Sequelize/MySQL model tests
├── store/
│   ├── sqlite-ops-store.ts  # DatabaseSync store, schema, prepared statements, seed
│   └── sqlite-ops-store.test.ts
├── agents/tools.test.ts     # Uses an in-memory SQLite store
├── http/
│   └── server.ts            # Production composition injects persistent store
├── arena.ts                 # Production CLI composition injects persistent store
└── bench.ts                 # Retains isolated MemoryOpsStore scenarios
```

**Structure Decision**: Extend the current single TypeScript application rather than adding a
second persistence or service project. Keep the existing memory store and domain types in the
agent area, place the requested SQLite adapter under `src/store/`, and construct the persistent
store at production entry points. Tests and benchmark factories continue to inject memory-backed
stores. Remove the unused Sequelize/MySQL model and its tests/dependencies as part of replacing the
obsolete database path; do not retain a parallel production database configuration.

## Complexity Tracking

No constitution exceptions or additional architectural projects are required.

## Design Decisions

- Add a sixth persistent seed service, `Auth`, with ID `svc-auth`, team `platform`, environment
  `production`, and tier `tier-1`. Keep the in-memory mock and benchmark fixture at the original
  five services; add Auth through a SQLite-specific seed record rather than changing the mock.
- Assign tiers to the seed records as follows: Ops API, Checkout, Payments, and Auth use `tier-1`;
  Notifications uses `tier-2`; Background Worker uses `tier-3`.
- Store runbooks as one record per owning service, keyed by the service foreign key. Seed
  conservative, read-only diagnostic guidance for Checkout, Payments, and Auth; destructive
  remediation remains out of scope.
- Keep `npm run seed` as an explicit setup/summary command, but have it construct and close the
  configured SQLite store; seeding itself remains idempotent in the store constructor.
- Store timestamps as ISO-8601 text and map database `resolved_at` to the domain's camel-case
  resolution timestamp. Leave `summary` null unless explicitly supplied.
- Use the incident ID as an opaque stable string generated without depending on process-local
  counters, so IDs remain unique across process restarts. Preserve the existing sequential
  `MemoryOpsStore` behavior for deterministic tests and benchmarks.
- Prepare fixed SQL statements for each allowed status filter; select among the prepared statements
  in code rather than interpolating a status into SQL.
- Treat the user's “six rules” for tool descriptions as six review checks: purpose, when to use,
  parameter descriptions, enum choices, defaults, and result/side effect. Include these checks in
  the tool contract; no separate source for a named six-rule standard exists in the repository.

# Research: Ops Persistence

**Date**: 2026-11-04

## Node.js `node:sqlite` with `DatabaseSync`

**Decision**: Use Node.js 24's built-in `node:sqlite` API. Open the configured file path for
application persistence and `:memory:` for isolated tests. Prepare each data statement once and
bind all values through positional or named parameters. Use static DDL for schema setup, and
explicit transaction statements around seed batches that must be atomic.

**Rationale**: This follows the constitution and avoids an external database server or driver.
`DatabaseSync` supports both file-backed and in-memory databases; `database.prepare()` creates a
`StatementSync` whose `run()`, `get()`, and `all()` methods accept bound parameters. The API is
synchronous, which matches the small local operational dataset and existing synchronous store
interface. Transactions prevent a partially applied seed from becoming visible after an error.

**Alternatives considered**:

- Sequelize/MySQL: rejected because the feature explicitly adopts SQLite and there are no production
  consumers of the existing model definitions.
- String interpolation: rejected because all operational values must be bound and query structure
  must not depend on input.
- A separate migration framework: rejected for this four-table initial schema; idempotent static
  DDL in the adapter constructor meets the specified scope.

**Sources**:

- [Node.js v24 SQLite API](https://nodejs.org/docs/latest-v24.x/api/sqlite.html)
- [`DatabaseSync` constructor and in-memory path](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#new-databasesyncpath-options)
- [`database.prepare()`](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#databasepreparesql-options)
- [Statement binding parameters](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#statement-sync-binding-parameters)

## Schema and seed strategy

**Decision**: Use four tables with foreign keys from alerts, incidents, and runbooks to services.
Use `CREATE TABLE IF NOT EXISTS`, explicit `NOT NULL` and `CHECK` constraints, and stable unique
keys for all seeded records. Insert missing seed fixtures with conflict-safe behavior inside an
explicit transaction; do not update or delete existing operator data during startup.

**Rationale**: The schema enforces closed-domain values even when writes bypass the TypeScript
schemas. Stable fixture keys make constructor-driven seeding repeatable, while non-destructive
inserts preserve operational incident state.

**Alternatives considered**:

- Replacing all seed tables on each startup: rejected because it can erase operational changes.
- Relying only on Zod validation: rejected because constraints are required at the persistence
  boundary as well.

## Existing store contract

**Decision**: Add an explicit `OpsStore` interface and make both the existing `MemoryOpsStore` and
the new `SqliteOpsStore` implement it.

**Rationale**: Although the feature description calls `OpsStore` an existing interface, code
inspection found only the concrete `MemoryOpsStore` class. A shared interface is necessary for
agent tools and strategy factories to accept either persistence implementation without depending
on the memory class.

**Alternatives considered**:

- Keep tool and strategy parameters typed as `MemoryOpsStore`: rejected because production
  composition could not inject the SQLite adapter cleanly.

## Auth association and service tier

**Decision**: Add Auth as a sixth production service (`svc-auth`) so its runbook has an actual
service association. Use the user-selected tier enum `tier-1 | tier-2 | tier-3`; assign Auth,
Checkout, Payments, and Ops API to tier-1, Notifications to tier-2, and Background Worker to
tier-3. Keep the original five-service in-memory fixture unchanged; the SQLite seed adds Auth as a
SQLite-specific fixture.

**Rationale**: The current fixture has no Auth service. The user explicitly selected adding Auth
rather than aliasing another service or leaving the runbook unassociated. Assignments place
customer-facing and identity dependencies in the highest criticality tier without changing alert
or incident severity values.

**Alternatives considered**:

- Associate Auth with Ops API: rejected by user selection.
- Keep Auth as an orphan runbook: rejected because lookup is by service and the relationship would
  be ambiguous.

## Tool-description policy

**Decision**: Review each tool description against six checks: purpose, when to use, parameter
descriptions, enum choices, defaults, and result or side effect. Add a description to every field
schema and use enum schemas for closed input sets.

**Rationale**: The repository does not define a separate named “six rules” document. These checks
make the explicit requirements in FR-010 through FR-012 actionable without inventing an external
standard.

**Alternatives considered**:

- Treat “six rules” as undefined and omit the requirement: rejected because it was explicitly
  included in the feature request.

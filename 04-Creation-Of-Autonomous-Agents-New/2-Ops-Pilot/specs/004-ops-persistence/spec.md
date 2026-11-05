# Feature Specification: Ops Persistence

**Feature Branch**: `004-ops-persistence`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Persistência real de operações: SqliteOpsStore implementa OpsStore via node:sqlite (DatabaseSync), caminho em OPSPILOT_DB (default ./data/opspilot.db); :memory: nos testes; tabelas services, alerts, incidents, runbooks espelhando os tipos atuais do domínio (incidents ganha resolved_at e summary, anuláveis); DDL idempotente; CHECK nos campos fechados (tier, severity, status); seed idempotente do cenário Mercadinho (5 serviços, 6 alertas: 3 firing, 3 resolved; runbooks de checkout/payments/auth); prepared statements em toda query, sem SQL concatenado; novas tools list_incidents(status open | resolved | all, default open) e consultar_runbook(service); injetar SqliteOpsStore na composição, manter mock in-memory para testes e bench; ignorar data/ no Git; revisar descrições das tools pelas 6 regras (open_incident: quando usar; .describe() em todo campo; enums); testar seed, ciclo de incidentes, filtros e CHECKs em :memory:, e executar testes das tools existentes sobre :memory:."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preserve operational data (Priority: P1)

As an OpsPilot operator, I want services, alerts, incidents, and runbooks to remain available
between application runs, so that operational state is not lost when the process restarts.

**Why this priority**: Reliable persistence is the central value of this feature.

**Independent Test**: Initialize an empty store, verify its initial services, alerts, and runbooks,
create and resolve an incident, close and reopen the store, and verify that the records and
resolution state remain available.

**Acceptance Scenarios**:

1. **Given** a new operational database, **When** the application initializes, **Then** it
   contains the five Mercadinho services, six alerts (three firing and three resolved), and
   runbooks for Checkout, Payments, and Auth.
2. **Given** an initialized database, **When** the application initializes again, **Then** the
   seed records are not duplicated and existing incident state is preserved.
3. **Given** an open incident, **When** an operator resolves it, **Then** its status becomes
   resolved, its resolution time is recorded, and its nullable summary remains available.
4. **Given** a database with operational records, **When** the application closes and reopens it,
   **Then** those records, including resolved incident state, remain readable.

### User Story 2 - Investigate incidents and runbooks (Priority: P1)

As an on-call operator, I want the agent to list incidents by status and retrieve the relevant
runbook, so that I can understand current work and follow service-specific operational guidance.

**Why this priority**: Incident filtering and runbook access make persisted operations useful during
an active response.

**Independent Test**: Invoke the tools using a seeded store and incidents in both statuses; verify
the default and each filter, then request runbooks for Checkout, Payments, and Auth.

**Acceptance Scenarios**:

1. **Given** open and resolved incidents, **When** the agent lists incidents without a status,
   **Then** only open incidents are returned.
2. **Given** incidents in both statuses, **When** the agent requests `open`, `resolved`, or `all`,
   **Then** only the matching incidents, or all incidents for `all`, are returned.
3. **Given** a seeded runbook, **When** the agent requests it by service, **Then** the matching
   service's runbook is returned.
4. **Given** an unknown status or a service without a runbook, **When** the agent calls the
   corresponding tool, **Then** it receives a clear input or not-found error rather than an
   unrelated result.

### User Story 3 - Keep behavior reproducible (Priority: P2)

As a maintainer, I want automated tests and benchmarks to use isolated, repeatable operational
stores, so that persistence changes do not make test runs or benchmark scenarios depend on
production data.

**Why this priority**: Isolation protects persistent operational data and preserves the existing
development and benchmark workflows.

**Independent Test**: Run store and tool tests against a temporary in-memory SQLite database, then
run benchmark scenarios with the in-memory mock and verify that their outcomes remain reproducible.

**Acceptance Scenarios**:

1. **Given** a test using an in-memory SQLite database, **When** it creates, lists, and resolves
   incidents, **Then** the test has no dependency on a file-backed or production database.
2. **Given** a benchmark scenario, **When** it runs, **Then** it uses the in-memory mock and does
   not read or modify the persistent operational database.
3. **Given** production application composition, **When** operational tools are created, **Then**
   they use the persistent SQLite-backed store.

### Edge Cases

- Repeated initialization must not duplicate seed data or reset existing operational changes.
- A database file's parent directory may not exist when the application starts; initialization must
  create the required directory or report a clear startup error.
- Invalid closed-domain values for service tier, severity, or status must be rejected by the
  database constraints.
- Resolving a missing or already-resolved incident must preserve the existing domain error behavior.
- An unknown incident filter value must be rejected; `all` is a query filter and not a stored
  incident status.
- A runbook lookup for a service with no runbook must not return another service's runbook.
- In-memory test databases must be isolated from one another and must not create files under
  `data/`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST persist services, alerts, incidents, and runbooks in tables named
  `services`, `alerts`, `incidents`, and `runbooks`, with fields consistent with the existing
  operational domain. Service records MUST also include a `tier` value. Incident records MUST
  include nullable `resolved_at` and `summary` fields.
- **FR-002**: The system MUST initialize the operational schema idempotently when the persistent
  store is constructed; repeated startup MUST NOT remove existing records or duplicate seed
  records.
- **FR-003**: The system MUST constrain service `tier` values to `tier-1`, `tier-2`, or `tier-3`,
  alert severity to `critical`, `warning`, or `info`, incident severity to `critical`, `high`,
  `medium`, or `low`, alert status to `firing` or `resolved`, and incident status to `open` or
  `resolved`. Invalid values MUST be rejected by persistent storage.
- **FR-004**: The system MUST seed the Mercadinho scenario with exactly five services, six alerts
  split evenly between firing and resolved statuses, and runbooks for Checkout, Payments, and Auth.
- **FR-005**: Seed initialization MUST be repeatable without duplicating seed data or overwriting
  operator-created incident records.
- **FR-006**: The system MUST preserve the existing operations-store behavior for listing services
  and alerts, opening incidents for known services, resolving incidents, and listing incidents.
- **FR-007**: Resolving an incident MUST set its status to resolved and record `resolved_at`.
  Incident `summary` MUST remain nullable when no summary is provided.
- **FR-008**: The system MUST provide the `list_incidents` tool, which accepts `open`, `resolved`,
  or `all`, defaults to `open`, and returns only matching incidents.
- **FR-009**: The system MUST provide the `consultar_runbook` tool, which accepts a service and
  returns that service's runbook or a clear not-found result.
- **FR-010**: The `list_alerts`, `open_incident`, `resolve_incident`, `list_incidents`, and
  `consultar_runbook` tools MUST each describe their purpose and when they are appropriate to use.
  `open_incident` MUST explain when an incident should be opened.
- **FR-011**: Every tool input field MUST have a human-readable description, and closed sets of
  accepted input values MUST be represented as enums and documented in the tool descriptions.
- **FR-012**: The tool descriptions MUST communicate required inputs, defaults, and the result or
  operational effect of each tool, as applicable.
- **FR-013**: Production application composition MUST inject and use `SqliteOpsStore`. The
  in-memory mock MUST remain available for tests and benchmark scenarios.
- **FR-014**: Tests MUST be able to create an isolated, seeded in-memory SQLite store. Store
  coverage MUST include seed idempotence, opening/listing/resolving incidents, filters, and
  rejection of invalid closed-domain values.
- **FR-015**: Existing operational tool tests MUST run using an in-memory SQLite database; the
  benchmark MUST continue to run with the in-memory mock.
- **FR-016**: Persistent database location MUST be configurable through `OPSPILOT_DB`, defaulting
  to `./data/opspilot.db`; tests MUST be able to select `:memory:`.
- **FR-017**: The default `data/` directory MUST be excluded from version control.
- **FR-018**: All database queries MUST use prepared statements; the system MUST NOT construct SQL
  queries by concatenating input or values.

### Key Entities *(include if feature involves data)*

- **Service**: An operational service identified by its existing identity and descriptive fields,
  with an added closed `tier` value (`tier-1`, `tier-2`, or `tier-3`).
- **Alert**: A service-related notification with a closed severity and a `firing` or `resolved`
  status.
- **Incident**: A tracked operational event with a service, title, severity, and `open` or
  `resolved` status; `resolved_at` and `summary` may be null.
- **Runbook**: Operational guidance associated with Checkout, Payments, or Auth and retrievable
  by service.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every fresh initialization produces exactly five services, six alerts (three firing
  and three resolved), and one retrievable runbook for each of Checkout, Payments, and Auth.
- **SC-002**: Repeating initialization any number of times does not increase the count of seeded
  records or erase incident data created between initializations.
- **SC-003**: An incident opened, resolved, and queried after reopening the operational store
  retains its identity, status, resolution time, and nullable summary.
- **SC-004**: Incident queries with omitted, `open`, `resolved`, and `all` filters return,
  respectively, only open incidents, only open incidents, only resolved incidents, and all
  incidents.
- **SC-005**: Invalid values for every closed tier, severity, or status field are rejected, while
  all declared enum values are accepted.
- **SC-006**: All operational store and tool tests pass without accessing a file-backed database or
  external network service.
- **SC-007**: Benchmark scenarios continue to use an isolated in-memory mock and produce their
  expected verification outcomes.

## Assumptions

- The added service tier is a closed three-value domain: `tier-1`, `tier-2`, and `tier-3`.
- The existing five Mercadinho service and six alert records remain the source of the seed scenario;
  the implementation assigns each seeded service one of the permitted tier values.
- The runbook seed contains one retrievable record per named service; a specific runbook authoring
  format or operational step content was not supplied.
- Runbook lookup matches a service name without case sensitivity and reports a clear not-found
  result when there is no match.
- Seeding inserts missing fixture records and does not overwrite existing operator data.
- The nullable incident summary remains null unless a summary is explicitly supplied; resolving an
  incident records the time of resolution.
- `src/store/sqlite-ops-store.ts` implements the existing `OpsStore` interface using Node.js
  `node:sqlite` and `DatabaseSync`; the schema is initialized by the store constructor.
- The database uses tables named `services`, `alerts`, `incidents`, and `runbooks`, and all database
  queries use prepared statements rather than concatenated SQL.
- The persistent store uses `OPSPILOT_DB` or the stated default path; tests can select `:memory:`.
- Technical persistence constraints, tool names, and test boundaries are intentionally included
  because they were explicitly specified as part of this infrastructure feature.

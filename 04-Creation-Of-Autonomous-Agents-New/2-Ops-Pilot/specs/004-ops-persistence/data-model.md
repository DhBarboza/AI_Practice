# Data Model: Ops Persistence

## Service

Represents an operational service available to the agent.

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Primary key, required, non-empty |
| `name` | string | Required, unique, non-empty |
| `team` | string | Required, non-empty |
| `environment` | string | Required, non-empty |
| `tier` | enum | Required; `tier-1`, `tier-2`, or `tier-3` |

Seeded production services: Ops API, Checkout, Payments, Notifications, Background Worker, and
Auth. Auth uses `svc-auth`, team `platform`, environment `production`, and tier `tier-1`.
The in-memory mock retains the original five-service fixture; Auth is an additional
SQLite-persistence seed record.

## Alert

Represents a monitoring alert associated with one service.

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Primary key, required, non-empty |
| `service` | string | Required service reference, returned as the service name |
| `title` | string | Required, non-empty |
| `severity` | enum | Required; `critical`, `warning`, or `info` |
| `status` | enum | Required; `firing` or `resolved` |

There are exactly six seed alerts, three firing and three resolved. The database references the
service by its ID; the existing domain-facing representation continues to expose its name.

## Incident

Represents an operator-created event associated with one service.

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Primary key, required, unique across restarts |
| `title` | string | Required, non-empty |
| `service` | string | Required service reference, returned as the service name |
| `severity` | enum | Required; `critical`, `high`, `medium`, or `low` |
| `status` | enum | Required; `open` or `resolved` |
| `resolved_at` / `resolvedAt` | ISO-8601 string or null | Null while open; set on resolution |
| `summary` | string or null | Optional incident summary; null when absent |

Resolution transition:

```text
open (resolved_at = null) -> resolved (resolved_at = resolution time)
```

Resolving an unknown or already resolved incident continues to raise the existing domain errors.

## Runbook

Represents read-only operational guidance associated with one service.

| Field | Type | Constraints |
|---|---|---|
| `service_id` | string | Primary key and required foreign key to `services.id` |
| `title` | string | Required, non-empty |
| `content` | string | Required, non-empty |

Seed one runbook each for Checkout, Payments, and Auth. Service lookup is case-insensitive by
service name, and a service without a runbook produces a clear not-found error. Seed guidance is
limited to safe initial diagnostics and escalation; automated destructive remediation is not part
of this feature.

## Relationships and persistence constraints

- A service can have many alerts and incidents.
- A service can have at most one seeded runbook; runbooks cannot reference an unknown service.
- Foreign keys are enabled on the SQLite connection.
- Service tier, alert severity/status, and incident severity/status are checked by SQLite
  constraints in addition to Zod/domain validation.
- `resolved_at` and `summary` are nullable; all other listed fields are non-null.
- The database uses tables `services`, `alerts`, `incidents`, and `runbooks`; it adds no separate
  seed metadata table.

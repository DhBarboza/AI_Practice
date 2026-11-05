# Operational Store and Tool Contracts

## Operations store

Both `MemoryOpsStore` and `SqliteOpsStore` implement the same `OpsStore` contract. Returned domain
records are validated and do not expose mutable store internals.

| Operation | Contract |
|---|---|
| `listServices()` | Return all services with `id`, `name`, `team`, `environment`, and `tier`. |
| `listAlerts(status?)` | Return all alerts when omitted or `all`; otherwise filter by `firing` or `resolved`. |
| `openIncident(title, service, severity)` | Create an open incident for a known service; reject invalid input and unknown services. |
| `resolveIncident(id)` | Transition an open incident to resolved and set its resolution timestamp; reject unknown/already resolved IDs. |
| `listIncidents(status?)` | Return all incidents when omitted or `all`; otherwise filter by `open` or `resolved`. |
| `getRunbook(service)` | Return the case-insensitive service match or raise a not-found domain error. |

`SqliteOpsStore` exposes `close()` for its connection lifecycle; it is not a domain operation on the
`OpsStore` interface. Application owners close it during orderly shutdown, and tests close it in
cleanup.

The SQLite implementation uses a file path from `OPSPILOT_DB` or `./data/opspilot.db`; its
constructor accepts `:memory:` for isolated tests. `resolved_at` is mapped to the domain's
`resolvedAt` field.

## Agent tools

Every tool description states its purpose and when it is useful. Every input field has a Zod
`.describe()` string. Closed inputs use enums, and descriptions disclose their values, defaults,
and effects/results.

| Tool | Input | Behavior |
|---|---|---|
| `list_alerts` | Optional `status`: `firing`, `resolved`, `all` | Defaults to all alerts; use to inspect monitoring state. |
| `open_incident` | `title`, `service`, `severity`: `critical`, `high`, `medium`, `low` | Opens an incident for a known service; use when an alert or reported production issue requires tracked response. |
| `resolve_incident` | `id` | Resolves an open incident; use only after the response is complete. |
| `list_incidents` | Optional `status`: `open`, `resolved`, `all` | Defaults to open incidents; use to review active or historical incident work. |
| `consultar_runbook` | Required `service` | Returns the service's runbook; use for operational guidance during investigation. |

Invalid tool input is rejected by schema validation. Unknown services/incidents and repeated
resolution surface domain errors; a missing runbook surfaces a clear not-found error. Tool outputs
are serialized validated domain records or the existing iteration-limit result.

## Production and test composition

- HTTP and CLI production entry points construct one file-backed `SqliteOpsStore` and inject it
  into their strategies.
- Tests explicitly construct `SqliteOpsStore(':memory:')` for tool and persistence behavior.
- Strategy unit tests and benchmark factories may continue to inject `MemoryOpsStore`.
- The benchmark must not use the production file or mutate persistent operational data.

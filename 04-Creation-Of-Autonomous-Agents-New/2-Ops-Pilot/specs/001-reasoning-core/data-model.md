# Data Model: OpsPilot Reasoning Core

## Service

Represents an operationally monitored service.

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Required, stable primary identifier |
| `name` | string | Required, unique, non-empty |
| `team` | string | Required, non-empty |
| `environment` | string | Required, non-empty |

Relationships: one service has zero or more alerts and incidents.

## Alert

Represents a monitored signal associated with a service.

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Required, stable primary identifier |
| `serviceId` | string | Required, references a known service |
| `title` | string | Required, non-empty |
| `severity` | enum | `critical`, `warning`, or `info` |
| `status` | enum | `firing` or `resolved` |

Relationships: each alert belongs to exactly one service.

Seed invariant: five services and six alerts total; exactly three alerts are `firing` and three are `resolved`. The seed operation is repeatable and leaves this exact dataset, not duplicate rows.

## Incident

Represents an operator-created response to a service issue.

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Required, unique primary identifier |
| `title` | string | Required, non-empty |
| `serviceId` | string | Required, references a known service |
| `severity` | enum | `critical`, `high`, `medium`, or `low` |
| `status` | enum | `open` or `resolved`; new incidents start `open` |

Relationships: each incident belongs to exactly one service. An incident may be resolved once; resolving an unknown incident returns an explicit domain error.

## Reasoning Run

One strategy run for one operator request.

| Field | Type | Constraints |
|---|---|---|
| `input` | string | Required, non-empty after trimming |
| `maxIterations` | integer | Required, positive |
| `answer` | string | Final user-facing response |
| `trace` | ordered trace events | Typed according to the event union below |
| `metrics.llmCalls` | integer | Non-negative model invocation count |
| `metrics.latencyMs` | integer | Non-negative elapsed milliseconds |

The arena creates a separate seeded in-memory store for each strategy run, while giving all selected strategies the same request and iteration setting.

## Trace Event

An ordered event produced during a reasoning run:

- `thought`, `plan`, `critique`, `answer`: `content` string. `thought` is concise decision rationale available to the application, not private hidden chain-of-thought.
- `action`: `tool` name and structured `args`.
- `observation`: `tool` name and textual result or surfaced error.

Supported tool names and argument shapes are specified in [tools.md](./contracts/tools.md). Formatting is stable, ordered, and preserves action arguments.

## Plan Step

One concise instruction in the planner's ordered list. The executor resolves each instruction into exactly one validated tool action:

- `list_alerts`: optional `status` (`firing`, `resolved`, or `all`).
- `open_incident`: required `title`, known `service`, and incident `severity`.
- `resolve_incident`: required existing incident `id`.

Plan steps are executed one at a time. A replan occurs after each executed action. Empty plans terminate; total actions cannot exceed eight or `maxIterations`, whichever is lower.

## State Transitions

- Alert status: `firing` or `resolved` as seeded; listing does not mutate status.
- Incident status: `open` on creation -> `resolved` when a valid resolution operation succeeds.
- Invalid tool input or unknown referenced service/incident produces an explicit error and does not create or alter domain records.

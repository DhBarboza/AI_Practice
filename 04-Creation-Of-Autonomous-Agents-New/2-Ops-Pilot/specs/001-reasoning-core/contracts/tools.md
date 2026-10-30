# Operational Tool Contract

All tool input and output boundaries are validated. Tool calls use a per-run seeded store and do not require MySQL or an LLM.

| Tool | Input | Behavior |
|---|---|---|
| `list_alerts` | `{ status?: "firing" \| "resolved" \| "all" }` | Lists all alerts when status is omitted or `all`, otherwise only matching alerts. Does not mutate state. |
| `open_incident` | `{ title: non-empty string, service: known service name, severity: "critical" \| "high" \| "medium" \| "low" }` | Creates an incident in `open` state and returns it. Unknown services fail explicitly without creating an incident. |
| `resolve_incident` | `{ id: non-empty incident identifier }` | Changes an existing incident from `open` to `resolved` and returns it. Unknown identifiers fail explicitly. |

The primary seed has five services and six varied alerts, exactly three firing and three resolved. Running the seed repeatedly must restore/upsert this known baseline rather than duplicate data.

Each strategy records every attempted invocation as an `action` event with the tool and arguments. Successful results and surfaced tool errors are recorded as `observation` events.

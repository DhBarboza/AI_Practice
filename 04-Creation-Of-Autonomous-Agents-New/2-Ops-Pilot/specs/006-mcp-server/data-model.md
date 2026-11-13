# Data Model: OpsPilot MCP Server

The MCP server introduces no new persisted domain entities. It exposes the existing operational
models through tools and uses the existing `OpsStore` interface.

## Entities

### MCP Server

- **Identity**: `opspilot`
- **Transport**: stdio
- **Lifetime**: One server and one production `SqliteOpsStore` instance per process.
- **Advertised operations**: Exactly `list_alerts`, `open_incident`, and `resolve_incident`.

### Operational Tool

The MCP tool metadata and inputs are taken from the corresponding existing LangChain tool. The
tool's handler invokes that same tool instance, which is bound to the server's `OpsStore`.

| Tool | Input | Result/effect |
|---|---|---|
| `list_alerts` | Optional `status`: `firing`, `resolved`, or `all`; omitted means all | Validated JSON alert records; no mutation |
| `open_incident` | Required non-empty `title`, known `service`, `severity`: `critical`, `high`, `medium`, or `low` | Creates and returns an open incident |
| `resolve_incident` | Required non-empty open incident `id` | Resolves and returns the incident |

### OpsStore

- **Role**: Existing boundary for operational reads and mutations.
- **Production implementation**: One file-backed `SqliteOpsStore` created for the MCP process.
- **Test implementation**: Integration process selects `:memory:` using `OPSPILOT_DB`.
- **Lifecycle**: Close the persistent store when the server shuts down.

## Validation and state behavior

- Tool argument validation and descriptions are owned by `createOpsTools` and its Zod schemas.
- Tool results continue to pass through the existing output schemas.
- Opening an incident transitions no existing record; it creates an `open` incident for a known
  service.
- Resolving requires an existing open incident and sets its status to `resolved` with a resolution
  timestamp, as defined by the store.
- Unknown services, unknown incident IDs, and repeat resolution preserve existing domain errors.
- MCP transport requests and results follow the SDK protocol; no separate persistent MCP state is
  introduced.

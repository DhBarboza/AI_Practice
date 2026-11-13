# MCP Contract: OpsPilot Tools

## Server and transport

- **Server name**: `opspilot`
- **Transport**: MCP over stdio
- **Output channel**: stdout is reserved for MCP protocol messages. Diagnostics are written to
  stderr; no non-protocol startup or runtime lines are written to stdout.
- **Tool inventory**: Exactly `list_alerts`, `open_incident`, and `resolve_incident`.

## Tool metadata and input

The MCP adapter publishes each existing tool's name, description, and Zod input schema. Existing
descriptions are authoritative for purposes and use; existing schemas define validation,
descriptions, required fields, defaults, and accepted values.

| Tool | Input fields | Behavior |
|---|---|---|
| `list_alerts` | Optional `status`: `firing`, `resolved`, `all`; omitted returns all | Lists matching validated alerts without changing the store |
| `open_incident` | `title`: non-empty string; `service`: non-empty exact name of a known service; `severity`: `critical`, `high`, `medium`, or `low` | Creates and returns an open incident |
| `resolve_incident` | `id`: non-empty ID of an open incident | Resolves and returns the updated incident |

Inputs outside the existing schemas are rejected. Tool failures preserve the existing validation
and domain error behavior and must not be presented as successful results.

## Result mapping

- Existing tool results are returned as MCP text content.
- `list_alerts` returns the existing JSON serialization of validated alert records.
- `open_incident` and `resolve_incident` return the existing JSON serialization of validated
  incident records.
- Input validation, unknown service/incident, and already-resolved incident failures are surfaced
  as failed tool calls with clear messages.

## Shared store

All three registered tools are created from one `createOpsTools(store)` result with the same
`OpsStore` instance. The MCP adapter must not reimplement tool operations or introduce independent
schemas.

# Quickstart: Validate the MCP Server

## Prerequisites

- Node.js 24 LTS
- Project dependencies installed
- No external network service is required for MCP tool tests

## Run automated verification

From the OpsPilot project directory:

```sh
npm run typecheck
npm test
```

The MCP integration test starts the configured `mcp` npm script as a child process with
`OPSPILOT_DB=:memory:`, connects using the MCP stdio client, and closes the client and child
process during cleanup. It verifies:

1. The server initializes and advertises exactly `list_alerts`, `open_incident`, and
   `resolve_incident`.
2. The schemas and descriptions are present in the tool list.
3. Calls to list alerts, open an incident, and resolve that incident return the expected outcomes.
4. The child process does not write non-protocol output to stdout.

## Start the server manually

```sh
npm run mcp
```

The command loads `.env` if present before starting the server. Connect an MCP client using stdio;
do not treat stdout as a shell log stream.

## Expected results

- Initialization succeeds and tool discovery returns the exact three-tool inventory.
- `list_alerts` returns the same validated alert result as the existing operational tool.
- A known service can be used to create an incident, which can then be resolved through the
  advertised MCP tool.
- Invalid inputs and domain failures are reported as failed tool calls, not successful results.
- Any diagnostics appear only on stderr; stdout contains protocol messages only.

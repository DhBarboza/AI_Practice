# Research: OpsPilot MCP Server

## SDK and stdio server API

- **Decision**: Use the `@modelcontextprotocol/sdk` v1 server API: `McpServer` from
  `@modelcontextprotocol/sdk/server/mcp.js` and `StdioServerTransport` from
  `@modelcontextprotocol/sdk/server/stdio.js`; connect the server to the stdio transport.
- **Rationale**: This is the documented TypeScript SDK pattern for a stdio MCP server. SDK v1.32.2
  supports Zod 4 and accepts Zod schemas for registered tool inputs.
- **Alternatives considered**: A lower-level protocol server would add lifecycle and request
  dispatch work without adding value for this small server. The newer SDK v2 API is not used
  because the current v1 `McpServer` API directly supports this project's installed Zod 4.
- **Sources**:
  - [TypeScript SDK server guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/1.32.2/docs/server.md)
  - [McpServer.registerTool API](https://github.com/modelcontextprotocol/typescript-sdk/blob/1.32.2/src/server/mcp.ts)
  - [SDK Zod compatibility](https://github.com/modelcontextprotocol/typescript-sdk/blob/1.32.2/src/server/zod-compat.ts)

## Existing tool and schema reuse

- **Decision**: Pass each existing LangChain tool's `name`, `description`, and Zod `schema` to MCP
  registration and invoke that same tool from the MCP handler.
- **Rationale**: `createOpsTools(store)` already binds the tool operations to the injected
  `OpsStore`, validates inputs and outputs, and owns the descriptions. Reusing the objects directly
  avoids parallel schema declarations or divergent behavior.
- **Alternatives considered**: Duplicating MCP-side schemas or reimplementing calls against
  `OpsStore` would create a second contract and risk drifting defaults, descriptions, validation,
  and error behavior.
- **Sources**:
  - [OpsPilot existing tools](../../src/agents/tools.ts)
  - [OpsPilot tool tests](../../src/agents/tools.test.ts)

## Stdio safety and diagnostics

- **Decision**: Reserve stdout for MCP frames, route any startup/runtime diagnostics to stderr, and
  avoid all `console.log` calls in the MCP entry point.
- **Rationale**: A stray stdout line is not a valid JSON-RPC frame and can break clients using
  stdio. This also follows the explicit feature requirement.
- **Alternatives considered**: Logging to stdout is incompatible with the stdio transport.
- **Sources**:
  - [TypeScript SDK server guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/1.32.2/docs/server.md)
  - [TypeScript SDK troubleshooting](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/troubleshooting.md)

## Process-level verification

- **Decision**: Use the SDK `Client` and `StdioClientTransport` to spawn the npm `mcp` command,
  request `listTools`, and call each exposed tool; close the client/process during test cleanup.
- **Rationale**: This validates the actual command, transport handshake, advertised contract, and
  end-to-end delegation rather than only testing a registration helper.
- **Alternatives considered**: In-process handler tests do not prove the configured command starts
  correctly or that stdout remains protocol-clean.
- **Sources**:
  - [TypeScript SDK client guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/1.32.2/docs/client.md)
  - [SDK stdio client tests](https://github.com/modelcontextprotocol/typescript-sdk/blob/1.32.2/test/e2e/scenarios/stdio.test.ts)

## Environment loading

- **Decision**: Apply the same Node environment-file loading convention already used by the
  project's HTTP and CLI scripts when defining `mcp`.
- **Rationale**: The production `SqliteOpsStore` reads `OPSPILOT_DB` from the process environment;
  preloading `.env` keeps the server command consistent with existing entry points.
- **Alternatives considered**: A bare `tsx` command would not load `.env` automatically, unlike
  the project's existing `node --env-file-if-exists=.env --import tsx` scripts.
- **Sources**:
  - [OpsPilot package scripts](../../package.json)
  - [SqliteOpsStore configuration](../../src/store/sqlite-ops-store.ts)

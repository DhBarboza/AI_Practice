# Implementation Plan: OpsPilot MCP Server

**Branch**: `006-mcp-server` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-mcp-server/spec.md`

## Summary

Expose OpsPilot's existing `list_alerts`, `open_incident`, and `resolve_incident` LangChain
tools through an MCP stdio server named `opspilot`. Reuse the production `SqliteOpsStore`,
existing tool instances, descriptions, and Zod schemas so that the MCP interface adds no second
definition of operational behavior. Keep stdout exclusively for protocol traffic, load project
environment configuration in the npm command, and verify discovery and operations using an MCP
client connected to a child server process.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 24 LTS, strict mode

**Primary Dependencies**: `@modelcontextprotocol/sdk` v1.32.2, Zod 4, existing
`@langchain/core` operational tools, `tsx`

**Storage**: Existing `OpsStore` interface; production server composition uses one
`SqliteOpsStore` instance, with `OPSPILOT_DB` or the existing default path. Integration tests use
an isolated `:memory:` SQLite store in the child process.

**Testing**: `node:test` through `tsx`; MCP stdio client-process integration test;
`npm run typecheck` and `npm test`

**Target Platform**: Node.js 24 LTS on the project's Linux server and local development
environments

**Project Type**: TypeScript backend application with HTTP, CLI/agent, and MCP entry points

**Performance Goals**: MCP initialization, tool discovery, and local operational tool calls
complete without avoidable network requests or long-running work; no separate numerical latency
target is specified.

**Constraints**: Stdio stdout is protocol-only; diagnostics go to stderr. Advertise exactly the
three requested tool names. Reuse the existing tool instances and schemas. Keep one shared store
instance for the server lifetime and close persistent storage on orderly shutdown.

**Scale/Scope**: One MCP entry point, one npm script, one SDK dependency, and focused process-level
tests for discovery, tool behavior, and stdio cleanliness. No new domain operations or persistence
model.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Boundary security**: Pass. MCP tool inputs are validated using the existing Zod schemas;
  tool results retain the existing output validation. No secrets are added to source or specs.
- **Predictable domain**: Pass. The MCP adapter invokes existing operations and introduces no
  separate domain logic; database access remains behind `OpsStore`.
- **Layered architecture**: Pass. The MCP server is an entry-point/controller adapter that
  composes the existing store and agent tools.
- **Verifiable quality**: Pass. The design includes `node:test` coverage of the real stdio client
  handshake and operational calls, followed by typecheck and full test commands.
- **Versioned specifications**: Pass. Plan and design artifacts remain under
  `specs/006-mcp-server/`.
- **Node/runtime constraint**: Pass. Use Node.js 24 and TypeScript ESM with strict type checking.

No constitution gate violations identified.

## Phase 0: Outline & Research

See [research.md](./research.md). Research confirms the supported SDK v1 stdio server and client
APIs, Zod 4 schema support, and the requirement to keep stdout free of diagnostics. The design
reuses the existing LangChain tool schema, description, and invocation directly.

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md), [contracts/mcp-tools.md](./contracts/mcp-tools.md), and
[quickstart.md](./quickstart.md).

### Design decisions

- Add `src/mcp/server.ts` as a small composition boundary. Construct one `SqliteOpsStore`, pass it
  to `createOpsTools(store)`, and register only the first three operational tools with an MCP
  server whose advertised name is `opspilot`.
- Register each existing tool's `name`, `description`, and Zod `schema` directly with the MCP
  SDK, then invoke that same tool in the handler and return its result as MCP text content. This
  keeps schemas, input defaults, output validation, and domain behavior authoritative in
  `src/agents/tools.ts` rather than duplicating them in the adapter.
- Use `McpServer` and `StdioServerTransport` from the SDK v1 server entry points. Add the SDK as a
  runtime dependency; the same SDK client transport can drive the integration test.
- Follow the repository's existing `.env` loading convention in `package.json`: use
  `node --env-file-if-exists=.env --import tsx src/mcp/server.ts` for the `mcp` script so the
  `OPSPILOT_DB` setting is available before composition.
- Never call `console.log` or write non-protocol data to stdout from the MCP server. Startup and
  runtime diagnostics are written to stderr. Ensure database cleanup on orderly process shutdown
  and propagate startup failures with a non-zero process exit.
- Test by starting the configured npm command as a child process with
  `OPSPILOT_DB=:memory:`, connecting with `Client` and `StdioClientTransport`, and checking the
  exact tool list and schema. Invoke all three tools to verify returned results and shared-store
  mutations, and assert that stdout contains only valid protocol messages.

## Project Structure

### Documentation (this feature)

```text
specs/006-mcp-server/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── mcp-tools.md
├── checklists/
│   └── requirements.md
└── tasks.md                         # Created by /speckit-tasks, not this command
```

### Source Code (repository root)

```text
src/
├── mcp/
│   ├── server.ts                    # MCP stdio composition and lifecycle
│   └── server.test.ts               # Child-process MCP protocol integration
├── agents/
│   ├── tools.ts                     # Authoritative tool schemas, descriptions, behavior
│   └── store.ts                     # OpsStore interface and shared domain operations
└── store/
    └── sqlite-ops-store.ts          # Production persistent OpsStore

package.json                         # mcp script and SDK dependency
package-lock.json                    # Locked dependency update
```

**Structure Decision**: Extend the existing single TypeScript application with a focused MCP
entry point. Keep all operational schemas and behavior in the existing tool layer, and use the
existing SQLite store for production composition. The only new source directory is `src/mcp/`;
no additional service/model layer is needed because the adapter delegates to the existing
application boundary.

## Complexity Tracking

No constitution exceptions or additional architectural projects are required.

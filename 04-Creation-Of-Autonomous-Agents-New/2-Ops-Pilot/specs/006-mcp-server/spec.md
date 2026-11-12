# Feature Specification: MCP Server

**Feature Branch**: `006-mcp-server`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "MCP server do OpsPilot: `src/mcp/server.ts` com `@modelcontextprotocol/sdk`, transport stdio, expondo `list_alerts`, `open_incident` e `resolve_incident`, reutilizando o mesmo `OpsStore` e os mesmos schemas zod das tools existentes (uma única fonte de verdade). Nome do server: `opspilot`. Script npm: `mcp = \"tsx src/mcp/server.ts\"` (se precisar de env, alterar o script e carregá-las antes). REGRA CRÍTICA: nenhum `console.log` no server; no stdio o stdout é o canal do protocolo, e o diagnóstico vai para o stderr. Teste: subir o server e validar a lista de tools."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover OpsPilot tools (Priority: P1)

As an MCP client, I want to connect to OpsPilot and discover its alert and incident tools, so I
can use operational capabilities through the standard tool interface.

**Why this priority**: Tool discovery is necessary for any client to use the server.

**Independent Test**: Start the server as an MCP client process over stdio, complete the protocol
initialization, and verify that the advertised tool names are `list_alerts`, `open_incident`, and
`resolve_incident`.

**Acceptance Scenarios**:

1. **Given** the server is started with the configured npm command, **When** an MCP client
   initializes a stdio session and requests the available tools, **Then** it receives exactly the
   three requested tools with their input definitions.
2. **Given** the server is communicating with a client over stdio, **When** it starts or reports
   diagnostics, **Then** stdout remains valid protocol output and diagnostics are sent to stderr.

### User Story 2 - Operate on alerts and incidents (Priority: P1)

As an on-call operator using an MCP-compatible client, I want the exposed tools to read alerts and
open or resolve incidents against OpsPilot's operational data, so that I can manage incident work
without changing tools or data sources.

**Why this priority**: The server is valuable only when client operations preserve the behavior
already available to OpsPilot.

**Independent Test**: Invoke each advertised tool through the server using a test operational
store; verify the alert results, incident creation, and incident resolution against the same
store.

**Acceptance Scenarios**:

1. **Given** alerts exist in the operational store, **When** a client invokes `list_alerts` with
   an omitted or supported status, **Then** the result follows the existing tool's default and
   filtering behavior.
2. **Given** a known service, **When** a client invokes `open_incident` with valid arguments,
   **Then** the new incident is created in the operational store and returned using the existing
   tool behavior.
3. **Given** an open incident, **When** a client invokes `resolve_incident` with its identifier,
   **Then** the incident is resolved in the operational store using the existing tool behavior.
4. **Given** invalid arguments or a domain error, **When** a client invokes an affected tool,
   **Then** the server returns a clear tool error and does not report a successful operation.

### Edge Cases

- A client sends invalid or incomplete tool arguments; the existing input validation rejects them.
- An incident references an unknown service, an unknown identifier, or an already-resolved
  incident; existing domain errors are surfaced to the client.
- The server encounters a startup or runtime diagnostic; it must not corrupt stdio protocol
  messages with non-protocol output.
- The process is started in an environment that requires configuration; the npm command must load
  the required environment before starting the server.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an MCP server identified to clients as `opspilot`.
- **FR-002**: The server MUST communicate with MCP clients over stdio and advertise exactly the
  `list_alerts`, `open_incident`, and `resolve_incident` tools.
- **FR-003**: The server MUST use the same `OpsStore` instance for its tool operations, so reads
  and mutations access the same operational data source.
- **FR-004**: The server MUST use the existing Zod input schemas for these tools as the sole
  source of truth; it MUST NOT maintain duplicate or divergent schemas for the MCP interface.
- **FR-005**: Each MCP tool MUST preserve the existing tool's argument validation, defaults,
  domain behavior, output, and error semantics.
- **FR-006**: The server MUST provide the npm script `mcp` to start the service. If environment
  loading is required, the script MUST load the required environment before server startup.
- **FR-007**: The server MUST NOT write logs or diagnostics to stdout. Stdout MUST remain reserved
  for MCP protocol traffic, and diagnostics MUST be written to stderr.
- **FR-008**: Automated verification MUST start the server and validate the list of advertised
  tools through the MCP protocol.
- **FR-009**: Automated verification MUST cover calling the three tools against a test store and
  confirm their results and mutations follow the existing tool contracts.

### Key Entities *(include if feature involves data)*

- **MCP Server**: The `opspilot` process that exposes operational capabilities to MCP clients over
  stdio.
- **Operational Tool**: One of `list_alerts`, `open_incident`, or `resolve_incident`, with its
  existing validated arguments and behavior.
- **OpsStore**: The shared operational data source used by the existing tools and the MCP server.
- **MCP Client Session**: A protocol session used to initialize the server, discover tools, and
  invoke them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An MCP client can initialize the server and discover all three requested tools in
  one tool-list response, with no additional tools advertised.
- **SC-002**: Calls to each of the three tools through MCP produce the same validated results and
  operational effects as calls through the existing tool interface.
- **SC-003**: Invalid inputs and domain failures are returned as tool errors in every tested
  failure case, with no false success response.
- **SC-004**: Starting the server and completing tool discovery produces no non-protocol output
  on stdout; any emitted diagnostics appear only on stderr.
- **SC-005**: The documented npm `mcp` command starts the server and completes MCP initialization
  successfully in the supported project environment.

## Assumptions

- The existing operational tools and their shared Zod schemas remain the authoritative contracts;
  this feature adds an MCP entry point rather than changing those contracts.
- The MCP server uses the same operational store composition as the existing production
  application, while tests inject an isolated store to avoid file-backed operational data.
- The requested tool list is intentionally limited to the three named tools; other existing
  operational tools are out of scope.
- The requested server path, SDK, transport, and npm script are explicit project constraints for
  this feature. Environment preloading is needed only if the existing project setup requires it.

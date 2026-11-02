# Feature Specification: Chat HTTP API

**Feature Branch**: `003-chat-http-api`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "POST /chat em src/http/server.ts (ou o padrão do Express): body { message, strategy?, reflect? } validado com zod; default react. Respostas: 200 { answer, trace, metrics }; 400 body inválido (issues do zod); 422 estratégia desconhecida; 504 se estourar o timeout de 180s. Registry em src/agents/index.ts (nome -> estratégia); reflect aplica withReflection. Critérios: body válido sem strategy usa react; inválido retorna 400 com issues zod; strategy desconhecida retorna 422; requisição acima de 180s retorna 504; reflect true aplica withReflection sobre a estratégia escolhida; teste integração com estratégia fake determinística, sem rede."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit a chat request (Priority: P1)

As a client of OpsPilot, I want to send a message to the chat endpoint and receive the selected reasoning strategy's answer, trace, and metrics, so that I can integrate operational reasoning into another application.

**Why this priority**: A working request and response path provides the core value of the HTTP API.

**Independent Test**: Send a valid request through the HTTP application with a deterministic fake strategy and verify a successful response containing its answer, trace, and metrics.

**Acceptance Scenarios**:

1. **Given** a valid request with no strategy specified, **When** it is submitted, **Then** the `react` strategy handles the message and the response is HTTP 200 with `answer`, `trace`, and `metrics`.
2. **Given** a valid request with a known strategy, **When** it is submitted, **Then** the selected strategy handles the message and its result is returned.
3. **Given** a request with `reflect: true`, **When** it is submitted, **Then** the selected strategy is wrapped with reflection before it runs.

### User Story 2 - Receive actionable request errors (Priority: P1)

As a client integrating with OpsPilot, I want invalid requests and unknown strategy names to produce distinct, structured client errors, so that I can correct my request without interpreting a generic server failure.

**Why this priority**: Predictable validation and selection errors are necessary for reliable API integration.

**Independent Test**: Submit invalid bodies and unknown strategy names to the HTTP application and verify the status codes and error details without invoking a reasoning model.

**Acceptance Scenarios**:

1. **Given** a body missing the required message or containing invalid field values, **When** submitted, **Then** the endpoint returns HTTP 400 and includes the validation issues.
2. **Given** a syntactically valid body with an unknown strategy name, **When** submitted, **Then** the endpoint returns HTTP 422.
3. **Given** a body whose optional `reflect` field is not a boolean, **When** submitted, **Then** it is treated as invalid and returns HTTP 400 with validation issues.

### User Story 3 - Bound request execution time (Priority: P2)

As a client waiting for a chat result, I want the request to return a timeout response when reasoning exceeds 180 seconds, so that the client is not left waiting indefinitely.

**Why this priority**: A bounded response time improves client reliability while preserving the reasoning API's core function.

**Independent Test**: Use a deterministic fake strategy that remains pending past a test-configured short deadline and verify the endpoint returns HTTP 504; production behavior uses 180 seconds.

**Acceptance Scenarios**:

1. **Given** a strategy that completes before the deadline, **When** the request is submitted, **Then** the endpoint returns its normal HTTP 200 result.
2. **Given** a strategy that does not complete within 180 seconds, **When** the deadline expires, **Then** the endpoint returns HTTP 504.

## Edge Cases

- Unknown body properties and malformed JSON are rejected as client input errors rather than reaching a strategy.
- An unknown strategy returns 422 without executing any registered strategy.
- The default strategy is used only when `strategy` is omitted; an explicitly supplied unknown or empty value is not silently replaced by the default.
- A timeout response includes no partial answer or success-shaped result.
- Strategy/model errors that are not timeouts remain server errors and are not reported as successful responses.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a `POST /chat` endpoint that accepts a message and optional strategy and reflection settings.
- **FR-002**: The system MUST validate the request body, including `message`, optional `strategy`, and optional boolean `reflect`, before strategy execution.
- **FR-003**: The system MUST use `react` when a valid request omits `strategy`.
- **FR-004**: The system MUST return HTTP 400 for invalid request bodies and include the Zod validation issues in the response.
- **FR-005**: The system MUST return HTTP 422 when the request names a strategy not present in the strategy registry.
- **FR-006**: The system MUST return HTTP 200 with exactly the reasoning result fields `answer`, `trace`, and `metrics` when a strategy succeeds.
- **FR-007**: When `reflect` is true, the system MUST apply `withReflection` to the selected registered strategy before running it; when absent or false, it MUST run the selected strategy without reflection.
- **FR-008**: The system MUST return HTTP 504 when strategy execution exceeds the 180-second request deadline.
- **FR-009**: The system MUST provide a strategy registry mapping strategy names to their corresponding reasoning strategies.
- **FR-010**: The system MUST support deterministic integration tests using a fake strategy without network access.

### Key Entities

- **Chat request**: A client message, optional strategy name, and optional reflection choice.
- **Strategy registry**: The available named reasoning strategies from which a request selects one.
- **Reasoning result**: The answer, ordered trace, and metrics returned by a successful strategy execution.
- **Validation issue**: A structured description of a request-body validation failure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every valid request without a strategy selects `react` and returns HTTP 200 with all three required result fields.
- **SC-002**: Every invalid body returns HTTP 400 with the validation issues, and no strategy is invoked.
- **SC-003**: Every unknown strategy returns HTTP 422, and no strategy is invoked.
- **SC-004**: Requests exceeding the 180-second deadline return HTTP 504 instead of waiting indefinitely for a success response.
- **SC-005**: With reflection enabled, the chosen strategy is decorated before execution; with reflection disabled or omitted, it is not decorated.
- **SC-006**: The HTTP integration scenarios pass using a deterministic fake strategy with no external model or network dependency.

## Assumptions

- `message` is required, trimmed, and must contain at least one non-whitespace character.
- `strategy` is a non-empty string when supplied; supported names come exclusively from the runtime registry.
- `reflect` is optional and defaults to false.
- Request bodies are strict: unknown fields are rejected as validation errors.
- The timeout is a server-side wall-clock deadline of 180 seconds. A timeout response does not return a partial strategy result.
- Validation errors use a response object containing an `issues` array derived from Zod; the API does not expose stack traces or secrets.
- Non-validation failures from a strategy are translated to a generic HTTP 500 response without exposing internal details.

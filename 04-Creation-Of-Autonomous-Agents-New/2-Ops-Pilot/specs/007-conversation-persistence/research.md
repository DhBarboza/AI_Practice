# Research: Conversation Persistence

## Decisions

### Reuse the project's SQLite persistence conventions

- **Decision**: Implement `SqliteConversationStore` with Node.js `node:sqlite` and `DatabaseSync`,
  using the existing `OPSPILOT_DB` setting, idempotent DDL, Zod row validation, and prepared
  statements.
- **Rationale**: `SqliteOpsStore` already establishes these project conventions and tests its
  in-memory behavior with `:memory:`.
- **Alternatives considered**: A new database dependency or a separate configuration mechanism
  would duplicate existing infrastructure without adding required capability.

### Keep history orchestration outside agent implementations

- **Decision**: Compose prior user/assistant messages with the current request in a chat service
  before invoking the selected `ReasoningStrategy`.
- **Rationale**: Both existing strategies accept a string-based `ReasoningInput`, while the HTTP
  controller already supports injecting a strategy registry. A service-level composition keeps
  persistence out of individual strategy code and covers both strategies consistently.
- **Alternatives considered**: Reworking each LangChain graph to accept message arrays would spread
  conversation concerns across all strategies and complicate fake-strategy tests.

### Scope and order of persisted history

- **Decision**: Load the newest 12 saved messages and pass that selected set to the strategy in
  chronological order. Append the current user message and assistant answer only after a successful
  strategy result.
- **Rationale**: This implements the specified recent-history window and avoids retaining
  incomplete exchanges after strategy failures.
- **Alternatives considered**: Including the current user message in the saved-history count would
  make `historyMessages` inconsistent with the number of prior messages; older conversation
  messages do not belong in the bounded prompt.

### Keep the history metric at the chat-response boundary

- **Decision**: Add `historyMessages` when constructing the successful chat response, rather than
  changing the shared metrics returned by every strategy.
- **Rationale**: Conversation history is specific to the chat request. The existing strict
  `ReasoningResultSchema` and strategy metrics (`llmCalls`, `latencyMs`) can remain unchanged.
- **Alternatives considered**: Adding a required field to the shared strategy metrics would cause
  unrelated agent, arena, benchmark, and test contracts to change.

### Use an injected store and deterministic test doubles

- **Decision**: Inject `ConversationStore` into chat composition; tests use a SQLite `:memory:`
  store and deterministic fake strategies.
- **Rationale**: This matches existing HTTP test seams and store tests, while avoiding external
  model/network dependencies and file-backed state.
- **Alternatives considered**: Calling a configured production model or sharing a file-backed
  database would make tests nondeterministic and potentially mutate operational data.

## Resolved Technical Context

- No additional dependencies or unresolved technology choices are required.
- Conversation identifiers use the project's existing `randomUUID` pattern with a `conv-` prefix.
- Unknown conversation identifiers are not implicitly converted into new conversations; requests
  with such identifiers return a not-found response as required by the specification.

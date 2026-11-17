# Quickstart: Conversation Persistence

## Prerequisites

- Node.js 24 LTS
- Project dependencies installed
- No model credentials or network access required for the conversation tests

## Validate

Run the focused storage, service, and HTTP tests:

```sh
node --import tsx --test \
  src/store/sqlite-conversation-store.test.ts \
  src/services/chat-service.test.ts \
  src/http/server.test.ts
```

Expected outcomes:

- SQLite persistence and history-order tests pass using an isolated `:memory:` database.
- Chat tests use deterministic fake strategies and make no external requests.
- The HTTP tests verify a returned `conversationId`, successful continuation, 12-message history
  selection, and the matching `historyMessages` value.

Run the project's required verification commands:

```sh
npm run typecheck
npm test
```

Both commands must complete successfully. The public request and response shape is documented in
[contracts/chat-api.md](./contracts/chat-api.md); message fields and ordering are documented in
[data-model.md](./data-model.md).

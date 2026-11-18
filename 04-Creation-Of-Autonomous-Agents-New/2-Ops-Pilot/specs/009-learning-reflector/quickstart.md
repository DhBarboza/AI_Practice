# Quickstart: Learning Reflector

## Prerequisites

- Node.js 24 LTS and project dependencies installed.
- A valid `userId` on chat requests and the existing SQLite-backed semantic memory enabled.
- OpenRouter configuration for live model-backed chat and learning. Deterministic feature tests
  inject the assessor and do not require credentials or network access.

## Validate

Run the focused tests for the reflector and its integration:

```sh
node --import tsx --test \
  --test-name-pattern='learning reflector|chat service|POST /chat passes|forget_preference|forget removes|chat user context' \
  src/memory/learning-reflector.test.ts \
  src/services/chat-service.test.ts \
  src/agents/tools.test.ts \
  src/agents/strategies.test.ts \
  src/store/sqlite-memory-store.test.ts \
  src/http/server.test.ts
```

Expected outcomes:

- A durable, non-secret preference from the latest user message is eventually remembered for that
  user.
- One-off requests, rejected learning results, and credential-like facts are not saved.
- The successful chat response is returned without waiting for learning to complete; learning
  failures do not change that response.
- `forget_preference` removes only the requested user's exact fact and accurately reports a
  no-match. Its model input accepts only `fact`; the active `userId` is trusted chat context, and
  the tool is absent from the default non-chat tool list.
- Existing response fields and user isolation remain unchanged.

Run project-wide verification:

```sh
npm run typecheck
npm test
```

The [learning and tool contracts](./contracts/learning-tools.md) describe the reflector result,
tool arguments, scope, and response compatibility. The [data model](./data-model.md) describes
fact eligibility and lifecycle.

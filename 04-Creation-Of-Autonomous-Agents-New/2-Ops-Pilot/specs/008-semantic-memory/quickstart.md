# Quickstart: Semantic Memory

## Prerequisites

- Node.js 24 LTS
- Project dependencies installed
- A writable `OPSPILOT_DB` SQLite location, or the default `./data/opspilot.db`
- The local `all-MiniLM-L6-v2` model available in the Transformers cache; the first model use may
  need to retrieve the model files before subsequent local inference

No model API credentials are required. Store and chat unit tests use isolated SQLite databases and
deterministic embedding functions; the semantic recall test exercises the real local model. For
offline runs, pre-provision the model files in the configured Transformers.js local model path.

## Validate

Run the focused memory, service, and HTTP tests:

```sh
node --import tsx --test \
  src/memory/memory-store.test.ts \
  src/memory/semantic-recall.test.ts \
  src/store/sqlite-memory-store.test.ts \
  src/services/chat-service.test.ts \
  src/http/server.test.ts
```

Expected outcomes:

- Similar facts for one user are deduplicated only above `0.92`; the same fact can be stored for a
  different user.
- Recall returns no more than three user-scoped facts scoring at least `0.3`, and forgetting a
  fact does not change another user's memories.
- The real-model semantic recall case remembers “Deployments happen on Tuesdays.” and retrieves
  it for “What weekday are releases scheduled for?”, despite having no words in common.
- `POST /chat` rejects requests without `userId` and supplies recalled facts to the selected
  strategy without changing the response shape or conversation-history metrics.

Run the project's required verification commands:

```sh
npm run typecheck
npm test
```

Both commands must complete successfully. The request contract is in
[contracts/chat-api.md](./contracts/chat-api.md); fields and scoring rules are in
[data-model.md](./data-model.md).

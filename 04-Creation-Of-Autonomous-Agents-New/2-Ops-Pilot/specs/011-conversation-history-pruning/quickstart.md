# Quickstart: Conversation History Pruning

## Prerequisites

- Node.js 24 and the project dependencies installed.
- Automated checks use a fake summarizer and do not require provider credentials or network access.

## Automated validation

From the project root:

```sh
npm run typecheck
npm test
```

Expected: both commands pass. Tests cover summary thresholding and merges with a fake summarizer,
SQLite summary persistence, request context composition, the `summarize` trace event, and
failure behavior.

## Targeted summary scenarios

```sh
node --import tsx --test \
  src/services/chat-service.test.ts \
  src/store/sqlite-conversation-store.test.ts \
  src/http/server.test.ts
```

Expected:

- Seven or fewer unrepresented messages outside the recent window do not call the summarizer or
  emit a `summarize` event.
- At least eight such messages cause one merged summary update and one trace event.
- The summary is supplied with the latest eight prior messages; `historyMessages` counts only raw
  prior messages sent to the final answer-producing strategy, excluding the summary and
  summarizer input.
- A failed fake summarizer leaves stored summary and source messages unchanged and fails the
  request explicitly.
- A successful summary call contributes to real usage metrics when the fake provides usage, and
  makes `promptTokens` unavailable when the fake omits it.

For entity and persistence details, see [data-model.md](./data-model.md). For response behavior,
see the [chat context pruning contract](./contracts/chat-context-pruning.md).

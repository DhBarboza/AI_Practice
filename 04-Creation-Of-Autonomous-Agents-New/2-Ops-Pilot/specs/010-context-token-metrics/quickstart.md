# Quickstart: Context Token Metrics

## Prerequisites

- Node.js 24 and the dependencies installed with `npm ci`.
- For the live exercise, a local OpsPilot HTTP server configured with the existing model
  environment variables. Do not print or copy credentials into commands or logs.

## Automated validation

From the project root:

```sh
npm run typecheck
npm test
```

Expected: both commands pass. Tests use synthetic LangChain messages and stub HTTP responses;
they do not require model-provider credentials or network access.

## Live per-turn exercise

1. Start the chat service in one terminal:

   ```sh
   npm run http
   ```

2. In another terminal, run:

   ```sh
   ./conversa-longa.sh
   ```

Expected: the exercise sends multiple turns in one conversation and prints one `promptTokens`
value per successful turn. A turn whose model usage is not reported prints `unavailable`.

## Chat response check

Send a normal `POST /chat` request using the existing request contract. Confirm that:

- `metrics.promptTokens` is an integer backed by complete reported usage, or `null` when usage is
  incomplete.
- `metrics.contextBreakdown.estimated` is `true`.
- `metrics.contextBreakdown.total` equals the sum of source estimates.
- The estimated breakdown is not substituted for `promptTokens`.

See [the chat metrics contract](./contracts/chat-context-metrics.md) and
[the data model](./data-model.md) for field definitions.

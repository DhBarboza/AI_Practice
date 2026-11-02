# Quickstart: Chat HTTP API

## Prerequisites

- Node.js 24 LTS and installed project dependencies.
- For requests using real model-backed strategies: `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.

## Validate offline behavior

```sh
npm test
npm run typecheck
```

Expected outcomes:

- HTTP integration tests use an injected deterministic strategy and make no model-provider calls.
- Tests cover default `react`, strategy selection, reflection decoration, invalid request issues, unknown strategy status, and timeout behavior using an injected short deadline.
- The complete project test suite and strict type-check pass.

## Start the HTTP service

Run the HTTP server with `npm run http`; real strategy requests require the existing OpenRouter environment settings. The service listens on `PORT` or defaults to port `3000` and accepts `POST /chat`.

Example request:

```sh
curl -X POST http://localhost:3000/chat \
  -H 'content-type: application/json' \
  -d '{"message":"List firing alerts"}'
```

Expected successful response: HTTP 200 containing only `answer`, `trace`, and `metrics`. The request schema, response examples, and error status contract are documented in [Chat HTTP Contract](./contracts/chat-http.md).

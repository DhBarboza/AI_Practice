# Quickstart: External Provider Status Check

## Prerequisites

- Node.js 24 LTS.
- Dependencies installed from the repository manifest.
- No OpenRouter credentials or network access are required for focused fake-fetch tests.

## Validate provider status behavior

Run the focused agent tool tests after implementation:

```sh
node --import tsx --test src/agents/provider-status.test.ts src/agents/tools.test.ts
```

Tests must use an injected fake fetch and verify:

1. Successful one-line output for GitHub and Cloudflare, including the default provider.
2. The selected fixed endpoint and a five-second abort signal on each request.
3. One retry and no more for a network failure, timeout, or 5xx response.
4. No retry for non-5xx HTTP errors or invalid JSON/status shapes.
5. A readable final error result without an exception escaping the tool.

These scenarios must not make live status-page requests.

## Validate agent registration and repository

Confirm both ReAct and plan-and-execute can select and execute `check_provider_status`, then run:

```sh
npm run typecheck
npm test
```

Both repository commands must pass. See [contracts/check-provider-status.md](./contracts/check-provider-status.md)
for the tool contract and [data-model.md](./data-model.md) for the observation shape.

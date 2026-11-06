# Research: External Provider Status Check

## Fixed public provider endpoints

- **Decision**: Map `github` to `https://www.githubstatus.com/api/v2/status.json` and `cloudflare`
  to `https://www.cloudflarestatus.com/api/v2/status.json`. Do not accept or construct URLs from
  tool input.
- **Rationale**: These are the exact public endpoints specified for the feature; a closed mapping
  prevents arbitrary destination selection and requires no API key.
- **Alternatives considered**: A configurable URL or authenticated API. Both add complexity and are
  outside the requested feature.
- **Reference**: [Statuspage API documentation](https://developer.statuspage.io/). The feature's
  required public endpoint and `status.indicator` / `status.description` shape are treated as the
  contract; the service will validate that shape at runtime.

## Request timeout and retry behavior

- **Decision**: Give each request its own `AbortSignal.timeout(5000)` signal. Retry once after a
  fetch rejection (including timeout) or an HTTP 5xx response. Do not retry other HTTP failures,
  invalid JSON, or schema-invalid responses.
- **Rationale**: `AbortSignal.timeout(delay)` is available in the Node.js 24 API and aborts the
  signal after the specified delay. Fetch resolves normally for HTTP error responses, so 5xx status
  codes must be classified explicitly. A timeout is a transient request failure for this feature.
- **Alternatives considered**: Retrying every non-success status would retry permanent client
  errors and malformed data without a stated reason. A single overall timeout would prevent the
  specified retry from receiving its own five-second request window.
- **References**:
  - [Node.js 24 `AbortSignal.timeout`](https://nodejs.org/docs/latest-v24.x/api/globals.html#static-method-abortsignaltimeoutdelay)
  - [Statuspage API documentation](https://developer.statuspage.io/)

## Response validation

- **Decision**: Treat parsed response JSON as unknown and validate the nested status object with
  Zod. Require non-empty strings for `indicator` and `description`; do not restrict the indicator
  to an enum.
- **Rationale**: Zod's `safeParse` provides a non-throwing validation result appropriate for
  converting external data failures into tool observations. The spec requires string fields but
  does not specify a closed list of indicator values.
- **Alternatives considered**: Trusting a TypeScript cast does not validate network data. An
  indicator enum could reject a provider's additional/future values unnecessarily.
- **Reference**: [Zod v4 documentation](https://zod.dev/).

## Fetch dependency and tool integration

- **Decision**: Isolate fetch behind a function dependency with the global `fetch` as the production
  default. Keep the tool in `src/agents/tools.ts`. Add it to the existing `createOpsTools` result;
  update plan-and-execute's explicit schema, bound tools, and dispatch as well.
- **Rationale**: Repository tests use `node:test` and construct tools through `createOpsTools`.
  ReAct spreads that factory's tools into LangGraph, while plan-and-execute independently binds
  and dispatches each supported tool. An injected fetch supports deterministic tests without
  network access.
- **Alternatives considered**: Testing only a live endpoint is non-deterministic and violates the
  no-network test requirement. Updating only ReAct would leave plan-and-execute unable to invoke the
  feature.
- **References**: Existing patterns in `src/agents/tools.ts`, `src/agents/tools.test.ts`,
  `src/agents/react.ts`, and `src/agents/plan-and-execute.ts`.

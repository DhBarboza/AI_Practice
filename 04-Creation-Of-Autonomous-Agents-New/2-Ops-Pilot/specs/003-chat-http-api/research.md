# Research: Chat HTTP API

## Decisions

### Build an injectable Express application without listening on import

- **Decision**: Export an application factory from `src/http/server.ts`; allow a strategy registry and request timeout duration to be injected. Keep server listening in an explicit startup path.
- **Rationale**: Express 5 is already installed. An app factory permits deterministic integration tests against a local HTTP server without model calls and prevents test imports from opening a port.
- **Alternatives considered**: Start a server as an import side effect, which makes tests and embedding harder; add a separate HTTP framework, which is unnecessary.

### Centralize base strategy lookup in the agent module

- **Decision**: Export a readonly name-to-strategy registry from `src/agents/index.ts` for the base `react` and `plan-and-execute` strategies. The HTTP app accepts an override registry for tests and composition; the per-request `reflect` option decorates the selected base strategy.
- **Rationale**: The controller needs stable named lookup, while registration remains close to strategy definitions. Reusing the existing built-in strategy instances avoids duplicate model configuration and avoids accidental double reflection.
- **Alternatives considered**: Hard-code name branches in the HTTP route, which duplicates CLI registration and makes fake integration tests awkward; derive names from request input without a registry, which cannot reliably report supported strategies.

### Select and decorate after validating the body

- **Decision**: Parse a strict Zod request body first, resolve the supplied strategy name or default to `react`, then apply `withReflection` to that resolved strategy only when `reflect` is true.
- **Rationale**: This preserves a clear distinction between invalid input (400) and a valid but unsupported strategy (422), prevents strategy execution before validation, and keeps reflection opt-in per request.
- **Alternatives considered**: Treat an unknown strategy as the default, which hides client errors; register reflection only as fixed aliases, which does not implement the request's `reflect` switch over any selected base strategy.

### Translate deadline expiry independently from strategy errors

- **Decision**: Race strategy execution against an injectable wall-clock deadline, defaulting to 180,000 ms; respond with 504 on deadline expiry and generic 500 for other unexpected failures. Do not send a partial result.
- **Rationale**: This provides a deterministic, fast timeout test while preserving the required production threshold. The current strategy interface has no `AbortSignal`, so the HTTP layer can end its wait/response but cannot cancel model or tool work already in progress.
- **Alternatives considered**: Hard-code and wait 180 seconds in tests; map every strategy error to timeout; claim cancellation when strategies do not support it.

### Make service startup explicit and port configuration predictable

- **Decision**: Add an HTTP startup script that runs `src/http/server.ts`; listen on `PORT` when set and otherwise on port `3000`.
- **Rationale**: The project currently has CLI and development entry points but no HTTP listener. An explicit command makes the route runnable without changing the existing CLI.
- **Alternatives considered**: Start listening as a module import side effect; reuse `src/index.ts`, which currently starts the existing application rather than the HTTP API.

### Validate the final strategy result before returning it

- **Decision**: Parse the strategy output with the shared `ReasoningResultSchema` and construct the successful JSON body from exactly `answer`, `trace`, and `metrics`.
- **Rationale**: The result crosses an HTTP trust boundary and the shared schema already expresses the result contract. Selecting fields explicitly prevents accidental leakage of strategy-specific fields.
- **Alternatives considered**: Return arbitrary strategy objects without validation, which can create inconsistent or sensitive API responses.

## Repository Evidence

- `package.json` already includes Express 5, Zod 4, `tsx`, and the test/typecheck commands.
- `src/agents/types.ts` exports `ReasoningInput`, `ReasoningResult`, `ReasoningResultSchema`, and `ReasoningStrategy`.
- `src/agents/reflection.ts` exports `withReflection`.
- `src/arena.ts` already maintains built-in names for `react`, `plan-and-execute`, and their reflective counterparts.
- There is no existing `src/http/` module or `src/agents/index.ts`.

## No Unresolved Research Questions

The project dependencies and existing strategy/reflection contracts determine the HTTP integration points. The timeout's lack of cancellation is explicitly documented as a limitation of the current strategy interface.

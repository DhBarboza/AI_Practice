# Implementation Plan: Chat HTTP API

**Branch**: `003-chat-http-api` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-chat-http-api/spec.md`

## Summary

Expose reasoning through a `POST /chat` endpoint. Keep a named strategy registry in the agent boundary, validate strict request and result shapes with Zod, select `react` by default, optionally decorate the selected strategy with reflection, and translate validation, selection, timeout, and unexpected failures into documented HTTP responses. Build the Express application through a factory that accepts a registry and deadline so deterministic integration tests need neither model credentials nor external services.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 24 LTS, strict mode

**Primary Dependencies**: Express 5, Zod 4, existing `ReasoningStrategy` / `ReasoningResult` types and `withReflection`; no new runtime dependency is required.

**Storage**: None added. Request handling invokes the existing strategy runtime and its isolated in-memory operational state.

**Testing**: `node:test` through `tsx`; use a deterministic fake strategy and a loopback HTTP server or Express app harness for integration coverage, with an injectable short deadline for timeout tests. Run `npm test` and `npm run typecheck`.

**Target Platform**: Node.js HTTP service on Linux

**Project Type**: TypeScript backend application with an Express HTTP interface and existing CLI

**Performance Goals**: Requests have a hard 180-second response deadline in production; no throughput target is specified.

**Constraints**: Strictly validate JSON request bodies and strategy results; preserve exact successful response fields; do not expose stack traces, secrets, or partial results; default strategy is `react`; reflection wraps the selected base strategy only when enabled. The existing strategy contract has no cancellation signal, so a timed-out response deadline cannot promise cancellation of work already running.

**Scale/Scope**: One `POST /chat` route, an exported base strategy-name registry, injectable application dependencies for tests, and an HTTP server entry point using `PORT` or default port 3000; no persistence or authentication changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Security at boundaries**: Pass. Validate request and result boundaries with Zod, use generic 500 responses for unexpected errors, and never expose credentials or internals.
- **Predictable domain**: Pass. The route selects a strategy and translates errors; reasoning behavior remains in strategies and reflection service code.
- **Layered architecture**: Pass. Strategy registry belongs to the agent boundary, HTTP request/response behavior belongs to the controller boundary, and the application factory composes these dependencies.
- **Verifiable quality**: Pass. Deterministic `node:test` integration tests exercise HTTP status and JSON behavior without model access; preserve type-check and full test suite.
- **Versioned specification**: Pass. Design artifacts remain under `specs/003-chat-http-api/`.

No gate violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/003-chat-http-api/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── chat-http.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── agents/
│   └── index.ts
└── http/
    ├── server.ts
    └── server.test.ts
```

**Structure Decision**: Use the existing single TypeScript application. Export the name-to-strategy registry from `src/agents/index.ts`. Put an Express application factory, HTTP server startup, request schemas, and error-to-status translation in `src/http/server.ts`. Keep deterministic HTTP integration tests adjacent in `src/http/server.test.ts`; tests inject a registry with fake `ReasoningStrategy` implementations and a short timeout instead of contacting OpenRouter.

## Complexity Tracking

No constitution exceptions or additional architectural projects are required.

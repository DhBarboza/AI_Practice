# Implementation Plan: External Provider Status Check

**Branch**: `005-check-provider-status` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-check-provider-status/spec.md`

## Summary

Add a read-only `check_provider_status` agent tool for GitHub and Cloudflare. Keep provider URL
selection fixed, use a five-second timeout for each fetch attempt, retry network/timeout and 5xx
failures once, validate the API response with Zod, and turn both success and failure into compact
single-line tool observations. Isolate the fetch dependency so tests use a fake implementation.
Register the tool in both the ReAct and plan-and-execute strategies.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 24 LTS, strict mode

**Primary Dependencies**: Zod 4, `@langchain/core` tools, Node.js built-in `fetch` and
`AbortSignal.timeout`

**Storage**: N/A; provider status is fetched on demand and is not persisted.

**Testing**: `node:test` through `tsx`; focused status/tool tests, `npm run typecheck`, and
`npm test`.

**Target Platform**: Node.js 24 LTS on the project's Linux server and CLI environments.

**Project Type**: TypeScript backend application with HTTP and CLI/agent entry points.

**Performance Goals**: Each outbound request is aborted after five seconds. At most two sequential
requests are made, so a status check takes no more than ten seconds in request timeout periods,
excluding local response parsing and scheduling.

**Constraints**: Use only the two fixed public Statuspage endpoints; no credentials or user-provided
URLs. Retry at most once and only after a network error, timeout, or 5xx response. Validate
untrusted JSON before formatting. Return failures as tool text, without leaking exceptions or
stacks. Keep results compact and on one line.

**Scale/Scope**: One new agent tool, one provider-status service boundary, deterministic fake-fetch
tests, and registration in both agent execution strategies. No persistence, new HTTP route, or
automated remediation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Boundary security**: Pass. Validate tool input and external JSON with Zod; use a fixed provider
  allowlist and fixed URLs; no credentials are needed or exposed.
- **Predictable domain**: Pass. Isolate HTTP fetch as an injected boundary; failures are returned as
  observations as required by the tool contract.
- **Layered architecture**: Pass. Keep provider HTTP/status validation in a small agent service and
  tool schema/description/registration in the agent tool layer. No domain persistence is involved.
- **Verifiable quality**: Pass. Use `node:test` with fake fetch for success, timeout, invalid data,
  retries, and terminal failures; run typecheck and the test suite.
- **Versioned specifications**: Pass. Keep all design artifacts under
  `specs/005-check-provider-status/`.
- **Node/runtime constraint**: Pass. Use Node.js 24 built-in `fetch` and `AbortSignal.timeout`.

No constitution gate violations identified.

## Phase 0: Outline & Research

See [research.md](./research.md). Research confirms the supported Node.js timeout API, Zod's
non-throwing parse path, the public Statuspage response contract, and the repository's two distinct
tool-registration paths. No unresolved technical decisions remain.

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md), [contracts/check-provider-status.md](./contracts/check-provider-status.md),
and [quickstart.md](./quickstart.md).

### Design decisions

- Add a small provider-status service module that accepts an injected fetch implementation and
  returns a formatted tool observation. Keep URL selection, timeout/retry policy, response
  validation, and error-to-result conversion at that boundary.
- Add the LangChain tool in `src/agents/tools.ts`, append it to the tool tuple so existing tuple
  indexes remain stable, and allow the factory to receive the test fetch dependency without
  changing current call sites.
- ReAct uses all tools returned by `createOpsTools`, so registering the new tool there makes it
  available automatically.
- Plan-and-execute requires explicit updates: add the tool to its bound-tool list, input union, and
  execution dispatch. Preserve existing behavior for the five existing tools.
- Use a new timeout signal for every attempt. Retry fetch rejection/timeout and HTTP 5xx exactly
  once; do not retry non-5xx HTTP errors, invalid JSON, or schema-invalid data.
- Collapse whitespace in untrusted status descriptions before constructing the one-line result.
  Return an error observation for every final failure; do not return a success-shaped fallback.
- Test the service and tool with fake responses, including request count, selected URL, timeout
  signal, provider default, response validation, and retry eligibility. No test needs network access.

## Project Structure

### Documentation (this feature)

```text
specs/005-check-provider-status/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── check-provider-status.md
├── checklists/
│   └── requirements.md
└── tasks.md                         # Created by /speckit-tasks, not this command
```

### Source Code (repository root)

```text
src/agents/
├── provider-status.ts               # Fixed provider mapping, injectable fetch, retry/validation
├── provider-status.test.ts          # Fake-fetch service behavior
├── tools.ts                         # Tool schema, description, output and registration
├── tools.test.ts                    # Tool wiring and descriptions
├── react.ts                         # Uses the complete tool list returned by createOpsTools
└── plan-and-execute.ts              # Explicit provider tool schema, binding and dispatch
```

**Structure Decision**: Extend the existing single TypeScript application and agent tool
architecture. Keep external HTTP details in a focused agent service module, expose the capability
through the existing `createOpsTools` factory, and update the second strategy's explicit allowlist
and dispatch. No other project, route, or persistence layer is necessary.

## Complexity Tracking

No constitution exceptions or additional architectural projects are required.

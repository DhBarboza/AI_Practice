# Implementation Plan: Context Token Metrics

**Branch**: `010-context-token-metrics` | **Date**: 2026-11-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-context-token-metrics/spec.md`

## Summary

Add a pure four-characters-per-token estimator and capture real input-token usage from each
answer-affecting LangChain call. Aggregate complete real usage into the chat metrics, or expose it
as unavailable if any call lacks usage metadata. Alongside it, return a distinctly labeled
source-level estimate and print the real per-turn count in `conversa-longa.sh`.

The existing strategy result and chat response schemas are the integration points. ReAct exposes
AI messages in its agent result; structured-output calls in Plan-and-Execute and reflection need
their raw AI messages retained to read usage metadata. Context-source text will be carried to
model-call instrumentation so estimates account for repeated prompts and tool context rather than
only the initial chat input.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 24 LTS, `strict: true`

**Primary Dependencies**: `@langchain/core` 1.3.0, `@langchain/langgraph` 1.5.3,
`@langchain/openai` 1.7.0, Zod 4, Express 5

**Storage**: None; metrics are returned per request and are not persisted.

**Testing**: `node:test` through `tsx`; `npm test` and `npm run typecheck`

**Target Platform**: Linux server and developer CLI

**Project Type**: TypeScript HTTP service with agent workflows and shell entry point

**Performance Goals**: Token estimates add work linear in text length already assembled for the
turn and make no additional model or network calls.

**Constraints**: Real usage comes only from LangChain message usage metadata. Do not present
estimated counts as actual usage. A turn's real aggregate is unavailable if any answer-affecting
model call omits its prompt-token count. Do not persist metrics or change chat request/error
behavior.

**Scale/Scope**: One chat turn, its existing bounded conversation history and all model calls
made by the selected strategy (including reflection); source estimates are aggregated over those
calls.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Boundary Security**: New chat metrics and the long-conversation CLI response are validated
  with existing or shared Zod schemas. The shell entry point delegates response parsing to
  TypeScript rather than trusting unvalidated JSON.
- **Predictable Domain**: The estimator and source aggregation are pure domain logic; LangChain
  usage extraction and HTTP calls remain at integration boundaries.
- **Layered Architecture**: Agent usage is reported through reasoning metrics, composed into chat
  metrics by the chat service, and exposed by the HTTP/CLI edges.
- **Verifiable Quality**: Focused deterministic `node:test` coverage, then `npm run typecheck` and
  `npm test`; no provider calls are required by unit tests.
- **Versioned Specifications**: Design artifacts remain in this feature directory.
- **Persistence constraints**: No persistence change or migration is needed.

**Gate result**: PASS. No constitution exception or additional subsystem is required.

**Post-design gate result**: PASS. The design keeps model usage at agent integration boundaries,
validates HTTP/CLI data with Zod, adds deterministic tests, and requires no persistence or
constitution exception.

## Project Structure

### Documentation (this feature)

```text
specs/010-context-token-metrics/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── chat-context-metrics.md
```

### Source Code (repository root)

```text
src/
├── context/
│   ├── tokens.ts
│   └── tokens.test.ts
├── agents/
│   ├── types.ts
│   ├── helpers.ts
│   ├── react.ts
│   ├── plan-and-execute.ts
│   └── reflection.ts
├── services/
│   └── chat-service.ts
├── http/
│   └── server.ts
└── cli/
    ├── conversa-longa.ts
    └── conversa-longa.test.ts

conversa-longa.sh
```

**Structure Decision**: Extend existing agent, service, and HTTP layers; add the shared pure
estimator under `src/context/`. Put the long-conversation runner behind a TypeScript CLI boundary
and keep the requested root shell script as its launcher. Tests stay alongside source files, in
accordance with the repository's existing `src/**/*.test.ts` test discovery.

## Complexity Tracking

No constitution violations. No additional storage, dependency, or architectural layer is planned.

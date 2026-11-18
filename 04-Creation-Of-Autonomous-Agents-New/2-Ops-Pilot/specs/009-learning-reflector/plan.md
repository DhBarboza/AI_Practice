# Implementation Plan: Learning Reflector

**Branch**: `009-learning-reflector` | **Date**: 2026-11-17 | **Spec**:
[spec.md](./spec.md)

**Input**: Feature specification from
[/specs/009-learning-reflector/spec.md](./spec.md)

## Summary

Assess the latest user message after each successful chat answer with a structured learning result.
Save only non-empty, durable, non-secret facts for the active user through the existing memory
store, without waiting on reflection before returning the answer. Expose a user-scoped
`forget_preference` tool to both chat strategies so users can explicitly remove a saved fact.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 24 LTS, `strict: true`

**Primary Dependencies**: Existing `@langchain/openai`, `@langchain/core`, `@langchain/langgraph`,
and Zod; the configured OpenRouter model is reused for structured learning output.

**Storage**: Existing SQLite `memories` table and `MemoryStore` interface. No new table is needed.
The store's forget operation will return whether an exact user-scoped fact was removed so the
agent tool can report the outcome accurately.

**Testing**: `node:test` through `tsx`; injected learning assessor and memory-store fakes for
service behavior; tool and strategy tests for user scoping; `npm run typecheck` and `npm test`.
No model credentials or live model calls are required for deterministic tests.

**Target Platform**: Node.js 24 LTS on the project's Linux server

**Project Type**: TypeScript backend application with an Express API and LangChain/LangGraph
agents

**Performance Goals**: Learning assessment and persistence must not be awaited by the chat
response path. A delayed or failed learning operation must not change the existing successful
response.

**Constraints**: Assess only the latest user message and only after a successful answer. Validate
the structured result with Zod. Do not store credential-like content or include user message,
candidate fact, or secret content in failure logs. Scope learning and forgetting to the active
`userId`; do not accept identity from model-generated tool arguments.

**Scale/Scope**: One learning assessment per successful chat answer; at most one fact is proposed
per assessment. Use existing memory deduplication and persistence. No public memory endpoint,
new storage table, or durable job queue is included.

## Constitution Check

| Principle / constraint | Plan compliance |
|---|---|
| Boundary Security | Validate model output, candidate facts, and tool input with Zod; reject credential-like content; derive user scope from validated chat context rather than model arguments. |
| Predictable Domain | Keep learning eligibility and failure handling behind a service boundary; do not make background failures look like successful persistence. |
| Layered Architecture | Keep learning assessment and policy in `src/memory/`, chat orchestration in `src/services/`, agent tools in `src/agents/`, and composition in `src/http/`. |
| Verifiable Quality | Test true/false decisions, secret rejection, latest-message-only input, non-blocking response, failure handling, and user-scoped forgetting with `node:test`. |
| Versioned Specifications | Store plan and design artifacts under `specs/009-learning-reflector/`. |
| SQLite/store boundaries | Reuse the `MemoryStore` port and its SQLite adapter; do not add direct SQL to services or tools. |

**Gate result**: PASS. The existing model, memory store, chat service, and agent tool architecture
provide the needed boundaries. No new dependency or public endpoint is required.

## Project Structure

### Documentation (this feature)

```text
specs/009-learning-reflector/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── learning-tools.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── memory/
│   ├── learning-reflector.ts          # Structured learning, eligibility, and safe async start
│   └── learning-reflector.test.ts     # Decisions, secret rejection, and injected model behavior
├── services/
│   ├── chat-service.ts                # Start learning after a successful answer without awaiting it
│   └── chat-service.test.ts           # Last-message input, response independence, and failures
├── agents/
│   ├── types.ts                       # Validated internal user context for agent invocation
│   ├── tools.ts                       # User-scoped forget_preference tool
│   ├── react.ts                       # Register the tool for chat ReAct invocations
│   ├── plan-and-execute.ts            # Plan and execute the same tool for chat invocations
│   ├── index.ts                       # Inject memory store into the chat registry
│   └── tools.test.ts                  # Tool input, deletion result, and user isolation
├── store/
│   ├── sqlite-memory-store.ts         # Return whether exact scoped deletion occurred
│   └── sqlite-memory-store.test.ts    # Forget result and cross-user preservation
└── http/
    ├── server.ts                      # Compose chat learning and the memory-aware registry
    └── server.test.ts                 # Keep the existing HTTP response behavior
```

**Structure Decision**: Extend the existing single-project layout. Reuse the configured model
factory and memory-store boundary. Provide the forget tool through the existing strategy factories
only when a chat's validated `userId` and memory store are available; CLI or other non-chat
invocations remain unchanged. The model receives no user identifier as a tool argument.

## Design Decisions

- Implement a focused learning service in `src/memory/learning-reflector.ts`. Reuse `createModel()`
  and its `withStructuredOutput` pattern with a strict Zod result `{ hasLearning: boolean,
  fact: string | null }`. When `hasLearning` is false, the fact is null; when true, the fact must
  trim to a non-empty string.
- Provide only the latest user message as the assessment input. The assistant answer, conversation
  transcript, operational tool results, and recalled memories are not learning inputs.
- Treat the model decision as a proposal, not authorization to persist. Apply deterministic
  validation to the proposed fact and reject credential-like content in the source message or
  candidate before calling `MemoryStore.remember`. Ask the model to abstain for one-off requests
  and secrets as well. If a candidate is rejected, do not persist or log its content.
- Trigger learning after the strategy result has passed validation and the assistant response has
  been appended. Start the promise without awaiting it; attach an explicit rejection handler that
  records only a safe error category, not the user message or candidate fact. The HTTP success
  shape and conversation metrics remain unchanged.
- Reuse `MemoryStore.remember` for persistence and deduplication. No duplicate policy or schema
  migration is introduced.
- Extend `MemoryStore.forget` to return a boolean indicating whether an exact fact was deleted.
  The SQLite adapter obtains this from the prepared delete result. This lets `forget_preference`
  report not-found without claiming that a deletion succeeded.
- Register `forget_preference` for both chat strategies. Pass `userId` as trusted internal
  invocation context and bind it in the tool closure; the model supplies only the fact to forget.
  Restrict the tool to the exact fact and active user's memory. Do not add it to the public HTTP or
  MCP tool surface.
- Preserve existing chat behavior: learning runs only after a valid successful answer; an
  assessment or save failure does not alter that answer; explicit tool failures remain visible to
  the agent instead of being converted into successful deletion results.

## Constitution Check (Post-Design)

| Principle / constraint | Result |
|---|---|
| Boundary validation and secret handling | PASS — strict Zod result/tool schemas, conservative credential-content rejection, and no secret-bearing logs. |
| Pure domain behavior and isolated side effects | PASS — eligibility policy is isolated from model invocation, memory persistence, and diagnostics. |
| Model / Service / Controller layering | PASS — learner and policy in memory, orchestration in service, tools in agents, composition in HTTP. |
| Required automated validation | PASS — deterministic tests inject the assessor and store; full project checks remain required. |
| Persistence and user isolation | PASS — existing SQLite memory store remains the sole persistence boundary; trusted user context scopes both remember and forget. |
| Response compatibility | PASS — background work is not awaited and adds no response fields. |

**Post-design gate result**: PASS. No unresolved technical choices or constitution violations
remain.

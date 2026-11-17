# Implementation Plan: Conversation Persistence

**Branch**: `007-conversation-persistence` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-conversation-persistence/spec.md`

## Summary

Add persistent conversation history to `POST /chat`. A new application service will resolve or
create a conversation, load at most the 12 latest messages, compose them with the current request
for the selected strategy, and persist the successful exchange. A SQLite-backed
`ConversationStore` will follow the existing `SqliteOpsStore` patterns. The API response will
include `conversationId` and `metrics.historyMessages` without changing the existing answer, trace,
strategy, reflection, or timeout behavior.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 24 LTS, `strict: true`

**Primary Dependencies**: Express 5, Zod 4, Node.js `node:sqlite` (`DatabaseSync`), existing
LangChain/LangGraph strategy interfaces

**Storage**: SQLite database configured through the existing `OPSPILOT_DB` path; add a `messages`
table with prepared statements and idempotent schema initialization

**Testing**: `node:test` through `tsx`; isolated SQLite `:memory:` store tests, deterministic fake
strategy for chat tests, `npm run typecheck`, and `npm test`

**Target Platform**: Node.js server

**Project Type**: Express web service

**Performance Goals**: Retrieve no more than 12 history messages per chat request; preserve the
existing 180-second request timeout

**Constraints**: Validate request and database boundaries with Zod; keep persistence behind a
store interface; preserve existing strategy result fields and behavior; no external model or
network access in tests

## Constitution Check

| Principle / constraint | Plan compliance |
|---|---|
| Boundary Security | Validate `conversationId` and message input at the HTTP boundary; validate stored rows before returning them. |
| Predictable Domain | Keep history selection and prompt composition in the application service; keep SQLite I/O in the store adapter. |
| Layered Architecture | Add a conversation store model, chat service, and HTTP-controller integration. |
| Verifiable Quality | Add focused `node:test` coverage using `:memory:` SQLite and a fake strategy; run typecheck and the full test suite. |
| Versioned Specifications | Keep design artifacts under `specs/007-conversation-persistence/`. |
| SQLite and store boundaries | Use `DatabaseSync`, prepared statements, and an injected `ConversationStore`; do not add another database dependency. |

**Gate result**: PASS. No constitution violations or unresolved technical choices remain.

## Project Structure

### Documentation (this feature)

```text
specs/007-conversation-persistence/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── chat-api.md
```

### Source Code (repository root)

```text
src/
├── agents/
│   └── types.ts                         # Existing strategy result/input contracts
├── http/
│   ├── server.ts                        # Validate request and return conversation fields
│   └── server.test.ts                   # Fake-strategy HTTP integration coverage
├── services/
│   ├── chat-service.ts                  # Resolve/create, compose, invoke, and persist
│   └── chat-service.test.ts             # Application behavior and history-window coverage
└── store/
    ├── conversation-store.ts             # ConversationStore interface and message model
    ├── sqlite-conversation-store.ts      # SQLite implementation and messages schema
    └── sqlite-conversation-store.test.ts # Isolated persistence and ordering coverage
```

**Structure Decision**: Extend the existing single-project `src/` layout. Place orchestration in a
new `src/services/` layer, define the persistence boundary under `src/store/`, and retain HTTP
request/response handling in `src/http/server.ts`. Existing agent strategies remain consumers of
their current string-based input contract; the service composes labeled history into that input.

## Design Decisions

- `ConversationStore` exposes `create`, `append`, and `lastMessages`. `create` produces an opaque
  `conv-`-prefixed UUID. A supplied non-empty identifier is looked up through its saved messages;
  no saved messages means it is unknown.
- `SqliteConversationStore` uses the existing `OPSPILOT_DB` configuration and creates an
  idempotent `messages` table. It validates rows at the storage boundary and uses prepared
  statements for all variable values.
- A new chat gets an identifier from `create`; a resumed chat loads at most 12 prior messages.
  The service orders those messages chronologically, formats them with explicit user/assistant
  labels, and appends the current message as the request's prompt.
- After a successful strategy result, the service appends the current user message and the
  assistant response. Failed strategy executions do not add a completed exchange.
- The service adds the selected history count to the response metrics as `historyMessages`. Keep
  the existing strategy-level metrics contract unchanged; the chat response schema owns this
  chat-specific metric.
- Inject the store through `ChatServerOptions`. Production composition creates the SQLite store
  and closes it with the HTTP server. Tests inject a `:memory:` SQLite store and fake strategies.

## Constitution Check (Post-Design)

| Principle / constraint | Result |
|---|---|
| Boundary validation and secret handling | PASS — Zod validation is used for request and persisted message data; tests need no secrets. |
| Pure domain behavior and isolated side effects | PASS — history composition is isolated from SQLite and HTTP I/O. |
| Model / Service / Controller layering | PASS — store interface/adapter, chat service, and HTTP controller are separated. |
| Required automated validation | PASS — focused tests plus `npm run typecheck` and `npm test` are specified. |
| Persistence and reproducibility | PASS — SQLite remains the persistence engine and tests use an isolated in-memory database. |

**Post-design gate result**: PASS.

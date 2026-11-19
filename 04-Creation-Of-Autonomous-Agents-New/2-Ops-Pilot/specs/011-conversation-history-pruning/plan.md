# Implementation Plan: Conversation History Pruning

**Branch**: `011-conversation-history-pruning` | **Date**: 2026-11-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-conversation-history-pruning/spec.md`

## Summary

Keep the eight most recent prior conversation messages verbatim and use a persisted, approximately
150-token summary for older context. Generate a replacement only after at least eight new
unrepresented messages have left the recent window; merge them with the prior summary, persist the
coverage cursor, and add a structured `summarize` trace event. Inject a fake summarizer for
deterministic tests. Count a successful summary model call and its usage in the existing per-turn
LLM metrics.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 24 LTS, `strict: true`

**Primary Dependencies**: Existing LangChain/LangGraph and OpenRouter model factory, Zod,
Express, and Node.js `node:sqlite` (`DatabaseSync`)

**Storage**: Existing SQLite `messages` table plus a new `conversation_summaries` table, initialized
with the conversation schema

**Testing**: `node:test` through `tsx`; deterministic fake summarizer for service and HTTP behavior;
SQLite `:memory:` and reopen tests for summary persistence

**Target Platform**: Linux server

**Project Type**: HTTP web service with agent and persistence layers

**Performance Goals**: Do not invoke the summary model before the eight-message refresh threshold.
At most one summary-generation call is made for an eligible sequential chat request.

**Constraints**: Preserve original messages; keep the latest eight prior messages raw; retain
unrepresented older messages raw until a refresh; persist summary text and coverage together;
include successful summarization usage in real prompt metrics and keep its estimate distinct.

**Scale/Scope**: One current summary per conversation; source messages are user/assistant records;
the current request is separate from the prior-history window.

## Constitution Check

| Principle or constraint | Status | Plan alignment |
|-------------------------|--------|----------------|
| Boundary Security | PASS | Validate summary output and summary records with Zod; do not expose source transcript in the event. |
| Predictable Domain | PASS | Keep threshold selection pure; isolate model calls and SQLite access behind service/store boundaries. |
| Layered Architecture | PASS | Place summarizer at the service/model boundary and keep persistence in the conversation store. |
| Verifiable Quality | PASS | Use a fake summarizer and SQLite `:memory:`/reopen tests; run typecheck and full test suite. |
| SQLite persistence | PASS | Add the summary table through the existing `DatabaseSync` schema initialization. |
| Secrets and privacy | PASS | Tests use deterministic fakes; trace event contains counts only, not transcript or summary text. |

**Gate result**: PASS. No constitution exception or additional project layer is required.

## Project Structure

### Documentation (this feature)

```text
specs/011-conversation-history-pruning/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── chat-context-pruning.md
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── trace.ts
│   └── types.ts
├── services/
│   ├── chat-service.ts
│   ├── chat-service.test.ts
│   └── conversation-summarizer.ts
├── store/
│   ├── conversation-store.ts
│   ├── sqlite-conversation-store.ts
│   └── sqlite-conversation-store.test.ts
└── http/
    ├── server.ts
    └── server.test.ts
```

**Structure Decision**: Extend the existing conversation service/store path. The current store
already owns message ordering and SQLite schema initialization; adding summary reads, coverage
queries, and atomic upsert there keeps summary persistence on the same connection. The chat
service coordinates refresh and context composition. A separate summarizer adapter uses the
existing model factory and is injectable for tests. The existing trace schema/formatter and
`POST /chat` response contract are extended for the structured event.

## Design Decisions

1. Select the latest eight prior messages separately from the current request. Fetch messages after
   the saved coverage cursor, exclude the latest-eight IDs, and refresh only when at least eight
   unrepresented older messages exist. On refresh, summarize all currently eligible older messages
   with the previous summary, then advance the cursor to the last covered message.
2. Before the threshold, retain pending older messages verbatim and include them alongside the
   saved summary and latest eight. On generation or persistence failure, leave the prior summary,
   cursor, and messages unchanged; surface the request failure and emit no successful event.
3. Store one summary per conversation with its covered-through message ID. Upsert the summary and
   cursor atomically; retain original messages.
4. Inject a `ConversationSummarizer` through chat-service options. The default adapter uses the
   existing model factory and validates structured output; tests provide a deterministic fake.
5. Add a strict `summarize` trace variant with `messagesSummarized` and `estimatedTokens`. Emit it
   after a successful persistence operation and before strategy trace events; include no text
   content.
6. For a successful summary call, aggregate its real `usage_metadata.input_tokens` and one
   estimated source observation with the strategy metrics. If summary usage is missing, the
   combined `promptTokens` is `null`. Preserve `historyMessages` as the count of raw prior messages
   supplied to the final answer-producing strategy, excluding the current request and summary.

## Constitution Check (Post-Design)

| Gate | Status | Verification |
|------|--------|--------------|
| External data validation | PASS | Zod validates the summary output, stored record, and new trace event. |
| Domain and side-effect boundaries | PASS | Pure threshold selection is separate from model and SQLite operations. |
| Persistent data safety | PASS | A failed refresh does not advance coverage or delete source messages. |
| Testability | PASS | Fake summarizer tests do not require provider credentials; store behavior is testable in memory and after reopen. |
| Existing contracts | PASS | Request shape remains unchanged; response trace is additive, and history count semantics are documented. |

**Post-design gate result**: PASS. No unjustified constitution violations.

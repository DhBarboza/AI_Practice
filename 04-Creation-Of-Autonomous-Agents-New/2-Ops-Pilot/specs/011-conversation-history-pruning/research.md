# Research: Conversation History Pruning

No unresolved technology choices remain. The project already provides the required model,
persistence, validation, trace, and testing patterns.

## Decision 1: Keep summary persistence in the conversation store

**Decision**: Extend the existing conversation-store contract and SQLite implementation with a
summary record, a query for messages after its coverage cursor, and an atomic summary/cursor
upsert. Initialize `conversation_summaries` alongside `messages`.

**Rationale**: Both records share conversation identity and chronological message ordering. The
current SQLite store already owns the `messages` schema and uses SQLite row order to return
chronological history. Keeping these operations on the same database connection supports
consistent in-memory and persistent tests without introducing a second store lifecycle.

**Alternatives considered**:

- Store the summary in a synthetic assistant message: rejected because it would alter the
  conversation transcript and count the summary as a raw message.
- Open a separate database connection for summaries: rejected because it complicates `:memory:`
  tests and cannot atomically persist summary text with its coverage cursor.

**In-repository references**:

- `src/store/conversation-store.ts` defines the current store contract and message ordering inputs.
- `src/store/sqlite-conversation-store.ts` initializes SQLite schema and reads messages in
  chronological order.
- `src/store/sqlite-conversation-store.test.ts` uses `:memory:` and verifies persistence after
  closing and reopening a database.

## Decision 2: Gate summaries by unrepresented messages outside the recent window

**Decision**: Keep the latest eight prior messages raw. Starting after the summary's
`coveredThroughMessageId`, select messages older than that window. Do not refresh until at least
eight such messages are available; on refresh, combine the prior summary with all currently
eligible messages and advance the cursor only after successful persistence.

**Rationale**: This meets the requested batch cadence, prevents summarizing the same message twice,
and preserves a bounded pending tail verbatim between refreshes. The cursor is a message ID, while
the store uses its existing chronological ordering to determine what follows it.

**Alternatives considered**:

- Rebuild the summary on every chat request: rejected because it repeats model calls and changes
  summary state without a complete batch.
- Summarize only the most recent eight messages without merging the prior summary: rejected
  because earlier decisions and open work would be discarded.
- Delete source messages after summarizing: rejected because the feature prunes model context, not
  persistent conversation history.

## Decision 3: Use an injectable summarizer with validated model output

**Decision**: Add a service-level `ConversationSummarizer` port. Its default adapter uses the
existing `createModel()` factory, requests a concise structured summary, retains the raw AI message
for usage metadata, and validates the summary text. `ChatServiceOptions` accepts a fake
implementation for deterministic tests.

**Rationale**: This follows the existing injectable `LearningAssessor` pattern and keeps external
model access out of context-selection logic. The summary instruction can prioritize decisions,
facts, and pending work while treating the 150-token target as soft.

**Alternatives considered**:

- Call the OpenRouter client directly from `ChatService`: rejected because it mixes model
  integration with orchestration and makes deterministic tests harder.
- Hard-truncate source messages to the target length: rejected because it can remove facts and
  unresolved tasks.

**In-repository references**:

- `src/memory/learning-reflector.ts` injects an assessor and validates model output with Zod.
- `src/agents/model.ts` provides the configured LangChain model factory.

## Decision 4: Represent summarization as a structured trace event

**Decision**: Add a Zod-validated `summarize` trace variant carrying the number of newly summarized
messages and the estimated summary size. Emit it only after the new summary and cursor are
persisted.

**Rationale**: Existing agent events use a discriminated trace schema and are returned by
`POST /chat`. A structured event exposes the requested operation without copying conversation
content into an event payload.

**Alternatives considered**:

- Add a free-form event string: rejected because consumers cannot reliably validate or read the
  summarized count and estimated size.
- Include the summary or source messages in the event: rejected because the event only needs to
  identify the operation and would unnecessarily repeat sensitive conversation text.

**In-repository references**:

- `src/agents/types.ts` validates trace events as a discriminated union.
- `src/agents/trace.ts` formats trace events deterministically.

## Decision 5: Include summary-generation usage in chat metrics

**Decision**: Treat a successful summary call as an answer-affecting model call. Add its reported
input-token count to the response's real total and its estimated prompt sources to the existing
breakdown. If its usage metadata is absent, the turn's real total is unavailable.

**Rationale**: The generated summary is supplied to the answer-producing strategy, so excluding
its model call would understate usage. The project already separates real usage from estimates and
requires an incomplete real total to be `null`.

**Alternatives considered**:

- Exclude summary usage because it runs in the chat service: rejected because placement in the
  service does not make the answer-affecting model call disappear.
- Substitute an estimate when real usage is absent: rejected because estimates must not be
  presented as actual prompt usage.

**In-repository references**:

- `src/context/tokens.ts` aggregates real usage separately from estimated source counts.
- `src/services/chat-service.ts` composes prior context before invoking the reasoning strategy.

## Decision 6: Use deterministic fakes and SQLite tests

**Decision**: Inject a fake summarizer in chat-service and HTTP tests, and exercise summary
retrieval/upsert and reopen persistence with SQLite `:memory:` or an isolated temporary database.

**Rationale**: These tests prove refresh thresholds, event shape, failure behavior, and persistence
without requiring OpenRouter credentials or network access.

**Alternatives considered**:

- Use a live model in automated tests: rejected because it is nondeterministic and requires
  credentials/network access.
- Test only the fake summarizer in isolation: rejected because it would not verify context
  composition, store updates, or response events.

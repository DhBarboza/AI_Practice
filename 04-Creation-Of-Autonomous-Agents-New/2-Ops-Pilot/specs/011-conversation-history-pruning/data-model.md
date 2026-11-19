# Data Model: Conversation History Pruning

## Entities

### Conversation Message

Existing persisted user or assistant message. Original records remain unchanged and are never
deleted as a result of pruning.

| Field | Constraint | Meaning |
|-------|------------|---------|
| `id` | Non-empty, unique | Stable message identifier used for chronological coverage. |
| `conversationId` | Non-empty | Conversation that owns the message. |
| `role` | `user` or `assistant` | Message author category. |
| `content` | String | Original message content. |
| `createdAt` | ISO datetime | Message creation time. |

The store's existing chronological order is authoritative for selecting a cursor and messages
outside the recent window.

### Conversation Summary

One current summary record per conversation, stored in the `conversation_summaries` table.

| Field | Constraint | Meaning |
|-------|------------|---------|
| `conversationId` | Non-empty; primary key | Conversation with which the summary is associated. |
| `summary` | Non-empty string | Concise summary of covered older context, targeting about 150 tokens. |
| `coveredThroughMessageId` | Non-empty identifier of a message in the same conversation | Last message represented by this summary. |
| `updatedAt` | ISO datetime | Time the latest summary was successfully persisted. |

The summary and coverage cursor form one state and are saved together. A failed generation or
save MUST leave the previous record and cursor unchanged. Source messages remain in `messages`.

### Summarize Trace Event

Emitted after a successful summary update and before the strategy's trace events.

| Field | Constraint | Meaning |
|-------|------------|---------|
| `type` | Literal `summarize` | Identifies summary refresh activity. |
| `messagesSummarized` | Positive integer | Number of newly covered messages in this refresh. |
| `estimatedTokens` | Non-negative integer | Approximate size of the saved summary using the shared character-based estimator. |

The event contains no summary or transcript text.

## Refresh and Context Rules

1. Load the latest eight prior messages, in chronological order, separately from the current
   request.
2. Load the current conversation summary, if any, and messages after its coverage cursor.
3. Exclude the latest-eight message IDs from the unrepresented set. These are candidate older
   messages for summary refresh.
4. If fewer than eight candidate messages exist, do not call the summarizer or write a summary.
   Include the saved summary, candidate messages verbatim, and latest-eight messages in context.
5. If at least eight candidate messages exist, pass the previous summary and all candidate
   messages in chronological order to the summarizer. Persist the replacement and last-candidate
   cursor atomically only after the output validates. Use the saved replacement plus latest-eight
   messages in context.
6. If generation or persistence fails, leave saved state and source messages unchanged, fail the
   current request, and emit no successful event.
7. `historyMessages` counts raw prior messages supplied to the final answer-producing strategy
   (pending candidates plus latest eight); it excludes the summary, the summary-generation input,
   and the current request.

## State Transitions

| Current state | Condition | Result |
|---------------|-----------|--------|
| No summary | Fewer than eight candidate older messages | Keep candidates raw; no summary row or event. |
| No summary | At least eight candidate older messages | Save a first summary and cursor; emit one summarize event. |
| Saved summary | Fewer than eight new candidate older messages | Reuse summary and pending messages; no update or event. |
| Saved summary | At least eight new candidate older messages | Merge old summary with candidates; replace summary/cursor; emit one event. |
| Any state | Generation or persistence error | Preserve prior data; fail request; emit no successful event. |

# Data Model: Conversation Persistence

## Conversation

A chat thread addressed by a stable identifier and represented by its ordered messages.

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Generated as `conv-` followed by a UUID; non-empty when supplied by a client |

There is no separate conversation metadata record in this design. A conversation is considered
known after it has at least one saved message. Successful chat responses are issued only after the
exchange has been persisted.

## Message

A user message or assistant response belonging to a conversation.

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Unique generated identifier |
| `conversationId` | string | Required conversation identifier |
| `role` | `"user" \| "assistant"` | Closed set |
| `content` | string | Required message text |
| `createdAt` | string | UTC timestamp |

### Relationships and ordering

- One conversation has zero or more messages; each message belongs to exactly one conversation.
- The current user message is appended before strategy execution; an assistant message is appended
  only after a successful result.
- A failed strategy execution leaves its user message saved without an assistant message.
- Message order is established by append order.
- For a continued conversation, select at most the 12 latest messages, then provide that selection
  in chronological order.
- The current request is excluded from its own prior-history selection and from
  `historyMessages`.

## Chat response metrics

`historyMessages` is an integer from 0 to 12, equal to the count of saved prior messages passed to
the selected strategy for that request.

## Validation and failures

- Request bodies remain strict and validate `message` and optional `conversationId` with Zod.
- An empty or malformed identifier is an invalid request; a non-empty identifier without saved
  messages is unknown and returns a not-found response.
- Stored rows are validated before conversion to domain messages.
- A failed strategy execution does not append an assistant response; the request's user message
  remains persisted.

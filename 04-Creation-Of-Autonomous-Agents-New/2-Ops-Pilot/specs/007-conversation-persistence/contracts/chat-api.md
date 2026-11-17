# Chat API Contract

## `POST /chat`

Adds optional conversation continuation to the existing chat request. Existing `strategy`,
`reflect`, timeout, and response behavior remain in effect.

### Request

Content type: `application/json`

```json
{
  "message": "Summarize the current alerts",
  "strategy": "react",
  "reflect": false,
  "conversationId": "conv-<uuid>"
}
```

| Field | Type | Required | Behavior |
|---|---|---:|---|
| `message` | non-empty string | Yes | Current user message |
| `strategy` | non-empty string | No | Existing strategy selection; defaults to `react` |
| `reflect` | boolean | No | Existing reflection behavior; defaults to `false` |
| `conversationId` | non-empty string | No | Omit to create a conversation; provide a returned identifier to continue it |

The request body is strict; unknown fields are rejected.

### Successful response

Status: `200`

```json
{
  "answer": "There are three firing alerts.",
  "trace": [],
  "metrics": {
    "llmCalls": 1,
    "latencyMs": 12,
    "historyMessages": 2
  },
  "conversationId": "conv-<uuid>"
}
```

The existing `answer`, `trace`, `llmCalls`, and `latencyMs` fields are preserved. `conversationId`
is always returned. `historyMessages` is the number of saved prior messages included in the prompt,
from zero through 12.

### Errors

| Status | Condition | Response |
|---:|---|---|
| `400` | Invalid body or malformed `conversationId` | Existing `{ "issues": [...] }` validation response |
| `404` | Well-formed `conversationId` has no saved messages | Clear not-found error; no strategy execution |
| `422` | Unknown strategy | Existing unknown-strategy response |
| `500` | Strategy or persistence failure | Generic internal error; no internal details |
| `504` | Existing 180-second execution deadline exceeded | Existing timeout response |

### Conversation behavior

- When `conversationId` is omitted, the successful response provides a new identifier.
- When a known identifier is supplied, at most the 12 newest saved messages are included in
  chronological order.
- Only a successful strategy result is persisted as a user message and assistant response.
- An unknown identifier is never silently replaced with a new conversation.

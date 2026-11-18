# Chat API Contract

## `POST /chat`

Requires a user identifier and adds that user's semantically relevant saved facts to the prompt.
Existing strategy selection, reflection, conversation continuation, timeout, and response fields
remain in effect.

### Request

Content type: `application/json`

```json
{
  "message": "Which local database backs the service?",
  "userId": "operator-123",
  "strategy": "react",
  "reflect": false,
  "conversationId": "conv-<uuid>"
}
```

| Field | Type | Required | Behavior |
|---|---|---:|---|
| `message` | non-empty string | Yes | Current user message; also used as the semantic recall query |
| `userId` | non-empty string | Yes | Scopes recalled memories |
| `strategy` | non-empty string | No | Existing strategy selection; defaults to `react` |
| `reflect` | boolean | No | Existing reflection behavior; defaults to `false` |
| `conversationId` | non-empty string | No | Omit to create a conversation; provide a returned identifier to continue it |

The request body is strict; unknown fields are rejected.

### Successful response

Status: `200`

```json
{
  "answer": "The service uses SQLite.",
  "trace": [],
  "metrics": {
    "llmCalls": 1,
    "latencyMs": 12,
    "historyMessages": 2
  },
  "conversationId": "conv-<uuid>"
}
```

The response shape remains unchanged. Recalled facts are prompt context and are not added as
response fields. At most three facts with a dot-product score of at least `0.3` are added; if none
qualify, no memory section is added.

### Errors

| Status | Condition | Response |
|---:|---|---|
| `400` | Missing/empty `userId`, invalid body, or malformed `conversationId` | Existing `{ "issues": [...] }` validation response |
| `404` | Well-formed `conversationId` has no saved messages | Existing not-found response |
| `422` | Unknown strategy | Existing unknown-strategy response |
| `500` | Strategy, memory-store, model, or persistence failure | Generic internal error; no internal details |
| `504` | Existing request execution deadline exceeded | Existing timeout response |

### Memory management scope

Fact creation and forgetting use the internal memory-store operations described in
[`../data-model.md`](../data-model.md). This feature adds no `/memories` HTTP endpoint and no
memory mutation fields to `/chat`.

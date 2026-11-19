# Chat Context Metrics Contract

## `POST /chat`

The request, authentication assumptions, response status codes, and existing chat behavior do not
change. Successful responses add `promptTokens` and `contextBreakdown` under `metrics`.

### Successful response

```json
{
  "answer": "There are firing alerts.",
  "trace": [],
  "conversationId": "conv-<uuid>",
  "metrics": {
    "llmCalls": 2,
    "latencyMs": 12,
    "historyMessages": 2,
    "promptTokens": 87,
    "contextBreakdown": {
      "estimated": true,
      "total": 46,
      "sources": {
        "currentMessage": 6,
        "conversationHistory": 8,
        "recalledMemories": 3,
        "agentInstructions": 16,
        "operationalToolContext": 13
      }
    }
  }
}
```

`promptTokens` is the sum of actual LangChain-reported input-token counts for answer-affecting
model calls in this turn. If any such call lacks a prompt-token count, the field is `null`; do not
return a partial sum or replace it with an estimate.

`contextBreakdown.estimated` is always `true`. Each source and `total` are non-negative integer
estimates, and `total` equals the sum of the five source values. Source counts are estimated for
each model call and summed across the turn. They are not expected to equal `promptTokens`.

Existing metrics (`llmCalls`, `latencyMs`, and `historyMessages`) retain their current meanings.
Errors and non-success responses retain their existing contract.

## `conversa-longa.sh`

The root shell script launches the TypeScript CLI runner. For each successful turn it prints the
turn number and the response's real `metrics.promptTokens`. A `null` value is printed as
`unavailable`; estimated breakdown values are not substituted.

Example:

```text
Turn 1: promptTokens=87
Turn 2: promptTokens=unavailable
```

The CLI validates responses against the chat response schema before displaying metrics. It does
not print full prompts, memories, or tool results.

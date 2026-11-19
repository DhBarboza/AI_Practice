# Data Model: Context Token Metrics

## Chat Turn Metrics

Per-turn metrics returned by the reasoning strategy and chat service.

| Field | Type | Validation and meaning |
|---|---|---|
| `llmCalls` | non-negative integer | Existing count of answer-affecting model calls. |
| `latencyMs` | non-negative number | Existing elapsed time metric. |
| `promptTokens` | non-negative integer or `null` | Sum of LangChain-reported input tokens across the turn; `null` if any contributing call does not report a count. |
| `contextBreakdown` | `ContextBreakdown` | Estimated source counts; never treated as actual usage. |
| `historyMessages` | non-negative integer | Existing chat-service metric, bounded by the current history limit. |

`historyMessages` remains chat-service metadata and is not part of the strategy-level token
collector.

## Context Breakdown

An estimated view of app-controlled text submitted to answer-affecting model calls.

| Field | Type | Validation and meaning |
|---|---|---|
| `estimated` | literal `true` | Explicitly distinguishes estimates from provider-reported usage. |
| `total` | non-negative integer | Sum of estimates for all source categories. |
| `sources.currentMessage` | non-negative integer | Current user message text supplied to model calls. |
| `sources.conversationHistory` | non-negative integer | Prior user/assistant messages supplied to model calls. |
| `sources.recalledMemories` | non-negative integer | Recalled user facts supplied to model calls. |
| `sources.agentInstructions` | non-negative integer | App-defined agent/system instructions supplied to model calls. |
| `sources.operationalToolContext` | non-negative integer | App-visible tool definitions, tool arguments, observations, and results supplied to model calls. |

Each source is estimated independently for each model call using `estimateTokens`; repeated
context counts each time it is supplied. The total is the sum of those estimates. Text inserted
internally by the model provider and usage for asynchronous background learning are outside these
metrics.

## LangChain Usage Observation

Each answer-affecting model call contributes one observation:

| Field | Type | Validation and meaning |
|---|---|---|
| `inputTokens` | non-negative integer or unavailable | Read from the returned AI message's `usage_metadata.input_tokens`. |
| `sourceText` | source-attributed text per category | The app-controlled input context supplied to that call, used only for the estimate. |

The turn's real `promptTokens` is complete only if every contributing observation has an
`inputTokens` value. Otherwise it is `null`. Zero is valid only when explicitly reported by the
integration.

## Relationships

- One chat turn has one `Chat Turn Metrics` record.
- A chat turn contains one or more `LangChain Usage Observation` records.
- Each observation contributes reported usage to the real aggregate and estimated source counts
  to the separate `Context Breakdown`.

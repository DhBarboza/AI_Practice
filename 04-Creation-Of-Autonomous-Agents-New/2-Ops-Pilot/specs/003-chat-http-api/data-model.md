# Data Model: Chat HTTP API

This feature adds no persisted data. Its entities represent the request and response at the HTTP boundary.

## Chat Request

| Field | Type | Constraints |
|---|---|---|
| `message` | string | Required; trimmed and non-empty. |
| `strategy` | string (optional) | Non-empty when supplied; must resolve in the strategy registry. Defaults to `react` only when omitted. |
| `reflect` | boolean (optional) | Defaults to `false`; when true, the selected strategy is decorated before execution. |
| additional fields | none | Request shape is strict; unknown fields fail validation. |

## Strategy Registry

A readonly mapping from stable base strategy names (`react` and `plan-and-execute`) to `ReasoningStrategy` instances. Each request resolves one entry and may decorate it with reflection; registry overrides support deterministic integration tests.

## Reasoning Result

The successful HTTP response contains only:

| Field | Type | Constraints |
|---|---|---|
| `answer` | string | Validated by the shared reasoning result schema. |
| `trace` | array of trace events | Validated by the shared discriminated trace schema. |
| `metrics` | object | Non-negative integer `llmCalls` and non-negative `latencyMs`. |

## Error Response

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "issues": [...] }` | Malformed JSON or body fails Zod validation. |
| 422 | `{ "error": "Unknown strategy" }` | Valid request names a strategy not present in the registry. |
| 500 | `{ "error": "Internal server error" }` | Strategy, model, or output validation fails for a reason other than timeout. |
| 504 | `{ "error": "Request timed out" }` | The request deadline expires before strategy completion. |

Validation issue objects are produced by Zod. Error responses do not include stack traces, credentials, or partial reasoning results.

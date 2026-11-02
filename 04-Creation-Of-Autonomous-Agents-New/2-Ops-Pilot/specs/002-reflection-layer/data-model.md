# Data Model: Reflection Layer

This feature adds no persisted data. It extends the existing in-memory reasoning result lifecycle.

## Reasoning Response

Represents one candidate answer returned from a base strategy execution.

| Field | Type | Constraints |
|---|---|---|
| `answer` | string | Returned by the wrapped strategy. |
| `trace` | `TraceEvent[]` | Ordered observations and other events produced by the attempt. |
| `metrics.llmCalls` | non-negative integer | Actual model invocations counted by the strategy. |
| `metrics.latencyMs` | non-negative number | Strategy attempt duration; the decorator reports whole-run elapsed time. |

## Critique

Represents the critic's evaluation of one candidate.

| Field | Type | Constraints |
|---|---|---|
| `approved` | boolean | `true` stops reflection; `false` permits regeneration while budget remains. |
| `feedback` | string | Included in the next generation's request after rejection. |
| `trace event` | `TraceEvent` | One `{ type: "critique", content: string }` event per critic evaluation. |
| `model calls` | 1 | Each structured critic invocation contributes one to `llmCalls`. |

## Reflection Options

| Field | Type | Constraints |
|---|---|---|
| `maxReflections` | non-negative integer | Defaults to `2`; counts regenerations after the initial response. Zero bypasses the critic. |
| `critic` | async function (optional) | Accepts the original request and accumulated reasoning result; returns a validated critique. Use for deterministic tests or when a custom strategy uses a different model. When absent, the configured model-backed critic is used. |

## Relationships and State Transitions

1. Initial strategy execution produces the first candidate response and trace.
2. With a positive reflection limit, the critic evaluates the candidate against the accumulated trace observations.
3. Approval ends the run and returns the approved candidate.
4. Rejection records feedback and, while fewer than `maxReflections` regenerations have occurred, starts another strategy execution with feedback appended to the request.
5. After the last permitted regeneration, that candidate is also critiqued; if rejected, the run ends and returns that latest candidate.
6. Every executed attempt's trace is appended in order. Each critique appends one `critique` event. Call counts are summed across attempts and critiques.

The same trace event type is also used by Plan-and-Execute's existing planner review. Reflection-specific contract requirements apply to the decorator's critic evaluations; existing strategy trace behavior is preserved.

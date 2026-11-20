# Context Builder Contract

## Chat integration

`POST /chat` request and response shapes do not change. Every chat reasoning strategy (ReAct,
Plan-and-Execute, and reflection wrapping either) receives its prompt from
`src/context/context-builder.ts` via `composeReasoningStrategy`.

Arena and bench entry points that call `ReasoningStrategy.run` with a raw `input` string are
outside this contract.

## Environment

| Variable | Default | Meaning |
|----------|---------|---------|
| `CONTEXT_BUDGET_SUMMARY` | `200` | Estimated-token cap for the conversation summary section. |
| `CONTEXT_BUDGET_WINDOW` | `1200` | Estimated-token cap for the recent history window. |
| `CONTEXT_BUDGET_MEMORY` | `300` | Estimated-token cap for recalled memories. |

Values are non-negative integers. Missing or empty values use the default. Non-numeric or
negative values fail assembly and MUST NOT be treated as unlimited.

Caps use `estimateTokens` (characters / 4, rounded up), the same helper as context metrics.

## Section rules

| Section | Source | Cap | Overflow |
|---------|--------|-----|----------|
| System | `agentInstructions` | None | Never omitted or shortened. |
| Current message | user request | None | Never omitted or shortened. |
| Summary | persisted conversation summary | `CONTEXT_BUDGET_SUMMARY` | Shorten text to fit. |
| Window | pending older messages plus recent history, chronological | `CONTEXT_BUDGET_WINDOW` | Drop oldest messages first; shorten the last remaining message if needed. |
| Memories | scored recall candidates | `CONTEXT_BUDGET_MEMORY` | Drop lowest score first; on equal scores drop the later-ranked candidate; shorten the last remaining fact if needed. |

A zero cap omits that trimmable section. Empty sections add no labels. Operational or tool
context added after assembly is not covered by these caps.

## Prompt and metrics

Post-budget section text is what the strategy receives as `input` and `contextSources`.
`contextBreakdown` therefore estimates the capped text, not the pre-budget candidates.

`metrics.historyMessages` is the number of raw prior messages retained in the window section. It
excludes the summary, current request, dropped window messages, and memories.

Source conversation rows and stored memories are not deleted when omitted from a prompt.

## Validation

- Validate builder input, scored memory candidates, and budgets with Zod before trimming.
- Validate `contextSources` with the existing `ContextSourceTextsSchema`.
- Existing chat request validation and error handling remain in effect.

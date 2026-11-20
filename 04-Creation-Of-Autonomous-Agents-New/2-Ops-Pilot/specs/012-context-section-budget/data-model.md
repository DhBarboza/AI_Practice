# Data Model: Context Section Budget

This feature does not add persisted entities. It introduces in-memory assembly records used for
every chat strategy prompt.

## Entities

### Section Budget

Validated numeric caps for trimmable sections.

| Field | Constraint | Default env | Meaning |
|-------|------------|-------------|---------|
| `summary` | Integer ≥ 0 | `CONTEXT_BUDGET_SUMMARY` = 200 | Max estimated tokens for the conversation-summary section. |
| `window` | Integer ≥ 0 | `CONTEXT_BUDGET_WINDOW` = 1200 | Max estimated tokens for the recent-history window section. |
| `memory` | Integer ≥ 0 | `CONTEXT_BUDGET_MEMORY` = 300 | Max estimated tokens for the recalled-memories section. |

Missing or empty env values use the defaults. Invalid values fail validation and MUST NOT disable
the cap. System instructions and the current message have no cap.

### Context Builder Input

| Field | Constraint | Meaning |
|-------|------------|---------|
| `agentInstructions` | String, possibly empty | System section; copied through unchanged. |
| `message` | Non-empty string | Current user request; copied through unchanged. |
| `summary` | String or null | Conversation summary candidate, before the summary cap. |
| `history` | Chronological prior messages | Window candidates (pending unsummarized plus recent window). |
| `memories` | Scored facts | Recalled memories with the ranking score from recall. |
| `budgets` | `Section Budget` | Caps applied to summary, window, and memories. |

### Scored Memory Candidate

| Field | Constraint | Meaning |
|-------|------------|---------|
| `fact` | Non-empty string | Memory text considered for the prompt. |
| `score` | Finite number | Relevance score from recall ranking; not persisted. |

Candidates are ordered by score descending, then by original index ascending. Overflow drops from
the end of that order (lowest score, then later rank on ties).

### Context Builder Result

| Field | Meaning |
|-------|---------|
| `prompt` | Assembled strategy `input` after budgeting. |
| `contextSources` | Existing `ContextSourceTexts` using post-budget section text. |
| `retainedHistory` | Prior messages kept in the window section, chronological. |
| `retainedMemories` | Memory facts kept in the memories section, after score-based dropping. |

`agentInstructions` and `currentMessage` in `contextSources` are the uncut inputs. Summary text
that still overflows after the cap is shortened from the end. Empty trimmable sections omit their
labels.

## Assembly Rules

1. Load budgets from the env snapshot or explicit test budgets.
2. Copy system instructions and the current message without modification.
3. If summary is present, shorten it until `estimateTokens(formatted summary section) ≤ summary
   budget`, or omit the section when the budget is 0.
4. Starting from the full chronological history list, drop the oldest message while more than one
   remains and the formatted window exceeds its budget. If one remains and still exceeds, shorten
   that message's content. Omit the section when the budget is 0 or no messages remain.
5. Sort memories by score descending (original index for ties). Drop from the end while more than
   one remains and the formatted memories section exceeds its budget. If one remains and still
   exceeds, shorten that fact. Omit the section when the budget is 0 or no memories remain.
6. Compose `prompt` in the current order: optional system section, summary, window, memories, then
   the current message. When no additional context exists, the prompt is the current message as
   today.
7. `historyMessages` equals `retainedHistory.length`.

## State Transitions

| Starting section | Condition | Result |
|------------------|-----------|--------|
| Any trimmable section | Content already within budget | Keep all items; no shortening. |
| Summary | Estimate above cap | Shorten summary text to fit; never touch system or message. |
| Window | Estimate above cap, more than one message | Drop oldest message; repeat. |
| Window | One message still above cap | Shorten that message content to fit. |
| Memories | Estimate above cap, more than one memory | Drop lowest score (end of ranked list); repeat. |
| Memories | One memory still above cap | Shorten that fact to fit. |
| Trimmable section | Budget is 0 | Omit the section. |
| System or current message | Any budget pressure | Leave text unchanged. |

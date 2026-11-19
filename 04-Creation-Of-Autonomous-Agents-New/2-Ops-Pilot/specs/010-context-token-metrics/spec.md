# Feature Specification: Context Token Metrics

**Feature Branch**: `Not specified`

**Created**: 2026-11-18

**Status**: Draft

**Input**: User description: "Instrumente a medição de contexto: src/context/tokens.ts com estimateTokens (chars/4) e o usage real do LangChain; métricas do chat com promptTokens real e contextBreakdown estimado por fontes; conversa-longa.sh imprime o promptTokens por turno. Com testes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inspect chat token usage (Priority: P1)

An operator reviewing a chat response can distinguish the number of prompt tokens actually
reported by the model integration from an estimate of how the prompt was composed. The response
shows estimated context by source so the operator can identify which inputs contribute context.

**Why this priority**: Actual usage and a source-level estimate provide complementary information
for diagnosing context growth without presenting an estimate as measured usage.

**Independent Test**: Run a chat turn with deterministic model responses containing usage metadata
and known context sources. Verify that the response reports the actual prompt-token usage and a
separate estimated breakdown.

**Acceptance Scenarios**:

1. **Given** a chat turn whose model calls report prompt-token usage, **When** the response is
   returned, **Then** `promptTokens` equals the sum of the reported prompt-token counts for the
   calls that produced the answer, and `contextBreakdown` reports estimates by source.
2. **Given** a model call without reported prompt-token usage, **When** the chat metrics are
   produced, **Then** the missing real count is shown as unavailable and is not replaced by an
   estimate or zero.
3. **Given** the same prompt content is measured, **When** its context estimate is calculated,
   **Then** the estimated value is kept distinct from real prompt-token usage.

### User Story 2 - Review a long conversation by turn (Priority: P2)

An operator running the long-conversation exercise can see the real prompt-token usage for each
turn and identify turns whose usage was not reported.

**Why this priority**: Per-turn output makes context growth observable over the course of a
conversation and helps reproduce usage changes.

**Independent Test**: Run the long-conversation exercise with deterministic per-turn usage values
and verify that each turn prints its own value; verify that a turn with missing usage is marked
unavailable.

**Acceptance Scenarios**:

1. **Given** multiple turns with reported usage, **When** the exercise completes, **Then** it
   prints the real `promptTokens` value for each corresponding turn.
2. **Given** a turn without reported usage, **When** that turn is printed, **Then** it is marked
   unavailable rather than displaying an estimate or a fabricated number.

### User Story 3 - Estimate context consistently (Priority: P3)

An operator or developer evaluating context sources can use one consistent estimate for supplied
text, including empty and short text.

**Why this priority**: A shared, predictable estimate makes source breakdowns comparable while
keeping them explicitly approximate.

**Independent Test**: Evaluate representative strings of different lengths and verify the
documented characters-per-token estimate and its rounding behavior.

**Acceptance Scenarios**:

1. **Given** text of a known character length, **When** its token estimate is calculated, **Then**
   the result is the character count divided by four, rounded up to a whole token.
2. **Given** empty text, **When** its token estimate is calculated, **Then** the result is zero.

### Edge Cases

- A chat turn invokes the model more than once; reported prompt tokens are aggregated for the
  answer-producing calls in that turn.
- A model call reports no usage metadata, or reports usage without a prompt-token count; the real
  count is unavailable, not inferred from the context estimate.
- A source contributes no text; its estimate is zero.
- A source includes short text or a character count not divisible by four; its estimate is rounded
  up, while the combined source total remains the sum of those source estimates.
- A source appears in more than one model call in a turn; its estimate reflects the context
  supplied across those calls.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a shared text-token estimate based on four characters per
  estimated token, rounded up to a whole number; empty text MUST estimate to zero.
- **FR-002**: The system MUST obtain real prompt-token usage from LangChain usage metadata for
  model calls that produce a chat answer. When a turn has multiple such calls, the metric MUST
  aggregate their reported prompt-token counts.
- **FR-003**: Chat metrics MUST expose `promptTokens` as the real per-turn count, or explicitly
  indicate that the real count is unavailable when the usage metadata does not provide it. The
  system MUST NOT substitute an estimate or a fabricated zero for missing usage.
- **FR-004**: Chat metrics MUST expose `contextBreakdown` as estimated counts by source, with an
  estimated total. The breakdown MUST distinguish at least the current user message, conversation
  history, recalled user memories, agent instructions, and operational or tool context.
- **FR-005**: The breakdown MUST use the shared text-token estimate for each source and MUST be
  identified as estimated so it cannot be confused with real prompt-token usage.
- **FR-006**: The `conversa-longa.sh` exercise MUST print the real `promptTokens` count for each
  turn, and MUST identify unavailable real usage without substituting an estimate.
- **FR-007**: Tests MUST verify the estimator, aggregation and unavailable-usage behavior, source
  estimates and total, and per-turn output of the long-conversation exercise.

### Key Entities *(include if data involved)*

- **Chat turn metrics**: Per-turn real prompt-token usage, when available, and estimated context
  counts.
- **Context source**: A category of text supplied to answer-producing model calls, such as user
  message, history, recalled memories, agent instructions, or operational/tool context.
- **Real prompt-token usage**: The prompt-token count reported by the model integration for a
  specific call; it is distinct from any estimate.
- **Estimated context breakdown**: Character-based estimates attributed to context sources and
  aggregated for the turn.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all deterministic usage tests, the reported `promptTokens` exactly matches the
  sum of the actual prompt-token counts reported for answer-producing calls in the turn.
- **SC-002**: In all estimator tests, the estimated count is zero for empty text and otherwise
  equals the character count divided by four, rounded up; no source estimate is reported as real
  usage.
- **SC-003**: In all breakdown tests, each required source is represented and the estimated total
  equals the sum of its source estimates.
- **SC-004**: In the long-conversation exercise, every turn prints its real prompt-token count or
  an explicit unavailable indication, with no estimate used in its place.

## Assumptions

- The real usage count covers model calls used to produce the chat answer; asynchronous background
  learning is outside the returned turn metrics.
- The context breakdown estimates the text attributable to each source across the
  answer-producing calls; it is an observability aid, not a reconstruction of provider tokenization.
- The estimate rounds up to a whole token so any non-empty text has a non-zero estimate.
- If real usage is absent, it is represented explicitly as unavailable (for example, `null`); the
  exact external representation is finalized during planning without changing this meaning.
- Metrics are returned for the chat turn and printed by the long-conversation exercise; persistent
  storage of token metrics is outside this feature.
- New logic and CLI behavior will have focused tests consistent with the project's constitution.

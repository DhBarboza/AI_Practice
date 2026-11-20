# Research: Context Section Budget

No unresolved technology choices remain. Prompt assembly, token estimation, chat strategy
wrapping, and `node:test` coverage already exist. This feature centralizes assembly and applies
per-section caps.

## Decision 1: Put shared assembly in `src/context/context-builder.ts`

**Decision**: Add a pure context builder that trims sections and returns the composed prompt plus
`ContextSourceTexts`. Route every chat reasoning strategy through it from
`composeReasoningStrategy`, replacing the local `composeContextSources` / `composePrompt` helpers
in `chat-service.ts`.

**Rationale**: HTTP chat already wraps ReAct, Plan-and-Execute, and reflection with
`composeReasoningStrategy`. One builder keeps budget rules identical across those paths and keeps
trimming testable without model calls.

**Alternatives considered**:

- Trim independently inside each strategy: rejected because the spec requires one assembly for all
  chat strategies and would duplicate budget logic.
- Keep composition in `chat-service.ts`: rejected because the requested assembly point is
  `src/context/context-builder.ts` and the service already mixes orchestration with formatting.

**In-repository references**:

- `src/services/chat-service.ts` currently formats summary, history, memories, and the current
  message, then calls `strategy.run` with `input` and `contextSources`.
- `src/http/server.ts` wraps the selected strategy with `composeReasoningStrategy` before
  `runChat`.

## Decision 2: Measure and cap with `estimateTokens`

**Decision**: Apply section budgets using the existing `estimateTokens` helper (characters / 4,
rounded up). Truncate a remaining string to at most `budget * 4` characters so the estimate never
exceeds the integer cap.

**Rationale**: Context metrics already use this estimate. Using it for caps keeps tests and
`contextBreakdown` aligned with the same size units as the spec defaults (200 / 1200 / 300).

**Alternatives considered**:

- Provider tokenizer or LangChain tokenizers: rejected because they are nondeterministic here and
  would diverge from existing estimates.
- Raw character caps: rejected because the spec states budgets in estimated tokens.

**In-repository references**:

- `src/context/tokens.ts` defines `estimateTokens` and source text used for `contextBreakdown`.

## Decision 3: Keep system and current message uncut; trim the other three sections

**Decision**:

- Never shorten `agentInstructions` (system) or `currentMessage`.
- Cap summary at `CONTEXT_BUDGET_SUMMARY` (default 200) by shortening from the end of the summary
  text.
- Cap the history window at `CONTEXT_BUDGET_WINDOW` (default 1200) by dropping oldest messages
  first; if one message remains and still overflows, shorten that message's content.
- Cap memories at `CONTEXT_BUDGET_MEMORY` (default 300) by dropping lowest score first; if one
  memory remains and still overflows, shorten that fact.

Measure each formatted section that is placed into `contextSources`, including its labels, so the
text actually sent is what is capped. A zero budget omits that trimmable section.

**Rationale**: This matches the specified trim order. Whole-item dropping preserves newer window
turns and higher-scoring memories until only one item is left, which must still fit.

**Alternatives considered**:

- Hard-fail when a single remaining item exceeds its cap: rejected because the spec requires the
  remaining item to be shortened rather than exceeding the cap or cutting the current message.
- Cap only item bodies and ignore section labels: rejected because labels are part of the prompt
  that consumes budget.

## Decision 4: Pass scored memories into the builder

**Decision**: Introduce a small scored-memory candidate `{ fact, score }` at the builder
boundary. Have `composeReasoningStrategy` accept those candidates. Sort stably by score
descending (original index as tie-break) and drop from the end of that list.

Chat recall currently discards scores before strategy input. Preserve the score from the recall
ranking step for the builder, without persisting it. Equal scores drop the later-ranked candidate
first.

**Rationale**: Lowest-score dropping cannot be reconstructed from fact strings alone. Recall
already computes `dotProduct` scores and sorts descending; the builder needs that ranking.

**Alternatives considered**:

- Drop memories from the end of the current `Memory[]` recall order without scores: workable if
  order stays score-desc, but tests could not assert score-based order explicitly and equal-score
  ties would depend on `Array.sort` stability.
- Re-embed inside the builder: rejected because it repeats embedding work and pulls I/O into a
  pure function.

**In-repository references**:

- `src/store/sqlite-memory-store.ts` scores memories then returns `Memory[]` without scores.
- `src/services/chat-service.ts` maps recall results to `memories.map(({ fact }) => fact)`.

## Decision 5: Read `CONTEXT_BUDGET_*` through a validated env snapshot

**Decision**: Parse `CONTEXT_BUDGET_SUMMARY`, `CONTEXT_BUDGET_WINDOW`, and
`CONTEXT_BUDGET_MEMORY` with Zod from an env snapshot (default `process.env`). Missing or empty
values use 200 / 1200 / 300. Non-integer or negative values throw at assembly time. Production
assembly loads env; unit tests may pass explicit budgets to the pure trim functions.

**Rationale**: Matches existing env reads (`PORT`, `OPSPILOT_DB`, model config) and Boundary
Security. Explicit budget arguments keep order tests free of global env mutation.

**Alternatives considered**:

- Parse once at process start: harder to vary in tests and delays detection until restart.
- Treat invalid values as unlimited: rejected by the spec.

## Decision 6: Count `historyMessages` after window trimming

**Decision**: `historyMessages` remains the number of raw prior messages supplied to the final
answer-producing strategy. After this feature, that count is the window messages retained by the
builder, not messages dropped for the window budget. Source messages stay persisted.

**Rationale**: Spec 011 already defined the metric as messages supplied to the strategy, excluding
summary and current request. Token-window dropping changes which raw messages are supplied.

**Alternatives considered**:

- Keep counting pre-budget history: rejected because it would report messages the model did not
  receive.

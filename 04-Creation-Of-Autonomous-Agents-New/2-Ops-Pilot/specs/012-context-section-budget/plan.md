# Implementation Plan: Context Section Budget

**Branch**: `012-context-section-budget` | **Date**: 2026-11-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-context-section-budget/spec.md`

## Summary

Assemble every chat strategy prompt in `src/context/context-builder.ts` with per-section estimated
token caps from `CONTEXT_BUDGET_*`. Leave system instructions and the current message uncut. Cap
summary at 200 (shorten to fit), the history window at 1200 (drop oldest first), and memories at
300 (drop lowest score first). Prove trim order with low-cap tests.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 24 LTS, `strict: true`

**Primary Dependencies**: Zod, existing `estimateTokens` / `ContextSourceTexts`, chat service
strategy wrapper, Express HTTP chat entry

**Storage**: None; budgets are process env. Conversation and memory rows are unchanged.

**Testing**: `node:test` through `tsx`; pure builder tests with explicit budgets; chat/HTTP tests
confirm every composed strategy receives the budgeted prompt

**Target Platform**: Linux server

**Project Type**: HTTP web service with agent and context layers

**Performance Goals**: Trimming is linear in candidate section size and adds no model or network
calls.

**Constraints**: System and current message are never shortened. Invalid budget env values fail
closed. Caps use the shared character-based token estimate. Source history and memories are not
deleted when omitted from a prompt.

**Scale/Scope**: One assembled prompt per chat turn, shared by ReAct, Plan-and-Execute, and
reflection; three configurable caps plus two uncut sections.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle or constraint | Status | Plan alignment |
|-------------------------|--------|----------------|
| Boundary Security | PASS | Validate builder input, scored memories, and `CONTEXT_BUDGET_*` with Zod; do not read `.env` files. |
| Predictable Domain | PASS | Keep trimming and budget parsing as pure functions; env snapshot is an argument. |
| Layered Architecture | PASS | Place assembly in `src/context/`; chat service orchestrates; HTTP remains the edge. |
| Verifiable Quality | PASS | Focused `node:test` coverage for order and caps; typecheck and full test suite. |
| SQLite persistence | PASS | No schema change; persisted messages and memories are not deleted by trimming. |
| Secrets and privacy | PASS | Tests use fixtures; no credentials in specs or tests. |

**Gate result**: PASS. No constitution exception or additional project layer is required.

## Project Structure

### Documentation (this feature)

```text
specs/012-context-section-budget/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── context-builder.md
```

### Source Code (repository root)

```text
src/
├── context/
│   ├── tokens.ts
│   ├── context-builder.ts
│   └── context-builder.test.ts
├── services/
│   ├── chat-service.ts
│   └── chat-service.test.ts
├── http/
│   ├── server.ts
│   └── server.test.ts
└── agents/
    └── strategies.test.ts
```

**Structure Decision**: Add the builder beside the existing token estimator. Keep
`composeReasoningStrategy` as the only chat wiring point so all HTTP strategies share the same
budgeted prompt. Tests stay next to source files.

## Design Decisions

1. Export `loadContextBudgets(env)` and `buildContext(input)` from `context-builder.ts`. Production
   assembly reads `process.env`; tests pass explicit budgets and env snapshots.
2. Preserve recall scores as `{ fact, score }` into the builder. Rank by score descending with
   original index as the tie-break, then drop from the end of that list.
3. Format sections with the current labels (`Conversation summary`, `Conversation history`,
   memories wrapper, `Current message`). Measure those formatted strings with `estimateTokens`.
4. After dropping whole window or memory items, if a single remainder still exceeds its cap,
   shorten that item's body so the formatted section fits. Zero caps omit the section.
5. Include a non-empty system section in the assembled prompt and `contextSources.agentInstructions`
   without trimming. Leave it empty when the chat path has no chat-level instructions, matching
   today's empty `agentInstructions` for composed chat calls. Strategy-internal system prompts and
   tool context remain outside these caps.
6. Set `historyMessages` to the retained window length after trimming. `contextBreakdown` uses
   post-budget `contextSources`.

## Constitution Check (Post-Design)

| Gate | Status | Verification |
|------|--------|--------------|
| External data validation | PASS | Zod validates budgets, builder input, and existing context source schema. |
| Domain and side-effect boundaries | PASS | Trimming is pure; env is injected; SQLite is untouched. |
| Persistent data safety | PASS | Trim omits prompt content only; stored messages and memories remain. |
| Testability | PASS | Low-cap order tests need no provider credentials. |
| Existing contracts | PASS | `POST /chat` shape is unchanged; metrics use capped source text. |

**Post-design gate result**: PASS. No unjustified constitution violations.

## Complexity Tracking

No constitution violations. No additional storage, dependency, or architectural layer is planned.

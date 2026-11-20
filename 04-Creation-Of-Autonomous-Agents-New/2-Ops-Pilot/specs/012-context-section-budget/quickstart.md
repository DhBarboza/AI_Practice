# Quickstart: Context Section Budget

## Prerequisites

- Node.js 24 and project dependencies installed.
- Automated checks do not require provider credentials or network access.

## Automated validation

From the project root:

```sh
npm run typecheck
npm test
```

Expected: both commands pass. New tests cover default caps, env overrides, uncut system and
current-message text, and low caps that drop oldest window messages and lowest-scoring memories
first.

## Targeted builder scenarios

```sh
node --import tsx --test \
  src/context/context-builder.test.ts \
  src/services/chat-service.test.ts \
  src/http/server.test.ts \
  src/agents/strategies.test.ts
```

Expected:

- Defaults cap summary at 200, window at 1200, and memories at 300 estimated tokens.
- Low window budgets drop older messages and keep newer ones; a single oversized remainder is
  shortened rather than exceeding the cap.
- Low memory budgets drop lower scores first; equal scores drop the later-ranked candidate.
- System instructions and the current message remain complete under any cap.
- `composeReasoningStrategy` supplies the same budgeted prompt and `contextSources` to each chat
  strategy path.
- `historyMessages` equals retained window messages after trimming.
- Invalid `CONTEXT_BUDGET_*` values fail instead of disabling the cap.

For records and trim transitions, see [data-model.md](./data-model.md). For env names and section
rules, see the [context builder contract](./contracts/context-builder.md).

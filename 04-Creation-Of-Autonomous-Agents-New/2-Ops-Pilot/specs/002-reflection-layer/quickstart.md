# Quickstart: Reflection Layer

## Prerequisites

- Node.js 24 LTS and installed project dependencies.
- For model-backed Arena runs: `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.
- Model-free tests inject a strategy and critic and do not require credentials, network access, or MySQL.

## Validate reflection behavior

```sh
npm test
npm run typecheck
```

Expected outcomes:

- Tests verify `maxReflections: 0` invokes only the base strategy.
- First-pass approval produces one critique and no regeneration.
- Rejections pass feedback into the next generation and stop at the configured maximum, returning the last response.
- Every critic evaluation appears as a `critique` trace event, and metrics include strategy and critic calls.
- Arena tests confirm both reflective names are available and dispatch to their base strategies.

## Run reflective Arena strategies

Both reflective names are included in the Arena's default strategy list.

```sh
npm run arena -- --input "List the firing alerts" \
  --strategies reflect:react,reflect:plan-and-execute \
  --max-iterations 8
```

Expected outcome: one output section per selected strategy with its final answer, ordered trace including critique events, total model-call count including critic and regeneration calls, and elapsed latency. A missing model setting, invalid option, or model/tool error is reported explicitly.

## Reference contracts

- Decorator inputs, retry behavior, trace composition, and metrics: [Reflection Strategy Contract](./contracts/reflection.md)
- Arena reflective names and invocation: [Reflective Arena Contract](./contracts/arena-cli.md)
- Data carried through attempts and critiques: [Data Model](./data-model.md)

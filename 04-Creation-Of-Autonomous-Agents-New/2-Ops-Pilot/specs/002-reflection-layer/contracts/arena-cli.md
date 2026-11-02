# Reflective Arena Contract

The existing Arena strategy selection accepts the reflective names:

```sh
npm run arena -- --input "List firing alerts" \
  --strategies reflect:react,reflect:plan-and-execute \
  --max-iterations 8
```

`reflect:react` wraps the `react` strategy; `reflect:plan-and-execute` wraps `plan-and-execute`. Both are included among the default available strategies. They preserve the existing request, trace, and metrics output format and use the default reflection limit of two.

The Arena still requires the existing `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` configuration for model-backed runs. It must not print secret values. Deterministic tests inject fake strategy/critic behavior and do not make network calls.

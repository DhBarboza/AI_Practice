# Arena CLI Contract

The arena accepts a request as a positional prompt or as `--input`, selects one or more strategies, then prints each run's answer, ordered trace, and metrics.

```text
npm run arena -- --input "List firing alerts" \
  --strategies react,plan-and-execute \
  --max-iterations 8
```

| Option | Required | Contract |
|---|---|---|
| Positional prompt or `--input <text>` | Yes | Non-empty operator request. |
| `--strategies <names>` | No | Comma-separated supported names (`react`, `plan-and-execute`); default selects all available strategies. At least one must be selected. |
| `--max-iterations <integer>` | No | Positive integer tool-action budget; default is 8. Plan-and-Execute additionally caps at eight. |

Unknown flags, unknown strategy names, an empty prompt, an empty strategy selection, or invalid limits fail with a clear non-zero CLI result. Each selected strategy receives the same prompt and limit and starts from the same seeded baseline independently.

The arena requires `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` to run a strategy that invokes a model. It must not print secret values. MySQL is not required for arena runs.

Seed verification:

```text
npm run seed
```

Without MySQL settings, this command verifies/initializes the in-memory seed and reports its service/alert counts. With `MYSQL_DATABASE` and `MYSQL_USER` configured, it also upserts the seed into MySQL and closes the database connection on completion.

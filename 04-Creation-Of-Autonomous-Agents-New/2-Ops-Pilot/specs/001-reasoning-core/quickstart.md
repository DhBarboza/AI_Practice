# Quickstart: OpsPilot Reasoning Core

## Prerequisites

- Node.js 24 LTS and installed project dependencies.
- For model-backed arena runs only: `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.
- For MySQL persistence through the seed command only: set `MYSQL_DATABASE`, `MYSQL_USER`, and optional host, port, and password environment variables in the process environment.

Do not commit credentials or load them from `.env` for the seed command. Deterministic tests and in-memory seed verification do not require model or database credentials.

## Validate offline behavior

```sh
npm test
npm run typecheck
npm run seed
```

Expected outcomes:

- Store and trace tests pass without network calls.
- TypeScript strict checking exits successfully.
- Seed output reports five services and six alerts, including three firing and three resolved. If MySQL settings are absent, it reports that MySQL persistence was skipped.

## Run the arena

```sh
npm run arena -- --input "List the firing alerts" --strategies react,plan-and-execute --max-iterations 8
```

Expected outcome: one section per selected strategy containing its final answer, formatted typed trace, LLM-call count, and latency. Each strategy starts from the same independent seeded baseline. A missing model setting, invalid option, or model/tool error is reported explicitly.

## Reference contracts

- Input/output and trace requirements: [Reasoning Strategy Contract](./contracts/reasoning-strategy.md)
- Tool schemas and state effects: [Operational Tool Contract](./contracts/tools.md)
- CLI options and seed invocation: [Arena CLI Contract](./contracts/arena-cli.md)
- Entity constraints and transitions: [Data Model](./data-model.md)

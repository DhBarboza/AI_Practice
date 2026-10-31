# Quickstart: OpsPilot Reasoning Core

## Prerequisites

- Node.js 24 LTS and installed project dependencies.
- For model-backed arena runs only: `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.
- Model requests prioritize the lowest-latency OpenRouter provider available for the configured model; actual run time still depends on the selected model and provider.

The seed command and deterministic tests use `src/agents/seed-data.json` as their only seed source. They do not require model credentials, database credentials, or network access.

## Validate offline behavior

```sh
npm test
npm run typecheck
npm run seed
```

Expected outcomes:

- Store and trace tests pass without network calls.
- TypeScript strict checking exits successfully.
- Seed output reports that the JSON fixture was loaded into memory and lists five services and six alerts, including three firing and three resolved.

## Run the arena

```sh
npm run arena -- --input "List the firing alerts" --strategies react,plan-and-execute --max-iterations 8
```

Expected outcome: one section per selected strategy containing its final answer, formatted typed trace, LLM-call count, and latency. Each strategy starts from an independent in-memory copy of the JSON seed baseline; tool-created incidents are available to later steps in that run. A missing model setting, invalid option, or model/tool error is reported explicitly.

## Reference contracts

- Input/output and trace requirements: [Reasoning Strategy Contract](./contracts/reasoning-strategy.md)
- Tool schemas and state effects: [Operational Tool Contract](./contracts/tools.md)
- CLI options and seed invocation: [Arena CLI Contract](./contracts/arena-cli.md)
- Entity constraints and transitions: [Data Model](./data-model.md)

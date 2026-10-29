# Implementation Plan: OpsPilot Reasoning Core

**Branch**: `main` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-reasoning-core/spec.md`

## Summary

Provide a common typed reasoning result and deterministic operational tools, then run ReAct and Plan-and-Execute strategies through an OpenRouter-backed model factory. Keep the arena as a CLI entry point, use an in-memory seeded store for repeatable agent runs, and define Sequelize models for MySQL persistence. Verify behavior using offline store/trace tests, the project test and type-check commands, the arena, and the seed script.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 24 LTS, strict mode

**Primary Dependencies**: LangChain JS, LangGraph JS, `@langchain/openai`, Zod, Sequelize 6, `mysql2`, `tsx`

**Storage**: Seeded in-memory store for mock tool execution; MySQL schema/models through Sequelize for persisted service, alert, and incident records

**Testing**: `node:test` through `tsx`; `npm test` and `npm run typecheck`

**Target Platform**: Node.js CLI/service on Linux

**Project Type**: TypeScript backend application with a command-line arena

**Performance Goals**: Report measured run latency; the seeded mock store supports deterministic single-run and strategy-comparison scenarios. No production throughput target is specified.

**Constraints**: Use only `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` for model configuration; never reveal secret values. Set model temperature to zero. Validate external and tool boundaries with Zod. Each strategy respects `maxIterations`; Plan-and-Execute executes at most eight tool steps. Store and trace tests make no network or model calls.

**Scale/Scope**: Five seeded services, six seeded alerts (three firing and three resolved), three operational tools, two strategies, and one arena CLI.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Security at boundaries**: Pass. Validate input, tool schemas, model settings and structured planner output; never print the OpenRouter key.
- **Predictable domain**: Pass. Keep the in-memory store's operations deterministic and isolate model, persistence and CLI effects at the edges.
- **Layered architecture**: Pass with the repository's feature structure: domain types and Sequelize definitions form the model layer, strategy/tool modules provide service behavior, and the arena is the CLI controller. Keep strategy execution separate from CLI argument parsing.
- **Verifiable quality**: Pass. Add offline `node:test` coverage, and run `npm test` and `npm run typecheck`.
- **Versioned specification**: Pass. Feature design lives under `specs/001-reasoning-core/`.

No gate violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/001-reasoning-core/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── arena-cli.md
│   ├── reasoning-strategy.md
│   └── tools.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── database.ts
│   ├── model.ts
│   ├── plan-and-execute.ts
│   ├── react.ts
│   ├── seed-data.ts
│   ├── seed.ts
│   ├── store.ts
│   ├── tools.ts
│   ├── trace.ts
│   ├── types.ts
│   ├── store.test.ts
│   └── trace.test.ts
└── arena.ts
```

**Structure Decision**: Use the existing single TypeScript application and its `src/agents/` feature boundary. Keep shared domain/result types, agent strategies, tools, seed lifecycle and database setup together as reasoning-domain modules; the arena coordinates strategy runs and renders output. Add contracts and validation documentation under the feature spec, not runtime API endpoints. Extend existing modules where appropriate instead of introducing a second application or a parallel test hierarchy.

## Complexity Tracking

No constitution exceptions or additional architectural projects are required.

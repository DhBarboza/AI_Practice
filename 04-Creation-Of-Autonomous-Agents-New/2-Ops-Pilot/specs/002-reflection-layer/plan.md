# Implementation Plan: Reflection Layer

**Branch**: `002-reflection-layer` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-reflection-layer/spec.md`

## Summary

Add a generic reflection decorator for the existing `ReasoningStrategy` contract. It runs the wrapped strategy, evaluates each candidate against trace observations using structured critique output, records each critique in the trace, and reruns the strategy with rejected feedback until approval or the regeneration limit. Reflective Arena entries wrap ReAct and Plan-and-Execute. Model-call counts and total elapsed latency include all strategy runs and critic calls.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 24 LTS, strict mode

**Primary Dependencies**: LangChain JS, `@langchain/openai`, Zod, `tsx`; use the existing `createModel()` OpenRouter configuration and structured-output support.

**Storage**: None added. Each strategy run continues to use the existing isolated in-memory operational store.

**Testing**: `node:test` through `tsx`; add offline unit tests with injected strategy and critic dependencies, then run `npm test` and `npm run typecheck`.

**Target Platform**: Node.js CLI/service on Linux

**Project Type**: TypeScript backend application with a command-line arena

**Performance Goals**: No fixed latency target. The configured maximum bounds extra generations; each generation may have one critic call, with total wall-clock latency measured for the full wrapped run.

**Constraints**: Preserve the `ReasoningStrategy` input/result contract; validate critique output and reflection options with Zod; the default critic uses the same configured OpenRouter model and settings as the base strategies; do not log secrets; zero reflections must not create a critic model or make extra calls.

**Scale/Scope**: One generic decorator, two reflective Arena entries, additive typed trace events and model-call metrics; no persistent schema or new CLI flag.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Security at boundaries**: Pass. Validate reflection options and structured model output; use existing environment validation and do not expose credentials.
- **Predictable domain**: Pass. Reflection control flow and trace composition remain deterministic given strategy and critic outputs; network/model operations stay behind injected/default dependencies.
- **Layered architecture**: Pass. The decorator and critique behavior remain in the agent service layer; the Arena only registers and runs the reflective strategies.
- **Verifiable quality**: Pass. Add deterministic offline `node:test` coverage and preserve `npm test` and strict type-checking.
- **Versioned specification**: Pass. Design and contracts are kept under `specs/002-reflection-layer/`.

No gate violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/002-reflection-layer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── reflection.md
│   └── arena-cli.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── reflection.ts
│   ├── reflection.test.ts
│   ├── types.ts
│   ├── model.ts
│   ├── react.ts
│   └── plan-and-execute.ts
├── arena.ts
└── arena.test.ts
```

**Structure Decision**: Extend the existing single TypeScript application. Keep the reusable decorator and its validation close to the reasoning strategy modules in `src/agents/`; register reflective strategies in the existing Arena registry and extend its tests. The trace union and result schema live in `src/agents/types.ts`. Tests remain alongside their source modules under `src/`.

## Complexity Tracking

No constitution exceptions or additional architectural projects are required.

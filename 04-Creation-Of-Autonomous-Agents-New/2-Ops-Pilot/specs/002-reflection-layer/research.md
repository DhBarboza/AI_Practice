# Research: Reflection Layer

## Decisions

### Reuse the existing strategy contract as the decorator boundary

- **Decision**: Implement reflection as a `ReasoningStrategy` wrapper that invokes the wrapped `run` method for the initial response and each regeneration. Supply rejection feedback by appending it to the original request in the next `ReasoningInput`.
- **Rationale**: Both current strategies already accept the same input and return an answer, ordered trace, and call metrics. Reusing the public contract makes the decorator applicable to either existing or test/future strategies without changing their result shape.
- **Alternatives considered**: Add strategy-specific regeneration methods or couple the wrapper to ReAct and Plan-and-Execute. Those approaches do not satisfy the generic decorator requirement and duplicate control flow.

### Use an injectable structured critic with the configured default model

- **Decision**: Validate the critic result with a strict Zod schema containing boolean `approved` and string `feedback`. The default critic obtains a model through the existing `createModel()` factory and invokes structured output. Expose a critic dependency in the decorator options for deterministic tests and custom strategies whose model differs from the built-in OpenRouter model.
- **Rationale**: This preserves the project's configured OpenRouter model/provider settings for built-in strategies and follows the existing pattern of injectable strategy dependencies for offline tests. A zero reflection limit must return the base result without constructing/invoking the critic. Callers wrapping a custom strategy with another model can supply a critic backed by that same model.
- **Alternatives considered**: Parse free-form model text, which is less reliable; make tests call the network, which is nondeterministic; create a separately configurable model, which could violate the same-model requirement.

### Count all child and critic calls and compose the complete attempt trace

- **Decision**: Add each base/regeneration result's `llmCalls`, add one call per structured critique, append every attempt's trace and one `critique` event per evaluation, and report elapsed wall-clock time for the complete decorated run.
- **Rationale**: Metrics then account for the actual model work at both boundaries. The ordered trace retains observations used to evaluate candidates and makes rejected/approved critique decisions inspectable.
- **Alternatives considered**: Return only the last attempt's metrics/trace, which hides work and violates the acceptance criteria; estimate critic usage indirectly, which can undercount or overcount.

### Add reflective strategies to the existing Arena registry

- **Decision**: Register `reflect:react` and `reflect:plan-and-execute` as wrappers around the existing base strategy instances, so default Arena selection includes them and explicit `--strategies` can select them by name.
- **Rationale**: The Arena already discovers supported choices from a `ReasoningStrategy` registry and derives its defaults from that registry.
- **Alternatives considered**: Add a separate Arena command/flag or duplicate run/output logic, which is unnecessary and inconsistent with the existing CLI contract.

## Repository Evidence

- `src/agents/types.ts` already defines `ReasoningStrategy`, `ReasoningResult`, metrics, and a trace union that includes `critique`.
- `src/agents/model.ts` centralizes OpenRouter configuration and creates the configured model.
- `src/agents/react.ts` and `src/agents/plan-and-execute.ts` return the common result and expose injectable execution dependencies.
- `src/arena.ts` builds the available and default strategy names from the strategy registry.
- `src/agents/strategies.test.ts` and `src/arena.test.ts` provide the existing offline test patterns.

## No Unresolved Research Questions

The repository's strategy contract, model factory, trace schema, and Arena registry establish the integration points. No external API or persistence decisions are needed for this feature.

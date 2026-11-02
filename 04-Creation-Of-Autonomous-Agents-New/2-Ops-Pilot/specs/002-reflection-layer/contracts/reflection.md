# Reflection Strategy Contract

`withReflection(strategy, opts?)` returns a `ReasoningStrategy` with the same `run(input)` interface as the wrapped strategy.

```ts
interface ReflectionOptions {
  maxReflections?: number;
  critic?: (context: CritiqueContext) => Promise<Critique>;
}

interface CritiqueContext {
  input: string;
  answer: string;
  observations: Extract<TraceEvent, { type: "observation" }>[];
}

interface Critique {
  approved: boolean;
  feedback: string;
}
```

The implementation validates options (`maxReflections` is a non-negative integer) and validates the structured critic result. The default maximum is 2. A zero maximum invokes the wrapped strategy once and returns its result without invoking or constructing a critic.

For a positive maximum:

1. Run the wrapped strategy once with the input.
2. Ask the configured critic to assess the response using the original input, its answer, and observation events in the accumulated trace. The default critic uses the same configured OpenRouter model and settings as the built-in strategies. Callers wrapping a custom strategy backed by a different model supply a critic using that strategy's model.
3. Append one `critique` trace event for every evaluation.
4. Return the current candidate if approved.
5. If rejected and regeneration budget remains, rerun the wrapped strategy with the original input plus the rejection feedback in context.
6. If the last allowed critique rejects, return the latest generated response without another regeneration.

The returned trace contains each attempt's events and each decorator critique event in execution order. Returned `metrics.llmCalls` is the sum of all wrapped-strategy calls and one call for each critic invocation. `metrics.latencyMs` is total elapsed wall-clock time for the decorated run.

Errors from strategy execution, model calls, and structured-output validation are surfaced; they do not produce a success-shaped fallback.

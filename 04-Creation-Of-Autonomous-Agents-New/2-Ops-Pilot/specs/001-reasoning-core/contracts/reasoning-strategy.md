# Reasoning Strategy Contract

Each strategy accepts the same input and returns a common result:

```ts
interface ReasoningInput {
  input: string;
  maxIterations: number;
}

interface ReasoningMetrics {
  llmCalls: number;
  latencyMs: number;
}

interface ReasoningResult {
  answer: string;
  trace: TraceEvent[];
  metrics: ReasoningMetrics;
}

interface ReasoningStrategy {
  name: string;
  run(input: ReasoningInput): Promise<ReasoningResult>;
}
```

The `TraceEvent` union supports `thought`, `action`, `observation`, `plan`, `critique`, and `answer`. An action contains the exact tool name and validated arguments; an observation identifies the tool that produced it. Events preserve execution order.

`maxIterations` is a positive integer and limits attempted tool actions. Plan-and-Execute applies the stricter cap `min(maxIterations, 8)`. Metrics count actual model invocations and report total wall-clock latency for the run, including incomplete runs stopped at their action limit.

The strategies may return only an answer if no tools are needed, but must always return an array trace and both metrics fields. Configuration, validation, model, and tool failures must be surfaced explicitly; never return a success-shaped fallback.

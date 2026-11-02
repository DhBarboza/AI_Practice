import assert from "node:assert/strict";
import test from "node:test";
import { withReflection } from "./reflection.js";
import type {
  ReasoningInput,
  ReasoningResult,
  ReasoningStrategy,
} from "./types.js";

function createResult(answer: string, observation: string): ReasoningResult {
  return {
    answer,
    trace: [
      { type: "observation", tool: "list_alerts", content: observation },
      { type: "answer", content: answer },
    ],
    metrics: { llmCalls: 2, latencyMs: 1 },
  };
}

function createStrategy(
  run: (input: ReasoningInput, call: number) => ReasoningResult,
): ReasoningStrategy {
  let calls = 0;
  return {
    name: "test",
    async run(input) {
      calls += 1;
      return run(input, calls);
    },
  };
}

test("reflection returns an initially approved response after one critique", async () => {
  const strategy = createStrategy(() =>
    createResult("There is one firing alert.", "One alert is firing."),
  );
  const critiqueInputs: Array<{ input: string; result: ReasoningResult }> = [];
  const reflected = withReflection(strategy, {
    critic: async (input, result) => {
      critiqueInputs.push({ input, result });
      return { approved: true, feedback: "Supported by the observation." };
    },
  });

  const result = await reflected.run({
    input: "How many alerts are firing?",
    maxIterations: 3,
  });

  assert.equal(result.answer, "There is one firing alert.");
  assert.equal(critiqueInputs.length, 1);
  assert.equal(critiqueInputs[0]?.input, "How many alerts are firing?");
  assert.equal(critiqueInputs[0]?.result.answer, "There is one firing alert.");
  assert.deepEqual(
    critiqueInputs[0]?.result.trace.filter((event) => event.type === "observation"),
    [{ type: "observation", tool: "list_alerts", content: "One alert is firing." }],
  );
  assert.equal(result.metrics.llmCalls, 3);
  assert.equal(result.trace.filter((event) => event.type === "critique").length, 1);
});

test("reflection regenerates with rejection feedback and returns the approved answer", async () => {
  const inputs: ReasoningInput[] = [];
  const strategy = createStrategy((input, call) => {
    inputs.push(input);
    return call === 1
      ? createResult("There are two firing alerts.", "One alert is firing.")
      : createResult("There is one firing alert.", "One alert is firing.");
  });
  let critiques = 0;
  const reflected = withReflection(strategy, {
    maxReflections: 1,
    critic: async (_input, result) => {
      critiques += 1;
      assert.ok(result.trace.some((event) => event.type === "observation"));
      return critiques === 1
        ? { approved: false, feedback: "The observation reports one alert." }
        : { approved: true, feedback: "The answer matches the observation." };
    },
  });

  const result = await reflected.run({
    input: "How many alerts are firing?",
    maxIterations: 3,
  });

  assert.equal(result.answer, "There is one firing alert.");
  assert.equal(inputs.length, 2);
  assert.match(inputs[1]?.input ?? "", /The observation reports one alert\./);
  assert.equal(result.metrics.llmCalls, 6);
  assert.equal(result.trace.filter((event) => event.type === "critique").length, 2);
});

test("zero reflections returns the base result without constructing a critic", async () => {
  const baseResult = createResult("Base answer.", "Observation.");
  let criticCalls = 0;
  const strategy = createStrategy(() => baseResult);
  const reflected = withReflection(strategy, {
    maxReflections: 0,
    critic: async () => {
      criticCalls += 1;
      return { approved: true, feedback: "" };
    },
  });

  const result = await reflected.run({ input: "Question", maxIterations: 1 });

  assert.strictEqual(result, baseResult);
  assert.equal(criticCalls, 0);
});

test("default reflection limit permits two regenerations and returns the last answer", async () => {
  let generations = 0;
  let critiques = 0;
  const strategy = createStrategy(() => {
    generations += 1;
    return createResult(`Candidate ${generations}`, `Observation ${generations}`);
  });
  const reflected = withReflection(strategy, {
    critic: async () => {
      critiques += 1;
      return { approved: false, feedback: `Fix ${critiques}` };
    },
  });

  const result = await reflected.run({ input: "Question", maxIterations: 1 });

  assert.equal(generations, 3);
  assert.equal(critiques, 3);
  assert.equal(result.answer, "Candidate 3");
  assert.equal(result.trace.filter((event) => event.type === "critique").length, 3);
  assert.equal(result.metrics.llmCalls, 9);
});

test("reflection rejects invalid limits and malformed critic output", async () => {
  const strategy = createStrategy(() => createResult("Answer", "Observation"));

  assert.throws(
    () => withReflection(strategy, { maxReflections: -1 }),
    /Too small|greater than or equal to 0/i,
  );
  assert.throws(
    () => withReflection(strategy, { maxReflections: 1.5 }),
    /expected int/i,
  );

  const reflected = withReflection(strategy, {
    maxReflections: 1,
    critic: async () => ({ approved: "yes", feedback: "" }) as never,
  });
  await assert.rejects(
    reflected.run({ input: "Question", maxIterations: 1 }),
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { parseArenaArgs, runArena } from "./arena.js";
import type {
  ReasoningInput,
  ReasoningStrategy,
} from "./agents/types.js";

function createStrategy(
  name: string,
  run: (input: ReasoningInput) => void | Promise<void>,
): ReasoningStrategy {
  return {
    name,
    async run(input) {
      await run(input);
      return {
        answer: `${name} answer`,
        trace: [{ type: "answer", content: `${name} answer` }],
        metrics: { llmCalls: 1, latencyMs: 2 },
      };
    },
  };
}

test("arena parses selected strategies and a shared iteration limit", () => {
  const strategies = [
    createStrategy("react", () => {}),
    createStrategy("plan-and-execute", () => {}),
  ];
  assert.deepEqual(
    parseArenaArgs(
      [
        "--input",
        "List firing alerts",
        "--strategies",
        "react,plan-and-execute",
        "--max-iterations",
        "3",
      ],
      strategies,
    ),
    {
      input: "List firing alerts",
      strategyNames: ["react", "plan-and-execute"],
      maxIterations: 3,
    },
  );
});

test("arena rejects unknown flags, strategies, empty prompts, and invalid limits", () => {
  const strategies = [createStrategy("react", () => {})];
  assert.throws(() => parseArenaArgs(["--mystery", "x"], strategies), /Unknown option/);
  assert.throws(
    () => parseArenaArgs(["question", "--strategies", "unknown"], strategies),
    /Unknown strategy/,
  );
  assert.throws(() => parseArenaArgs(["--input", "  "], strategies), /non-empty/);
  assert.throws(
    () =>
      parseArenaArgs(
        ["question", "--max-iterations", "0"],
        strategies,
      ),
    /positive integer/,
  );
});

test("arena runs each selected strategy with the same input and prints each result", async () => {
  const inputs: ReasoningInput[] = [];
  const strategies = [
    createStrategy("react", (input) => {
      inputs.push(input);
    }),
    createStrategy("plan-and-execute", (input) => {
      inputs.push(input);
    }),
  ];
  const output: string[] = [];

  await runArena(
    [
      "Investigate",
      "the",
      "alerts",
      "--strategies",
      "react,plan-and-execute",
      "--max-iterations",
      "4",
    ],
    strategies,
    (line) => output.push(line),
  );

  assert.deepEqual(inputs, [
    { input: "Investigate the alerts", maxIterations: 4 },
    { input: "Investigate the alerts", maxIterations: 4 },
  ]);
  assert.ok(output.some((line) => line.includes("=== react ===")));
  assert.ok(output.some((line) => line.includes("=== plan-and-execute ===")));
  assert.ok(output.some((line) => line.includes('"llmCalls":1')));
});

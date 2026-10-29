import { planAndExecuteStrategy } from "./agents/plan-and-execute.js";
import { reactStrategy } from "./agents/react.js";
import type { ReasoningStrategy } from "./agents/types.js";
import { formatTrace } from "./agents/trace.js";

const strategies = new Map<string, ReasoningStrategy>([
  [reactStrategy.name, reactStrategy],
  [planAndExecuteStrategy.name, planAndExecuteStrategy],
]);

interface ArenaOptions {
  input: string;
  strategyNames: string[];
  maxIterations: number;
}

function parseArgs(args: string[]): ArenaOptions {
  let input = "";
  let strategyNames = [...strategies.keys()];
  let maxIterations = 8;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--input") {
      input = args[++index] ?? "";
    } else if (arg === "--strategies") {
      const selected = args[++index];
      if (!selected) throw new Error("--strategies requires a comma-separated value.");
      strategyNames = selected.split(",").map((name) => name.trim()).filter(Boolean);
    } else if (arg === "--max-iterations") {
      const value = Number(args[++index]);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error("--max-iterations must be a positive integer.");
      }
      maxIterations = value;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!input) {
      input = arg;
    } else {
      input += ` ${arg}`;
    }
  }

  if (!input.trim()) {
    throw new Error(
      'Provide a prompt as a positional argument or with --input "your request".',
    );
  }
  if (strategyNames.length === 0) {
    throw new Error("Select at least one strategy with --strategies.");
  }
  for (const name of strategyNames) {
    if (!strategies.has(name)) throw new Error(`Unknown strategy: ${name}`);
  }

  return { input, strategyNames, maxIterations };
}

async function main(args: string[]): Promise<void> {
  const options = parseArgs(args);
  for (const name of options.strategyNames) {
    const strategy = strategies.get(name);
    if (!strategy) throw new Error(`Unknown strategy: ${name}`);
    const result = await strategy.run({
      input: options.input,
      maxIterations: options.maxIterations,
    });
    console.log(`\n=== ${strategy.name} ===`);
    console.log(`Answer:\n${result.answer}`);
    console.log(`Trace:\n${formatTrace(result.trace) || "(empty)"}`);
    console.log(
      `Metrics: ${JSON.stringify(result.metrics)}`,
    );
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

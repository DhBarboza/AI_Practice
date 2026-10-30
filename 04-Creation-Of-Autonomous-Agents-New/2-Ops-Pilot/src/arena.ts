import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { z } from "zod";
import { planAndExecuteStrategy } from "./agents/plan-and-execute.js";
import { reactStrategy } from "./agents/react.js";
import type {
  ReasoningInput,
  ReasoningStrategy,
} from "./agents/types.js";
import { formatTrace } from "./agents/trace.js";

const defaultStrategies = new Map<string, ReasoningStrategy>([
  [reactStrategy.name, reactStrategy],
  [planAndExecuteStrategy.name, planAndExecuteStrategy],
]);

export interface ArenaOptions {
  input: string;
  strategyNames: string[];
  maxIterations: number;
}

const ArenaOptionsSchema = z
  .object({
    input: z.string().trim().min(1),
    strategyNames: z.array(z.string().trim().min(1)).min(1),
    maxIterations: z.number().int().positive(),
  })
  .strict();

export type StrategyRegistry = readonly ReasoningStrategy[];

function toStrategyMap(registry: StrategyRegistry): Map<string, ReasoningStrategy> {
  return new Map(registry.map((strategy) => [strategy.name, strategy]));
}

export function parseArenaArgs(
  args: readonly string[],
  registry: StrategyRegistry = [...defaultStrategies.values()],
): ArenaOptions {
  const strategies = toStrategyMap(registry);
  let input = "";
  let strategyNames = [...strategies.keys()];
  let maxIterations = 8;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--input") {
      input = args[index + 1] ?? "";
      if (!input.trim()) throw new Error("--input requires a non-empty prompt.");
      index += 1;
    } else if (arg === "--strategies") {
      const selected = args[index + 1];
      if (!selected) {
        throw new Error("--strategies requires a comma-separated value.");
      }
      strategyNames = selected.split(",").map((name) => name.trim());
      if (strategyNames.some((name) => !name)) {
        throw new Error("--strategies contains an empty strategy name.");
      }
      index += 1;
    } else if (arg === "--max-iterations") {
      const rawValue = args[index + 1];
      const value = Number(rawValue);
      if (!rawValue || !Number.isInteger(value) || value < 1) {
        throw new Error("--max-iterations must be a positive integer.");
      }
      maxIterations = value;
      index += 1;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      input = input ? `${input} ${arg}` : arg;
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

  return ArenaOptionsSchema.parse({ input, strategyNames, maxIterations });
}

export async function runArena(
  args: readonly string[],
  registry: StrategyRegistry = [...defaultStrategies.values()],
  write: (line: string) => void = console.log,
): Promise<void> {
  const strategies = toStrategyMap(registry);
  const options = parseArenaArgs(args, [...strategies.values()]);
  for (const name of options.strategyNames) {
    const strategy = strategies.get(name);
    if (!strategy) throw new Error(`Unknown strategy: ${name}`);
    const reasoningInput: ReasoningInput = {
      input: options.input,
      maxIterations: options.maxIterations,
    };
    const result = await strategy.run(reasoningInput);
    write(`\n=== ${strategy.name} ===`);
    write(`Answer:\n${result.answer}`);
    write(`Trace:\n${formatTrace(result.trace) || "(empty)"}`);
    write(`Metrics: ${JSON.stringify(result.metrics)}`);
  }
}

async function main(args: readonly string[]): Promise<void> {
  try {
    await runArena(args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  await main(process.argv.slice(2));
}

import { planAndExecuteStrategy } from "./plan-and-execute.js";
import { reactStrategy } from "./react.js";
import type { ReasoningStrategy } from "./types.js";

export const agentRegistry: ReadonlyMap<string, ReasoningStrategy> = new Map([
  [reactStrategy.name, reactStrategy],
  [planAndExecuteStrategy.name, planAndExecuteStrategy],
]);

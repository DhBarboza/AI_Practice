import {
  createPlanAndExecuteStrategy,
  planAndExecuteStrategy,
} from "./plan-and-execute.js";
import { createReactStrategy, reactStrategy } from "./react.js";
import type { OpsStore } from "./store.js";
import type { ReasoningStrategy } from "./types.js";

export function createAgentRegistry(store?: OpsStore): ReadonlyMap<string, ReasoningStrategy> {
  const react = store
    ? createReactStrategy({ createStore: () => store })
    : reactStrategy;
  const planAndExecute = store
    ? createPlanAndExecuteStrategy({ createStore: () => store })
    : planAndExecuteStrategy;

  return new Map([
    [react.name, react],
    [planAndExecute.name, planAndExecute],
  ]);
}

export const agentRegistry = createAgentRegistry();

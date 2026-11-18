import {
  createPlanAndExecuteStrategy,
  planAndExecuteStrategy,
} from "./plan-and-execute.js";
import { createReactStrategy, reactStrategy } from "./react.js";
import type { OpsStore } from "./store.js";
import type { ReasoningStrategy } from "./types.js";
import type { MemoryStore } from "../memory/memory-store.js";

export function createAgentRegistry(
  store?: OpsStore,
  memoryStore?: MemoryStore,
): ReadonlyMap<string, ReasoningStrategy> {
  const react = store || memoryStore
    ? createReactStrategy({
        ...(store ? { createStore: () => store } : {}),
        ...(memoryStore ? { memoryStore } : {}),
      })
    : reactStrategy;
  const planAndExecute = store || memoryStore
    ? createPlanAndExecuteStrategy({
        ...(store ? { createStore: () => store } : {}),
        ...(memoryStore ? { memoryStore } : {}),
      })
    : planAndExecuteStrategy;

  return new Map([
    [react.name, react],
    [planAndExecute.name, planAndExecute],
  ]);
}

export const agentRegistry = createAgentRegistry();

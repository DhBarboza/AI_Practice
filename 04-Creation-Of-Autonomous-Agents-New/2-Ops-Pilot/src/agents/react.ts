import { HumanMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemoryOpsStore } from "./store.js";
import type { OpsStore } from "./store.js";
import { createModel } from "./model.js";
import { createChatOpsTools, createOpsTools } from "./tools.js";
import type { ChatMemoryContext } from "./tools.js";
import type { MemoryStore } from "../memory/memory-store.js";
import { countAiMessages, lastText, toTrace } from "./helpers.js";
import { ReasoningResultSchema } from "./types.js";
import { assertValidReasoningInput } from "./types.js";
import type {
  ReasoningInput,
  ReasoningResult,
  ReasoningStrategy,
} from "./types.js";

type AgentRunner = (
  input: string,
  maxIterations: number,
  store: OpsStore,
  allowToolCall: () => boolean,
  memoryContext?: ChatMemoryContext,
) => Promise<readonly BaseMessage[]>;

interface ReactDependencies {
  runAgent?: AgentRunner;
  createStore?: () => OpsStore;
  memoryStore?: MemoryStore;
}

const runPrebuiltReactAgent: AgentRunner = async (
  input,
  maxIterations,
  store,
  allowToolCall,
  memoryContext,
) => {
  const tools = memoryContext
    ? createChatOpsTools(
        store,
        () => allowToolCall(),
        fetch,
        memoryContext,
      )
    : createOpsTools(store, () => allowToolCall());
  const agent = createReactAgent({ llm: createModel(), tools: [...tools] });
  const result = await agent.invoke(
    { messages: [new HumanMessage(input)] },
    { recursionLimit: 2 * maxIterations + 3 },
  );
  return result.messages;
};

export function createReactStrategy(
  dependencies: ReactDependencies = {},
): ReasoningStrategy {
  const runAgent = dependencies.runAgent ?? runPrebuiltReactAgent;

  return {
    name: "react",
    async run(input: ReasoningInput): Promise<ReasoningResult> {
      assertValidReasoningInput(input);
      const startedAt = performance.now();
      const store = dependencies.createStore?.() ?? new MemoryOpsStore();
      const memoryContext =
        input.userId && dependencies.memoryStore
          ? {
              memoryStore: dependencies.memoryStore,
              userId: input.userId,
            }
          : undefined;
      let toolCalls = 0;
      const messages = await runAgent(
        input.input,
        input.maxIterations,
        store,
        () => {
          if (toolCalls >= input.maxIterations) return false;
          toolCalls += 1;
          return true;
        },
        memoryContext,
      );

      const answer = lastText(messages);
      if (!answer) {
        throw new Error("ReAct agent completed without a final answer.");
      }

      return ReasoningResultSchema.parse({
        answer,
        trace: toTrace(messages),
        metrics: {
          llmCalls: countAiMessages(messages),
          latencyMs: Math.max(0, performance.now() - startedAt),
        },
      });
    },
  };
}

export const reactStrategy = createReactStrategy();

export async function runReact(
  input: ReasoningInput | string,
): Promise<ReasoningResult> {
  return reactStrategy.run(
    typeof input === "string" ? { input, maxIterations: 8 } : input,
  );
}

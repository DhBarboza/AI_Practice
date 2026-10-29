import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createModel } from "./model.js";
import { MemoryOpsStore } from "./store.js";
import { createOpsTools } from "./tools.js";
import { assertValidReasoningInput } from "./types.js";
import type {
  ReasoningInput,
  ReasoningResult,
  ReasoningStrategy,
  TraceEvent,
} from "./types.js";

function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");
  return content
    .map((part: unknown) => {
      if (typeof part === "string") return part;
      if (
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return part.text;
      }
      return JSON.stringify(part);
    })
    .join("\n");
}

export const reactStrategy: ReasoningStrategy = {
  name: "react",
  async run(input: ReasoningInput): Promise<ReasoningResult> {
    assertValidReasoningInput(input);
    const startedAt = performance.now();
    let toolIterations = 0;
    const tools = createOpsTools(new MemoryOpsStore(), () => {
      if (toolIterations >= input.maxIterations) return false;
      toolIterations += 1;
      return true;
    });
    const agent = createReactAgent({ llm: createModel(), tools: [...tools] });
    const result = await agent.invoke(
      { messages: [new HumanMessage(input.input)] },
      { recursionLimit: 2 * input.maxIterations + 3 },
    );

    const trace: TraceEvent[] = [];
    let answer = "";
    for (const message of result.messages) {
      if (message instanceof AIMessage) {
        const content = messageText(message.content);
        const toolCalls = message.tool_calls ?? [];
        if (toolCalls.length > 0) {
          if (content.trim()) trace.push({ type: "thought", content });
          for (const call of toolCalls) {
            trace.push({
              type: "action",
              tool: call.name,
              args: call.args,
            });
          }
        } else if (content.trim()) {
          answer = content;
          trace.push({ type: "answer", content });
        }
      } else if (message instanceof ToolMessage) {
        trace.push({
          type: "observation",
          tool: message.name ?? message.tool_call_id,
          content: messageText(message.content),
        });
      }
    }

    if (!answer) throw new Error("ReAct agent completed without a final answer.");
    return {
      answer,
      trace,
      metrics: {
        llmCalls: result.messages.filter((message) => message instanceof AIMessage)
          .length,
        latencyMs: Math.round(performance.now() - startedAt),
      },
    };
  },
};

export async function runReact(
  input: ReasoningInput,
): Promise<ReasoningResult> {
  return reactStrategy.run(input);
}

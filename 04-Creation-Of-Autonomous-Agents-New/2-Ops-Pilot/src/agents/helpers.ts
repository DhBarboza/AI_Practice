import { AIMessage, ToolMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import type { TraceEvent } from "./types.js";

export function messageText(content: unknown): string {
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

export function lastText(messages: readonly BaseMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message instanceof AIMessage) {
      const content = messageText(message.content).trim();
      if (content) return content;
    }
  }
  return "";
}

export function toTrace(messages: readonly BaseMessage[]): TraceEvent[] {
  const trace: TraceEvent[] = [];

  for (const message of messages) {
    if (message instanceof AIMessage) {
      for (const call of message.tool_calls ?? []) {
        trace.push({
          type: "thought",
          content: "The agent selected an operational tool for the request.",
        });
        trace.push({
          type: "action",
          tool: call.name,
          args: call.args,
        });
      }
    } else if (message instanceof ToolMessage) {
      trace.push({
        type: "observation",
        tool: message.name ?? message.tool_call_id,
        content: messageText(message.content),
      });
    }
  }

  const answer = lastText(messages);
  if (answer) trace.push({ type: "answer", content: answer });
  return trace;
}

export function countAiMessages(messages: readonly BaseMessage[]): number {
  return messages.filter((message) => message instanceof AIMessage).length;
}

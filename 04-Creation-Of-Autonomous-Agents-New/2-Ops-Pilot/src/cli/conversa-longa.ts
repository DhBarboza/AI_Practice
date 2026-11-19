import { pathToFileURL } from "node:url";
import { ChatResponseSchema } from "../services/chat-service.js";

const DEFAULT_MESSAGES = [
  "Show me the current firing alerts.",
  "Which service has the highest severity?",
  "Summarize the most urgent issue and its owner.",
];

export interface LongConversationOptions {
  baseUrl?: string;
  userId?: string;
  messages?: readonly string[];
  fetchImpl?: typeof fetch;
  writeLine?: (line: string) => void;
}

export async function runLongConversation(
  options: LongConversationOptions = {},
): Promise<void> {
  const baseUrl =
    options.baseUrl ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
  const endpoint = new URL("/chat", baseUrl);
  const userId = options.userId ?? "conversa-longa";
  const messages = options.messages ?? DEFAULT_MESSAGES;
  const fetchImpl = options.fetchImpl ?? fetch;
  const writeLine = options.writeLine ?? console.log;
  let conversationId: string | undefined;

  for (const [index, message] of messages.entries()) {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId,
        message,
        ...(conversationId ? { conversationId } : {}),
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Chat request for turn ${index + 1} failed with HTTP ` +
          `${response.status} ${response.statusText}.`,
      );
    }

    const result = ChatResponseSchema.parse(await response.json());
    if (conversationId && result.conversationId !== conversationId) {
      throw new Error(
        `Chat request for turn ${index + 1} returned a different conversation ID.`,
      );
    }
    conversationId = result.conversationId;
    writeLine(
      `Turn ${index + 1}: promptTokens=${result.metrics.promptTokens ?? "unavailable"}`,
    );
  }
}

async function main(): Promise<void> {
  await runLongConversation();
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Chat exercise failed.");
    process.exitCode = 1;
  });
}

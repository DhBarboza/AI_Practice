import { ChatOpenAI } from "@langchain/openai";

const openRouterBaseUrl = "https://openrouter.ai/api/v1";

export function createModel(): ChatOpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is required.");
  if (!model) throw new Error("OPENROUTER_MODEL is required.");

  return new ChatOpenAI({
    apiKey,
    model,
    temperature: 0,
    configuration: { baseURL: openRouterBaseUrl },
  });
}

import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

export const openRouterBaseUrl = "https://openrouter.ai/api/v1";

export interface OpenRouterModelConfig {
  apiKey: string;
  model: string;
  temperature: 0;
  modelKwargs: { provider: { sort: "latency" } };
  configuration: { baseURL: string };
}

export interface OpenRouterEnvironment {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
}

const OpenRouterEnvironmentSchema = z
  .object({
    OPENROUTER_API_KEY: z.string().trim().min(1),
    OPENROUTER_MODEL: z.string().trim().min(1),
  });

export function getOpenRouterModelConfig(
  env: OpenRouterEnvironment,
): OpenRouterModelConfig {
  const parsed = OpenRouterEnvironmentSchema.safeParse(env);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    throw new Error(`${String(field ?? "OpenRouter configuration")} is required.`);
  }

  return {
    apiKey: parsed.data.OPENROUTER_API_KEY,
    model: parsed.data.OPENROUTER_MODEL,
    temperature: 0 as const,
    modelKwargs: { provider: { sort: "latency" } },
    configuration: { baseURL: openRouterBaseUrl },
  };
}

export function createModel(): ChatOpenAI {
  return new ChatOpenAI(getOpenRouterModelConfig(process.env));
}

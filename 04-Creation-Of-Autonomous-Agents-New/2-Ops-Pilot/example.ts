// referência para a factory src/agents/model.ts
import { ChatOpenAI } from "@langchain/openai";

export function createModel() {
    return new ChatOpenAI({
        model: process.env.OPENROUTER_MODEL ?? "",
        apiKey: process.env.OPENROUTER_API_KEY ?? "",
        configuration: { baseURL: "https://openrouter.ai/api/v1" },
        temperature: 0,
    });
}

// src/agents/tools.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { store } from "./ops-store.ts";

export const listAlerts = tool(
    async ({ status }) => JSON.stringify(store.listAlerts(status)),
    {
        name: "list_alerts",
        description:
            "Lista os alertas de monitoramento. Use quando o plantonista perguntar o que está disparando, o estado dos serviços ou 'como está o plantão'. status: firing | resolved | all",
        schema: z.object({
            status: z.enum(["firing", "resolved", "all"]).optional(),
        }),
    },
);

// src/agents/react.ts
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createModel } from "./model.ts";
import { opsTools } from "./tools.ts";
import { lastText, toTrace, countAiMessages } from "./helpers.ts";
import type { ReasoningStrategy } from "./types.ts";

export const reactStrategy: ReasoningStrategy = {
    name: "react",
    async run(input) {
        const started = Date.now();

        const agent = createReactAgent({
            llm: createModel(),
            tools: opsTools,
        });

        const result = await agent.invoke(
            { messages: [{ role: "user", content: input }] },
            { recursionLimit: 12 }, // guardrail: nada de loop infinito
        );

        return {
            answer: lastText(result.messages),
            trace: toTrace(result.messages),
            metrics: {
                llmCalls: countAiMessages(result.messages),
                latencyMs: Date.now() - started,
            },
        };
    },
};

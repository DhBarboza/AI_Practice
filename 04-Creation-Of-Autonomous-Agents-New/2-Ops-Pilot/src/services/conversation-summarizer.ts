import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import { createModel } from "../agents/model.js";
import type { ConversationMessage } from "../store/conversation-store.js";

export const SUMMARIZER_PROMPT = `Resuma o trecho de conversa em no máximo 150 tokens, preservando
obrigatoriamente: decisões tomadas, fatos estabelecidos (nomes, datas, prazos, preferências),
incidentes abertos/resolvidos e pendências abertas. Descarte cumprimentos e conversa social.
Se houver um resumo anterior, incorpore-o ao novo resumo, mesclando sem duplicar.
Responda só o resumo, em tópicos telegráficos.`;

export const ConversationSummaryOutputSchema = z
  .object({
    summary: z.string().trim().min(1),
  })
  .strict();

const ConversationSummaryModelResponseSchema = z
  .object({
    raw: z.unknown(),
    parsed: ConversationSummaryOutputSchema,
  })
  .strict();

export const ConversationSummaryResultSchema = z
  .object({
    summary: z.string().trim().min(1),
    inputTokens: z.number().int().nonnegative().nullable(),
  })
  .strict();

export interface ConversationSummaryInput {
  previousSummary: string | null;
  messages: readonly ConversationMessage[];
}

export type ConversationSummaryResult = z.infer<
  typeof ConversationSummaryResultSchema
>;

export interface ConversationSummarizer {
  summarize(input: ConversationSummaryInput): Promise<ConversationSummaryResult>;
}

export type ConversationSummaryModelInvoker = (
  messages: readonly BaseMessage[],
) => Promise<unknown>;

export function formatConversationSummaryInput(
  input: ConversationSummaryInput,
): string {
  const sections: string[] = [];
  if (input.previousSummary) {
    sections.push(`Resumo anterior:\n${input.previousSummary}`);
  }
  sections.push(
    [
      "Trecho de conversa:",
      ...input.messages.map(
        ({ role, content }) =>
          `${role === "user" ? "User" : "Assistant"}: ${content}`,
      ),
    ].join("\n"),
  );
  return sections.join("\n\n");
}

async function invokeSummaryModel(
  messages: readonly BaseMessage[],
): Promise<unknown> {
  const model = createModel().withStructuredOutput(
    ConversationSummaryOutputSchema,
    { includeRaw: true },
  );
  return model.invoke([...messages]);
}

export function createConversationSummarizer(
  invoke: ConversationSummaryModelInvoker = invokeSummaryModel,
): ConversationSummarizer {
  return {
    async summarize(input): Promise<ConversationSummaryResult> {
      const response = ConversationSummaryModelResponseSchema.parse(
        await invoke([
          new SystemMessage(SUMMARIZER_PROMPT),
          new HumanMessage(formatConversationSummaryInput(input)),
        ]),
      );
      const inputTokens =
        response.raw instanceof AIMessage
          ? (response.raw.usage_metadata?.input_tokens ?? null)
          : null;

      return ConversationSummaryResultSchema.parse({
        summary: response.parsed.summary,
        inputTokens,
      });
    },
  };
}

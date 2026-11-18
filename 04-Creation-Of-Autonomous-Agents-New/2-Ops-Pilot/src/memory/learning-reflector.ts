import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { createModel } from "../agents/model.js";
import {
  MemoryFactSchema,
  MemoryUserIdSchema,
} from "./memory-store.js";
import type { MemoryStore } from "./memory-store.js";

export const LearningResultSchema = z
  .object({
    hasLearning: z.boolean(),
    fact: z.string().nullable(),
  })
  .strict()
  .superRefine(({ hasLearning, fact }, context) => {
    if (hasLearning && (!fact || fact.trim().length === 0)) {
      context.addIssue({
        code: "custom",
        path: ["fact"],
        message: "A positive learning result requires a non-empty fact.",
      });
    }
  });

export type LearningResult = z.infer<typeof LearningResultSchema>;
export type LearningAssessor = (message: string) => Promise<unknown>;

export interface LearningReflector {
  learn(userId: string, message: string): Promise<void>;
}

export interface CreateLearningReflectorOptions {
  memoryStore: Pick<MemoryStore, "remember">;
  assess?: LearningAssessor;
}

const LEARNING_INSTRUCTIONS = [
  "Identify at most one durable user preference or stable, reusable user fact.",
  "Evaluate only the latest user message provided to you.",
  "Do not learn one-off requests, task instructions, temporary status, or facts relevant only to the current task.",
  "Never extract, repeat, or store passwords, tokens, API keys, private keys, recovery codes, or other authentication credentials.",
  "If there is no safe, durable fact, return hasLearning=false and fact=null.",
  "When there is a safe, durable fact, return hasLearning=true and one concise, standalone fact.",
].join("\n");

const CREDENTIAL_PATTERNS = [
  /\b(?:password|passwd|passphrase|api[ _-]?key|access[ _-]?token|refresh[ _-]?token|auth(?:entication)?[ _-]?token|client[ _-]?secret|secret|private[ _-]?key|ssh[ _-]?key|recovery[ _-]?code|token|credential)\b\s*(?::|=|is)\s*\S+/i,
  /\b(?:authorization|database[_-]?url|db[_-]?url|connection[_-]?string)\s*[:=]\s*\S+/i,
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/i,
  /\bBasic\s+[A-Za-z0-9+/]+=*/i,
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i,
  /\b(?:ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]+|xox[baprs]-[A-Za-z0-9-]+|AKIA[A-Z0-9]{8,})\b/i,
];

function containsCredentialLikeContent(value: string): boolean {
  return CREDENTIAL_PATTERNS.some((pattern) => pattern.test(value));
}

async function assessWithModel(message: string): Promise<unknown> {
  const model = createModel().withStructuredOutput(LearningResultSchema);
  return model.invoke([
    new SystemMessage(LEARNING_INSTRUCTIONS),
    new HumanMessage(message),
  ]);
}

export function createLearningReflector({
  memoryStore,
  assess = assessWithModel,
}: CreateLearningReflectorOptions): LearningReflector {
  return {
    async learn(userId, message): Promise<void> {
      const validatedUserId = MemoryUserIdSchema.parse(userId);
      const validatedMessage = z.string().trim().min(1).parse(message);
      const result = LearningResultSchema.parse(await assess(validatedMessage));

      if (!result.hasLearning || result.fact === null) return;
      const fact = MemoryFactSchema.parse(result.fact);
      if (
        containsCredentialLikeContent(validatedMessage) ||
        containsCredentialLikeContent(fact)
      ) {
        return;
      }

      await memoryStore.remember(validatedUserId, fact);
    },
  };
}

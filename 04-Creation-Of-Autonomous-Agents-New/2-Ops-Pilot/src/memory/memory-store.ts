import { z } from "zod";

export const MEMORY_EMBEDDING_DIMENSIONS = 384;
export const MEMORY_EMBEDDING_BYTE_LENGTH = MEMORY_EMBEDDING_DIMENSIONS * 4;
export const MIN_MEMORY_RECALL_SCORE = 0.3;
export const MEMORY_DEDUPLICATION_SCORE = 0.92;

export const MemoryUserIdSchema = z.string().trim().min(1);
export const MemoryFactSchema = z.string().trim().min(1);
export const RecallLimitSchema = z.number().int().positive().max(3).default(3);

export const MemoryEmbeddingSchema = z
  .array(z.number().finite())
  .length(MEMORY_EMBEDDING_DIMENSIONS);

export const MemorySchema = z
  .object({
    id: z.string().min(1),
    userId: MemoryUserIdSchema,
    fact: MemoryFactSchema,
    embedding: MemoryEmbeddingSchema,
    createdAt: z.string().datetime(),
  })
  .strict();

export type MemoryEmbedding = z.infer<typeof MemoryEmbeddingSchema>;
export type Memory = z.infer<typeof MemorySchema>;
export type MemoryEmbedder = (text: string) => Promise<MemoryEmbedding>;

export function dotProduct(
  left: MemoryEmbedding,
  right: MemoryEmbedding,
): number {
  const leftVector = MemoryEmbeddingSchema.parse(left);
  const rightVector = MemoryEmbeddingSchema.parse(right);
  let score = 0;
  for (let index = 0; index < MEMORY_EMBEDDING_DIMENSIONS; index += 1) {
    score += leftVector[index]! * rightVector[index]!;
  }
  return score;
}

export function isRelevantMemoryScore(score: number): boolean {
  return score > MIN_MEMORY_RECALL_SCORE;
}

export function isDuplicateMemoryScore(score: number): boolean {
  return score > MEMORY_DEDUPLICATION_SCORE;
}

export interface MemoryStore {
  remember(userId: string, fact: string): Promise<void>;
  recall(userId: string, query: string, k?: number): Promise<Memory[]>;
  forget(userId: string, fact: string): Promise<boolean>;
}

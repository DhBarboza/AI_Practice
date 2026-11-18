import { pipeline } from "@huggingface/transformers";
import { z } from "zod";
import {
  MemoryEmbeddingSchema,
  type MemoryEmbedding,
} from "./memory-store.js";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

const EmbeddingInputSchema = z.string().trim().min(1);
const EmbeddingOutputBatchSchema = z.array(z.unknown()).length(1);

interface EmbeddingTensor {
  tolist(): unknown;
}

interface EmbeddingPipelineOptions {
  pooling: "mean";
  normalize: true;
}

type EmbeddingPipeline = (
  text: string,
  options: EmbeddingPipelineOptions,
) => Promise<EmbeddingTensor>;

type EmbeddingPipelineLoader = () => Promise<EmbeddingPipeline>;

async function loadModelPipeline(): Promise<EmbeddingPipeline> {
  return pipeline("feature-extraction", MODEL_ID);
}

export function createEmbeddingService(
  loadPipeline: EmbeddingPipelineLoader = loadModelPipeline,
): { embed(text: string): Promise<MemoryEmbedding> } {
  let pipelinePromise: Promise<EmbeddingPipeline> | undefined;

  return {
    async embed(text): Promise<MemoryEmbedding> {
      const input = EmbeddingInputSchema.parse(text);
      pipelinePromise ??= Promise.resolve()
        .then(loadPipeline)
        .catch((error: unknown) => {
          pipelinePromise = undefined;
          throw error;
        });

      const extractor = await pipelinePromise;
      const output = await extractor(input, {
        pooling: "mean",
        normalize: true,
      });
      const [embedding] = EmbeddingOutputBatchSchema.parse(output.tolist());
      return MemoryEmbeddingSchema.parse(embedding);
    },
  };
}

const localEmbeddingService = createEmbeddingService();

export function embedText(text: string): Promise<MemoryEmbedding> {
  return localEmbeddingService.embed(text);
}

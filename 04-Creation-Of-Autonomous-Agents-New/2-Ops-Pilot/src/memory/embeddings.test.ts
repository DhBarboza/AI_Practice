import assert from "node:assert/strict";
import test from "node:test";
import { createEmbeddingService } from "./embeddings.js";

const validEmbedding = Array.from({ length: 384 }, (_value, index) =>
  index === 0 ? 1 : 0,
);

test("embedding service loads one pipeline lazily and shares it across concurrent calls", async () => {
  let loads = 0;
  const calls: Array<{
    text: string;
    options: { pooling: "mean"; normalize: true };
  }> = [];
  const service = createEmbeddingService(async () => {
    loads += 1;
    return async (text, options) => {
      calls.push({ text, options });
      return { tolist: () => [validEmbedding] };
    };
  });

  assert.equal(loads, 0);
  const results = await Promise.all([
    service.embed("first fact"),
    service.embed("second fact"),
  ]);

  assert.equal(loads, 1);
  assert.deepEqual(results, [validEmbedding, validEmbedding]);
  assert.deepEqual(calls, [
    { text: "first fact", options: { pooling: "mean", normalize: true } },
    { text: "second fact", options: { pooling: "mean", normalize: true } },
  ]);
});

test("embedding service rejects invalid text and malformed model output", async () => {
  let loads = 0;
  const service = createEmbeddingService(async () => {
    loads += 1;
    return async () => ({ tolist: () => [Array(383).fill(0)] });
  });

  await assert.rejects(service.embed("  "));
  assert.equal(loads, 0);
  await assert.rejects(service.embed("valid input"));
  assert.equal(loads, 1);
});

test("embedding service retries after pipeline initialization fails", async () => {
  let attempts = 0;
  const service = createEmbeddingService(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("model initialization failed");
    return async () => ({ tolist: () => [validEmbedding] });
  });

  await assert.rejects(service.embed("fact"), /model initialization failed/);
  assert.deepEqual(await service.embed("fact"), validEmbedding);
  assert.equal(attempts, 2);
});

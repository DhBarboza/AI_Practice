import assert from "node:assert/strict";
import test from "node:test";
import {
  MEMORY_EMBEDDING_DIMENSIONS,
  dotProduct,
  isDuplicateMemoryScore,
  isRelevantMemoryScore,
} from "./memory-store.js";

function vector(first: number, second = 0): number[] {
  return [
    first,
    second,
    ...Array.from({ length: MEMORY_EMBEDDING_DIMENSIONS - 2 }, () => 0),
  ];
}

test("dot product scores validated embedding vectors", () => {
  assert.equal(dotProduct(vector(0.5, 0.25), vector(0.5, 0.5)), 0.375);
  assert.throws(() => dotProduct([1], vector(1)));
});

test("memory score cutoffs are strict", () => {
  assert.equal(isRelevantMemoryScore(0.3), false);
  assert.equal(isRelevantMemoryScore(0.3001), true);
  assert.equal(isDuplicateMemoryScore(0.92), false);
  assert.equal(isDuplicateMemoryScore(0.9201), true);
});

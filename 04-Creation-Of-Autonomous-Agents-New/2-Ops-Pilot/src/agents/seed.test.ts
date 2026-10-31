import assert from "node:assert/strict";
import test from "node:test";
import { getSeedSummary, runSeed } from "./seed.js";
import { MemoryOpsStore } from "./store.js";

test("reinitializing the seeded store produces the same baseline without duplicates", () => {
  const first = new MemoryOpsStore();
  const second = new MemoryOpsStore();

  assert.deepEqual(second.listServices(), first.listServices());
  assert.deepEqual(second.listAlerts(), first.listAlerts());
  assert.equal(second.listServices().length, 5);
  assert.equal(second.listAlerts().length, 6);
  assert.equal(second.listAlerts("firing").length, 3);
  assert.equal(second.listAlerts("resolved").length, 3);
  assert.deepEqual(getSeedSummary(second), {
    services: 5,
    alerts: 6,
    firingAlerts: 3,
    resolvedAlerts: 3,
  });
});

test("seed script reports the JSON-backed in-memory baseline", async () => {
  const output: string[] = [];
  const summary = await runSeed((message) => output.push(message));

  assert.deepEqual(summary, {
    services: 5,
    alerts: 6,
    firingAlerts: 3,
    resolvedAlerts: 3,
  });
  assert.deepEqual(output, [
    "Loaded src/agents/seed-data.json into the in-memory store with 5 services and 6 alerts (3 firing, 3 resolved).",
  ]);
});

import assert from "node:assert/strict";
import test from "node:test";
import { getSeedSummary } from "./seed.js";
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

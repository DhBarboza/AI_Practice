import assert from "node:assert/strict";
import test from "node:test";
import { MemoryOpsStore } from "./store.js";

test("the seeded store contains five services and six alerts split evenly by status", () => {
  const store = new MemoryOpsStore();
  const alerts = store.listAlerts();

  assert.equal(store.listServices().length, 5);
  assert.equal(alerts.length, 6);
  assert.equal(store.listAlerts("firing").length, 3);
  assert.equal(store.listAlerts("resolved").length, 3);
});

test("store reads return copies and incident lifecycle changes are isolated", () => {
  const store = new MemoryOpsStore();
  const returnedAlert = store.listAlerts()[0];
  assert.ok(returnedAlert);
  returnedAlert.title = "mutated outside the store";
  assert.notEqual(store.listAlerts()[0]?.title, returnedAlert.title);

  const incident = store.openIncident(
    "Checkout errors",
    "Checkout",
    "critical",
  );
  assert.equal(incident.id, "inc-001");
  assert.equal(store.resolveIncident(incident.id).status, "resolved");
  assert.throws(() => store.resolveIncident("missing"), /Unknown incident/);
  assert.throws(
    () => store.openIncident("Unknown service", "Unknown", "low"),
    /Unknown service/,
  );
});

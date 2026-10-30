import assert from "node:assert/strict";
import test from "node:test";
import {
  IncidentAlreadyResolvedError,
  MemoryOpsStore,
  UnknownIncidentError,
  UnknownServiceError,
} from "./store.js";
import { seedAlerts, seedServices } from "./seed-data.js";

test("the seeded store contains five services and six alerts split evenly by status", () => {
  const store = new MemoryOpsStore();
  const alerts = store.listAlerts();

  assert.equal(store.listServices().length, 5);
  assert.equal(alerts.length, 6);
  assert.equal(store.listAlerts("firing").length, 3);
  assert.equal(store.listAlerts("resolved").length, 3);
  assert.equal(store.listAlerts("all").length, 6);
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
  assert.throws(
    () => store.resolveIncident(incident.id),
    IncidentAlreadyResolvedError,
  );
  assert.throws(() => store.resolveIncident("missing"), UnknownIncidentError);
  assert.throws(
    () => store.openIncident("Unknown service", "Unknown", "low"),
    UnknownServiceError,
  );
  assert.equal(store.listIncidents().length, 1);
});

test("store constructor validates records, duplicate identifiers, and service references", () => {
  assert.throws(
    () =>
      new MemoryOpsStore(
        [{ ...seedServices[0]!, name: "" }],
        [],
      ),
  );
  assert.throws(
    () => new MemoryOpsStore([seedServices[0]!, seedServices[0]!], []),
    /Duplicate service ID/,
  );
  assert.throws(
    () =>
      new MemoryOpsStore(seedServices, [
        { ...seedAlerts[0]!, service: "Unknown" },
      ]),
    UnknownServiceError,
  );
});

test("failed incident operations do not mutate seeded store data", () => {
  const store = new MemoryOpsStore();
  assert.throws(() => store.openIncident("", "Checkout", "critical"));
  assert.throws(() => store.openIncident("Bad service", "Unknown", "critical"));
  assert.equal(store.listIncidents().length, 0);
});

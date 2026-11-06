import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { SqliteOpsStore, initializeSqliteOpsSchema } from "./sqlite-ops-store.js";

test("SQLite store seeds the Mercadinho data and schema initialization is idempotent", (t) => {
  const store = new SqliteOpsStore(":memory:");
  t.after(() => store.close());

  assert.equal(store.listServices().length, 6);
  assert.equal(store.listAlerts().length, 6);
  assert.equal(store.listAlerts("firing").length, 3);
  assert.equal(store.listAlerts("resolved").length, 3);
  assert.equal(store.getRunbook("Checkout").service, "Checkout");
  assert.equal(store.getRunbook("Payments").service, "Payments");
  assert.equal(store.getRunbook("Auth").service, "Auth");

  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  initializeSqliteOpsSchema(db);
  initializeSqliteOpsSchema(db);
  assert.deepEqual(
    db.prepare("SELECT name FROM sqlite_master WHERE type = ? ORDER BY name")
      .all("table")
      .map((row) => row.name),
    ["alerts", "incidents", "runbooks", "services"],
  );
});

test("SQLite store persists incident changes across close and reopen", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "opspilot-sqlite-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "ops.db");

  const firstStore = new SqliteOpsStore(path);
  const incident = firstStore.openIncident(
    "Checkout errors",
    "Checkout",
    "critical",
  );
  assert.equal(incident.status, "open");
  assert.equal(incident.resolvedAt, null);
  assert.equal(incident.summary, null);
  assert.equal(firstStore.listIncidents().length, 1);
  const resolved = firstStore.resolveIncident(incident.id);
  assert.equal(resolved.status, "resolved");
  assert.ok(resolved.resolvedAt);
  firstStore.close();

  const secondStore = new SqliteOpsStore(path);
  t.after(() => secondStore.close());
  assert.equal(secondStore.listServices().length, 6);
  assert.equal(secondStore.listAlerts().length, 6);
  assert.equal(secondStore.listIncidents()[0]?.id, incident.id);
  assert.equal(secondStore.listIncidents()[0]?.status, "resolved");
  assert.equal(secondStore.listIncidents()[0]?.resolvedAt, resolved.resolvedAt);
  assert.equal(secondStore.listIncidents()[0]?.summary, null);
});

test("SQLite store filters incidents and reports lifecycle errors", (t) => {
  const store = new SqliteOpsStore(":memory:");
  t.after(() => store.close());

  const open = store.openIncident("Checkout errors", "Checkout", "critical");
  const resolved = store.openIncident("Payment delay", "Payments", "high");
  store.resolveIncident(resolved.id);

  assert.equal(store.listIncidents().length, 2);
  assert.deepEqual(store.listIncidents("open").map(({ id }) => id), [open.id]);
  assert.deepEqual(store.listIncidents("resolved").map(({ id }) => id), [resolved.id]);
  assert.equal(store.listIncidents("all").length, 2);
  assert.throws(() => store.resolveIncident("missing"), /Unknown incident/);
  assert.throws(
    () => store.resolveIncident(resolved.id),
    /Incident already resolved/,
  );
  assert.throws(() => store.getRunbook("missing"), /No runbook/);
});

test("SQLite CHECK constraints reject every invalid closed-domain value", (t) => {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  initializeSqliteOpsSchema(db);

  const insertService = db.prepare(
    "INSERT INTO services (id, name, team, environment, tier) VALUES (?, ?, ?, ?, ?)",
  );
  insertService.run("svc-test", "Test", "test", "test", "tier-1");
  assert.throws(
    () => insertService.run("svc-bad", "Bad", "test", "test", "tier-4"),
    /CHECK constraint failed/,
  );

  const insertAlert = db.prepare(
    "INSERT INTO alerts (id, service_id, title, severity, status) VALUES (?, ?, ?, ?, ?)",
  );
  assert.throws(
    () => insertAlert.run("alert-bad-severity", "svc-test", "Bad", "sev1", "firing"),
    /CHECK constraint failed/,
  );
  assert.throws(
    () =>
      insertAlert.run(
        "alert-bad-status",
        "svc-test",
        "Bad",
        "critical",
        "open",
      ),
    /CHECK constraint failed/,
  );

  const insertIncident = db.prepare(
    "INSERT INTO incidents (id, title, service_id, severity, status) VALUES (?, ?, ?, ?, ?)",
  );
  insertIncident.run("inc-valid-low", "Low severity", "svc-test", "low", "open");
  assert.throws(
    () =>
      insertIncident.run(
        "inc-bad-severity",
        "Bad",
        "svc-test",
        "sev1",
        "open",
      ),
    /CHECK constraint failed/,
  );
  assert.throws(
    () =>
      insertIncident.run(
        "inc-bad-status",
        "Bad",
        "svc-test",
        "critical",
        "mitigated",
      ),
    /CHECK constraint failed/,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { MemoryOpsStore } from "./store.js";
import { createOpsTools } from "./tools.js";

test("list_alerts accepts all and filters firing/resolved alerts", async () => {
  const [listAlerts] = createOpsTools(new MemoryOpsStore());

  const all = JSON.parse(await listAlerts.invoke({ status: "all" })) as unknown[];
  const firing = JSON.parse(
    await listAlerts.invoke({ status: "firing" }),
  ) as unknown[];
  const resolved = JSON.parse(
    await listAlerts.invoke({ status: "resolved" }),
  ) as unknown[];

  assert.equal(all.length, 6);
  assert.equal(firing.length, 3);
  assert.equal(resolved.length, 3);
});

test("incident tools validate inputs and surface domain errors", async () => {
  const [, openIncident, resolveIncident] = createOpsTools(new MemoryOpsStore());

  await assert.rejects(
    openIncident.invoke({
      title: "",
      service: "Checkout",
      severity: "critical",
    }),
  );
  await assert.rejects(
    openIncident.invoke({
      title: "Unknown service",
      service: "Missing",
      severity: "critical",
    }),
    /Unknown service/,
  );
  await assert.rejects(resolveIncident.invoke({ id: "missing" }), /Unknown incident/);
});

test("tool iteration limiter blocks mutations after the allowed action budget", async () => {
  let allowedCalls = 0;
  const [listAlerts] = createOpsTools(new MemoryOpsStore(), () => {
    if (allowedCalls === 1) return false;
    allowedCalls += 1;
    return true;
  });

  const first = await listAlerts.invoke({ status: "firing" });
  const second = await listAlerts.invoke({ status: "firing" });
  assert.equal((JSON.parse(first) as unknown[]).length, 3);
  assert.match(second, /Iteration limit reached/);
  assert.equal(allowedCalls, 1);
});

import assert from "node:assert/strict";
import test from "node:test";
import { SqliteOpsStore } from "../store/sqlite-ops-store.js";
import { createOpsTools } from "./tools.js";

test("list_alerts accepts all and filters firing/resolved alerts", async (t) => {
  const store = new SqliteOpsStore(":memory:");
  t.after(() => store.close());
  const [listAlerts] = createOpsTools(store);

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

test("incident tools validate inputs and surface domain errors", async (t) => {
  const store = new SqliteOpsStore(":memory:");
  t.after(() => store.close());
  const [, openIncident, resolveIncident] = createOpsTools(store);

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

test("list_incidents defaults to open and supports each status filter", async (t) => {
  const store = new SqliteOpsStore(":memory:");
  t.after(() => store.close());
  const [, , , listIncidents] = createOpsTools(store);
  const open = store.openIncident("Open checkout issue", "Checkout", "high");
  const resolved = store.openIncident("Resolved payment issue", "Payments", "medium");
  store.resolveIncident(resolved.id);

  const defaultOpen = JSON.parse(await listIncidents.invoke({})) as Array<{
    id: string;
  }>;
  const explicitOpen = JSON.parse(
    await listIncidents.invoke({ status: "open" }),
  ) as Array<{ id: string }>;
  const closed = JSON.parse(
    await listIncidents.invoke({ status: "resolved" }),
  ) as Array<{ id: string }>;
  const all = JSON.parse(
    await listIncidents.invoke({ status: "all" }),
  ) as Array<{ id: string }>;

  assert.deepEqual(defaultOpen.map(({ id }) => id), [open.id]);
  assert.deepEqual(explicitOpen.map(({ id }) => id), [open.id]);
  assert.deepEqual(closed.map(({ id }) => id), [resolved.id]);
  assert.equal(all.length, 2);
  assert.equal(
    listIncidents.schema.safeParse({ status: "mitigated" }).success,
    false,
  );
});

test("consultar_runbook returns only the named service and surfaces not-found errors", async (t) => {
  const store = new SqliteOpsStore(":memory:");
  t.after(() => store.close());
  const [, , , , consultarRunbook] = createOpsTools(store);

  const runbook = JSON.parse(
    await consultarRunbook.invoke({ service: "auth" }),
  ) as { service: string; title: string; content: string };
  assert.equal(runbook.service, "Auth");
  assert.match(runbook.content, /authentication/i);
  await assert.rejects(
    consultarRunbook.invoke({ service: "Missing" }),
    /No runbook/,
  );
  await assert.rejects(consultarRunbook.invoke({ service: " " }));
});

test("all operational tools describe their purpose and every input field", (t) => {
  const store = new SqliteOpsStore(":memory:");
  t.after(() => store.close());
  const tools = createOpsTools(store);

  for (const operationalTool of tools) {
    assert.ok(operationalTool.description?.length);
    assert.match(operationalTool.description, /Use|use/i);
    for (const field of Object.values(operationalTool.schema.shape)) {
      assert.ok(field.description);
    }
  }
  assert.match(tools[1].description, /Use quando um alerta ou falha confirmada/i);
  assert.equal(
    tools[3].schema.safeParse({ status: "mitigated" }).success,
    false,
  );
});

test("check_provider_status defaults to GitHub and accepts both providers", async (t) => {
  const store = new SqliteOpsStore(":memory:");
  t.after(() => store.close());
  const urls: string[] = [];
  const doFetch: typeof fetch = async (input) => {
    urls.push(String(input));
    return new Response(
      JSON.stringify({
        status: { indicator: "operational", description: "All services normal" },
      }),
      { status: 200 },
    );
  };
  const [, , , , , checkProviderStatus] = createOpsTools(
    store,
    undefined,
    doFetch,
  );

  const defaultResult = await checkProviderStatus.invoke({});
  const cloudflareResult = await checkProviderStatus.invoke({
    provider: "cloudflare",
  });

  assert.equal(defaultResult, "github está operational - All services normal");
  assert.equal(
    cloudflareResult,
    "cloudflare está operational - All services normal",
  );
  assert.deepEqual(urls, [
    "https://www.githubstatus.com/api/v2/status.json",
    "https://www.cloudflarestatus.com/api/v2/status.json",
  ]);
  assert.equal(
    checkProviderStatus.schema.safeParse({ provider: "example.com" }).success,
    false,
  );
  assert.match(checkProviderStatus.description, /external|extern/i);
  assert.match(checkProviderStatus.description, /Use quando/i);
  assert.ok(checkProviderStatus.schema.shape.provider.description);
});

test("check_provider_status returns a readable result when status fetching fails", async (t) => {
  const store = new SqliteOpsStore(":memory:");
  t.after(() => store.close());
  let calls = 0;
  const doFetch: typeof fetch = async () => {
    calls += 1;
    throw new Error("network unavailable");
  };
  const [, , , , , checkProviderStatus] = createOpsTools(
    store,
    undefined,
    doFetch,
  );

  const result = await checkProviderStatus.invoke({ provider: "github" });

  assert.equal(calls, 2);
  assert.match(result, /não consegui consultar o status de github/);
  assert.match(result, /network unavailable/);
});

test("tool iteration limiter blocks mutations after the allowed action budget", async (t) => {
  let allowedCalls = 0;
  const store = new SqliteOpsStore(":memory:");
  t.after(() => store.close());
  const [listAlerts] = createOpsTools(store, () => {
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

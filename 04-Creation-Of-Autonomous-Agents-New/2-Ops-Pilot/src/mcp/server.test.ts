import assert from "node:assert/strict";
import test from "node:test";
import { startOpsPilotClient } from "./test-utils.js";

test("MCP server advertises exactly the existing operational tools", async (t) => {
  const { client, close } = await startOpsPilotClient();
  t.after(close);

  assert.equal(client.getServerVersion()?.name, "opspilot");
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map(({ name }) => name).sort(),
    ["list_alerts", "open_incident", "resolve_incident"],
  );

  const listAlerts = tools.find(({ name }) => name === "list_alerts");
  const openIncident = tools.find(({ name }) => name === "open_incident");
  const resolveIncident = tools.find(({ name }) => name === "resolve_incident");
  assert.ok(listAlerts?.description);
  assert.ok(openIncident?.description);
  assert.ok(resolveIncident?.description);
  assert.deepEqual(Object.keys(listAlerts.inputSchema.properties ?? {}), [
    "status",
  ]);
  const alertStatus = listAlerts.inputSchema.properties?.status;
  assert.ok(alertStatus && "enum" in alertStatus);
  assert.deepEqual(alertStatus.enum, ["firing", "resolved", "all"]);
  assert.deepEqual(
    Object.keys(openIncident.inputSchema.properties ?? {}).sort(),
    ["service", "severity", "title"],
  );
  const severity = openIncident.inputSchema.properties?.severity;
  assert.ok(severity && "enum" in severity);
  assert.deepEqual(severity.enum, ["critical", "high", "medium", "low"]);
  assert.deepEqual(Object.keys(resolveIncident.inputSchema.properties ?? {}), [
    "id",
  ]);
});

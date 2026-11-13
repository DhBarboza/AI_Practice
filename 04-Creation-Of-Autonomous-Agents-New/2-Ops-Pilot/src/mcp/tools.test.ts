import assert from "node:assert/strict";
import test from "node:test";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { AlertSchema, IncidentSchema } from "../agents/types.js";
import { startOpsPilotClient } from "./test-utils.js";

function isCallToolResult(
  result: Awaited<ReturnType<Client["callTool"]>>,
): result is CallToolResult {
  return "content" in result && Array.isArray(result.content);
}

async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const result = await client.callTool({ name, arguments: args });
  if (!isCallToolResult(result)) {
    throw new Error(`Tool ${name} returned a task result instead of content.`);
  }
  return result;
}

function textContent(result: CallToolResult): string {
  const content = result.content.find((item) => item.type === "text");
  if (!content || content.type !== "text") {
    throw new Error("Expected an MCP text result.");
  }
  return content.text;
}

test("MCP operational tools share the existing behavior and store", async (t) => {
  const { client, close } = await startOpsPilotClient();
  t.after(close);

  const alertsResult = await callTool(client, "list_alerts", {});
  assert.notEqual(alertsResult.isError, true);
  const alerts = z
    .array(AlertSchema)
    .parse(JSON.parse(textContent(alertsResult)));
  assert.equal(alerts.length, 6);

  const firingResult = await callTool(client, "list_alerts", {
    status: "firing",
  });
  assert.notEqual(firingResult.isError, true);
  const firingAlerts = z
    .array(AlertSchema)
    .parse(JSON.parse(textContent(firingResult)));
  assert.equal(firingAlerts.length, 3);

  const openResult = await callTool(client, "open_incident", {
    title: "Checkout latency",
    service: "Checkout",
    severity: "high",
  });
  assert.notEqual(openResult.isError, true);
  const opened = IncidentSchema.parse(JSON.parse(textContent(openResult)));
  assert.equal(opened.status, "open");
  assert.equal(opened.service, "Checkout");

  const resolveResult = await callTool(client, "resolve_incident", {
    id: opened.id,
  });
  assert.notEqual(resolveResult.isError, true);
  const resolved = IncidentSchema.parse(JSON.parse(textContent(resolveResult)));
  assert.equal(resolved.id, opened.id);
  assert.equal(resolved.status, "resolved");
  assert.ok(resolved.resolvedAt);
});

test("MCP operational tool failures are returned as failed tool results", async (t) => {
  const { client, close } = await startOpsPilotClient();
  t.after(close);

  const invalidInput = await callTool(client, "open_incident", {
    title: "Invalid severity",
    service: "Checkout",
    severity: "urgent",
  });
  assert.equal(invalidInput.isError, true);
  assert.match(textContent(invalidInput), /validation|severity/i);

  const unknownService = await callTool(client, "open_incident", {
    title: "Unknown service",
    service: "Missing",
    severity: "high",
  });
  assert.equal(unknownService.isError, true);
  assert.match(textContent(unknownService), /Unknown service/);

  const unknownIncident = await callTool(client, "resolve_incident", {
    id: "missing",
  });
  assert.equal(unknownIncident.isError, true);
  assert.match(textContent(unknownIncident), /Unknown incident/);

  const openResult = await callTool(client, "open_incident", {
    title: "Resolve once",
    service: "Payments",
    severity: "medium",
  });
  const opened = IncidentSchema.parse(JSON.parse(textContent(openResult)));
  await callTool(client, "resolve_incident", { id: opened.id });
  const repeatedResolution = await callTool(client, "resolve_incident", {
    id: opened.id,
  });
  assert.equal(repeatedResolution.isError, true);
  assert.match(textContent(repeatedResolution), /already resolved/i);
});

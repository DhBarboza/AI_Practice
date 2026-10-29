import assert from "node:assert/strict";
import test from "node:test";
import { formatTrace } from "./trace.js";

test("trace formatter renders typed events in deterministic order", () => {
  assert.equal(
    formatTrace([
      { type: "plan", content: "Check active alerts" },
      {
        type: "action",
        tool: "list_alerts",
        args: { status: "firing" },
      },
      {
        type: "observation",
        tool: "list_alerts",
        content: '[{"id":"alert-001"}]',
      },
      { type: "answer", content: "One alert is firing." },
    ]),
    [
      "[01] PLAN: Check active alerts",
      '[02] ACTION list_alerts({"status":"firing"})',
      '[03] OBSERVATION list_alerts: [{"id":"alert-001"}]',
      "[04] ANSWER: One alert is firing.",
    ].join("\n"),
  );
});

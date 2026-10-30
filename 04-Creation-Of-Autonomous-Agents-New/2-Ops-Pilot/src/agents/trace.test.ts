import assert from "node:assert/strict";
import test from "node:test";
import { formatTrace } from "./trace.js";

test("trace formatter renders typed events in deterministic order", () => {
  assert.equal(
    formatTrace([
      { type: "thought", content: "Choose an alert lookup." },
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
      { type: "critique", content: "The result includes one alert." },
      { type: "answer", content: "One alert is firing." },
    ]),
    [
      "[01] THOUGHT: Choose an alert lookup.",
      "[02] PLAN: Check active alerts",
      '[03] ACTION list_alerts({"status":"firing"})',
      '[04] OBSERVATION list_alerts: [{"id":"alert-001"}]',
      "[05] CRITIQUE: The result includes one alert.",
      "[06] ANSWER: One alert is firing.",
    ].join("\n"),
  );
});

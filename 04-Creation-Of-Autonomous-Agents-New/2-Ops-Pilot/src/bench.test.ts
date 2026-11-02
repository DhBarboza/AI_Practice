import assert from "node:assert/strict";
import test from "node:test";
import {
  formatBenchmarkTable,
  parseBenchmarkArgs,
  runBenchmark,
} from "./bench.js";
import { MemoryOpsStore } from "./agents/store.js";
import type { ReasoningStrategy } from "./agents/types.js";
import { seedAlerts, seedServices } from "./agents/seed-data.js";

function createBenchmarkStore(): MemoryOpsStore {
  return new MemoryOpsStore(
    [
      ...seedServices,
      {
        id: "svc-catalog",
        name: "Catalog",
        team: "commerce",
        environment: "production",
      },
    ],
    seedAlerts,
  );
}

test("benchmark args select scenarios and the no-replanner mode", () => {
  assert.deepEqual(parseBenchmarkArgs(["--scenario", "C1,C3", "--no-replanner"]), {
    scenarioIds: ["C1", "C3"],
    noReplanner: true,
  });
  assert.deepEqual(parseBenchmarkArgs([]), {
    scenarioIds: ["C1", "C2", "C3"],
    noReplanner: false,
  });
  assert.throws(() => parseBenchmarkArgs(["--scenario", "C4"]), /Unknown scenario/);
  assert.throws(() => parseBenchmarkArgs(["--unknown"]), /Unknown option/);
});

test("benchmark verifies scenario results against each run's isolated store", async () => {
  const calls: Array<{ scenario: string; strategy: string; noReplanner: boolean }> = [];
  const rows = await runBenchmark(
    { scenarioIds: ["C1", "C2", "C3"], noReplanner: true },
    (scenario, strategyName, noReplanner) => {
      const store = createBenchmarkStore();
      const strategy: ReasoningStrategy = {
        name: strategyName,
        async run() {
          calls.push({ scenario: scenario.id, strategy: strategyName, noReplanner });
          if (scenario.id === "C2") {
            const first = store.openIncident("SEV2 incident", "Checkout", "high");
            store.openIncident("SEV2 incident", "Payments", "high");
            store.openIncident("SEV2 incident", "Catalog", "high");
            store.resolveIncident(first.id);
          } else if (scenario.id === "C3") {
            const oldest = store.listAlerts("firing")[0];
            assert.ok(oldest);
            store.openIncident("Oldest firing alert", oldest.service, "high");
          }
          return {
            answer: "Scenario completed.",
            trace:
              scenario.id === "C1"
                ? [
                    {
                      type: "action",
                      tool: "list_alerts",
                      args: { status: "firing" },
                    },
                  ]
                : [],
            metrics: { llmCalls: 2, latencyMs: 1.5 },
          };
        },
      };
      return { store, strategy };
    },
  );

  assert.equal(rows.length, 6);
  assert.ok(rows.every((row) => row.accuracy));
  assert.ok(calls.every((call) => call.noReplanner));
  assert.deepEqual(
    rows.map(({ scenario, strategy, llmCalls, latencyMs }) => ({
      scenario,
      strategy,
      llmCalls,
      latencyMs,
    })),
    [
      { scenario: "C1", strategy: "react", llmCalls: 2, latencyMs: 1.5 },
      { scenario: "C1", strategy: "plan-and-execute", llmCalls: 2, latencyMs: 1.5 },
      { scenario: "C2", strategy: "react", llmCalls: 2, latencyMs: 1.5 },
      { scenario: "C2", strategy: "plan-and-execute", llmCalls: 2, latencyMs: 1.5 },
      { scenario: "C3", strategy: "react", llmCalls: 2, latencyMs: 1.5 },
      { scenario: "C3", strategy: "plan-and-execute", llmCalls: 2, latencyMs: 1.5 },
    ],
  );
});

test("benchmark table includes the consolidated columns and all rows", () => {
  const table = formatBenchmarkTable([
    {
      scenario: "C1",
      strategy: "react",
      accuracy: true,
      llmCalls: 2,
      latencyMs: 4.25,
    },
  ]);
  assert.match(table, /cenário\s+\|\s+estratégia\s+\|\s+acerto\s+\|\s+llmCalls\s+\|\s+latencyMs/);
  assert.match(table, /C1\s+\|\s+react\s+\|\s+sim\s+\|\s+2\s+\|\s+4\.25/);
});

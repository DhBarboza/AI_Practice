import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { z } from "zod";
import { createPlanAndExecuteStrategy } from "./agents/plan-and-execute.js";
import { createReactStrategy } from "./agents/react.js";
import { seedAlerts, seedServices } from "./agents/seed-data.js";
import { MemoryOpsStore } from "./agents/store.js";
import type {
  Alert,
  ReasoningResult,
  ReasoningStrategy,
  Service,
} from "./agents/types.js";

const BenchmarkOptionsSchema = z
  .object({
    scenarioIds: z.array(z.enum(["C1", "C2", "C3"])).min(1),
    noReplanner: z.boolean(),
  })
  .strict();

export type BenchmarkScenarioId = "C1" | "C2" | "C3";

interface StoreSnapshot {
  alerts: Alert[];
  incidentsCount: number;
  criticalFiringCount: number;
}

export interface BenchmarkScenario {
  id: BenchmarkScenarioId;
  prompt: string;
  verify(
    store: MemoryOpsStore,
    before: StoreSnapshot,
    result: ReasoningResult,
  ): boolean;
}

export interface BenchmarkOptions {
  scenarioIds: BenchmarkScenarioId[];
  noReplanner: boolean;
}

export interface BenchmarkRow {
  scenario: BenchmarkScenarioId;
  strategy: string;
  accuracy: boolean;
  llmCalls: number;
  latencyMs: number;
}

export interface BenchmarkRun {
  store: MemoryOpsStore;
  strategy: ReasoningStrategy;
}

export type BenchmarkRunFactory = (
  scenario: BenchmarkScenario,
  strategyName: "react" | "plan-and-execute",
  noReplanner: boolean,
) => BenchmarkRun;

const scenarios: readonly BenchmarkScenario[] = [
  {
    id: "C1",
    prompt: "quantos alertas críticos estão disparando?",
    verify(store, before, result) {
      return (
        before.criticalFiringCount === 1 &&
        result.trace.some(
          (event) => event.type === "action" && event.tool === "list_alerts",
        ) &&
        store
          .listAlerts("firing")
          .filter((alert) => alert.severity === "critical").length ===
          before.criticalFiringCount
      );
    },
  },
  {
    id: "C2",
    prompt:
      "abra três incidentes sev2 para checkout, payment e catalog, nessa mesma ordem, e resolva o primeiro",
    verify(store, before) {
      const incidents = store.listIncidents().slice(before.incidentsCount);
      return (
        incidents.length === 3 &&
        incidents[0]?.service === "Checkout" &&
        incidents[1]?.service === "Payments" &&
        incidents[2]?.service === "Catalog" &&
        incidents.every((incident) => incident.severity === "high") &&
        incidents[0]?.status === "resolved" &&
        incidents[1]?.status === "open" &&
        incidents[2]?.status === "open"
      );
    },
  },
  {
    id: "C3",
    prompt:
      "dos alertas disparando, abra um incidente para o mais antigo e diga quantos sobraram",
    verify(store, before) {
      const firingBefore = before.alerts.filter(
        (alert) => alert.status === "firing",
      );
      const oldest = firingBefore[0];
      const newIncidents = store.listIncidents().slice(before.incidentsCount);
      const firingAfter = store.listAlerts("firing");

      return (
        oldest !== undefined &&
        firingAfter.length === firingBefore.length &&
        firingAfter.every((alert, index) => alert.id === firingBefore[index]?.id) &&
        newIncidents.length === 1 &&
        newIncidents[0]?.service === oldest.service &&
        newIncidents[0]?.severity === "high" &&
        newIncidents[0]?.status === "open"
      );
    },
  },
];

const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));

function isBenchmarkScenarioId(value: string): value is BenchmarkScenarioId {
  return value === "C1" || value === "C2" || value === "C3";
}

export function parseBenchmarkArgs(args: readonly string[]): BenchmarkOptions {
  let scenarioIds: BenchmarkScenarioId[] = ["C1", "C2", "C3"];
  let noReplanner = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--scenario") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("--scenario requires one or more comma-separated IDs (C1,C2,C3).");
      }
      const selected = value.split(",").map((id) => id.trim());
      if (selected.some((id) => !isBenchmarkScenarioId(id))) {
        throw new Error(`Unknown scenario: ${selected.find((id) => !isBenchmarkScenarioId(id))}`);
      }
      scenarioIds = [...new Set(selected as BenchmarkScenarioId[])];
      index += 1;
    } else if (arg === "--no-replanner") {
      noReplanner = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return BenchmarkOptionsSchema.parse({ scenarioIds, noReplanner });
}

function snapshot(store: MemoryOpsStore): StoreSnapshot {
  const alerts = store.listAlerts();
  return {
    alerts,
    incidentsCount: store.listIncidents().length,
    criticalFiringCount: alerts.filter(
      (alert) => alert.status === "firing" && alert.severity === "critical",
    ).length,
  };
}

function createBenchmarkStore(): MemoryOpsStore {
  const catalog: Service = {
    id: "svc-catalog",
    name: "Catalog",
    team: "commerce",
    environment: "production",
    tier: "tier-2",
  };
  return new MemoryOpsStore([...seedServices, catalog], seedAlerts);
}

function createDefaultRun(
  _scenario: BenchmarkScenario,
  strategyName: "react" | "plan-and-execute",
  noReplanner: boolean,
): BenchmarkRun {
  const store = createBenchmarkStore();
  const strategy =
    strategyName === "react"
      ? createReactStrategy({ createStore: () => store })
      : createPlanAndExecuteStrategy({
          createStore: () => store,
          enableReplanning: !noReplanner,
        });
  return { store, strategy };
}

export async function runBenchmark(
  options: BenchmarkOptions,
  createRun: BenchmarkRunFactory = createDefaultRun,
): Promise<BenchmarkRow[]> {
  const parsedOptions = BenchmarkOptionsSchema.parse(options);
  const rows: BenchmarkRow[] = [];

  for (const scenarioId of parsedOptions.scenarioIds) {
    const scenario = scenarioById.get(scenarioId);
    if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

    for (const strategyName of ["react", "plan-and-execute"] as const) {
      const run = createRun(scenario, strategyName, parsedOptions.noReplanner);
      const before = snapshot(run.store);
      const result = await run.strategy.run({
        input: scenario.prompt,
        maxIterations: 8,
      });

      rows.push({
        scenario: scenario.id,
        strategy: strategyName,
        accuracy: scenario.verify(run.store, before, result),
        llmCalls: result.metrics.llmCalls,
        latencyMs: result.metrics.latencyMs,
      });
    }
  }

  return rows;
}

export function formatBenchmarkTable(rows: readonly BenchmarkRow[]): string {
  const headers = ["cenário", "estratégia", "acerto", "llmCalls", "latencyMs"];
  const values = rows.map((row) => [
    row.scenario,
    row.strategy,
    row.accuracy ? "sim" : "não",
    String(row.llmCalls),
    String(row.latencyMs),
  ]);
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...values.map((row) => row[index]?.length ?? 0)),
  );
  const formatRow = (row: readonly string[]) =>
    `| ${row.map((value, index) => value.padEnd(widths[index] ?? 0)).join(" | ")} |`;
  const separator = `|-${widths.map((width) => "-".repeat(width)).join("-|-")}-|`;

  return [
    formatRow(headers),
    separator,
    ...values.map(formatRow),
  ].join("\n");
}

async function main(args: readonly string[]): Promise<void> {
  try {
    const options = parseBenchmarkArgs(args);
    const rows = await runBenchmark(options);
    console.log(formatBenchmarkTable(rows));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  await main(process.argv.slice(2));
}

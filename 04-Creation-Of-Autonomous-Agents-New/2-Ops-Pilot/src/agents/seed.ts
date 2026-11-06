import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { MemoryOpsStore } from "./store.js";
import type { OpsStore } from "./store.js";
import { SqliteOpsStore } from "../store/sqlite-ops-store.js";

export interface SeedSummary {
  services: number;
  alerts: number;
  firingAlerts: number;
  resolvedAlerts: number;
}

export function getSeedSummary(
  store: OpsStore = new MemoryOpsStore(),
): SeedSummary {
  const alerts = store.listAlerts();
  return {
    services: store.listServices().length,
    alerts: alerts.length,
    firingAlerts: alerts.filter((alert) => alert.status === "firing").length,
    resolvedAlerts: alerts.filter((alert) => alert.status === "resolved").length,
  };
}

export async function runSeed(
  write: (message: string) => void = console.log,
  createStore: () => SqliteOpsStore = () => new SqliteOpsStore(),
): Promise<SeedSummary> {
  const store = createStore();
  try {
    const summary = getSeedSummary(store);
    write(
      `Initialized SQLite operational data with ${summary.services} services and ` +
        `${summary.alerts} alerts (${summary.firingAlerts} firing, ` +
        `${summary.resolvedAlerts} resolved).`,
    );
    return summary;
  } finally {
    store.close();
  }
}

async function main(): Promise<void> {
  try {
    await runSeed();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  await main();
}

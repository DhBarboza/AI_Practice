import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { MemoryOpsStore } from "./store.js";

export interface SeedSummary {
  services: number;
  alerts: number;
  firingAlerts: number;
  resolvedAlerts: number;
}

export function getSeedSummary(
  store: MemoryOpsStore = new MemoryOpsStore(),
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
): Promise<SeedSummary> {
  const summary = getSeedSummary(new MemoryOpsStore());
  write(
    `Loaded src/agents/seed-data.json into the in-memory store with ${summary.services} services and ` +
      `${summary.alerts} alerts (${summary.firingAlerts} firing, ` +
      `${summary.resolvedAlerts} resolved).`,
  );
  return summary;
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

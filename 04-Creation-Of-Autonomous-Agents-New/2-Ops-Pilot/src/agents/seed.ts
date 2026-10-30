import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createDatabaseFromEnv, defineOpsModels } from "./database.js";
import { seedAlerts, seedServices } from "./seed-data.js";
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
  const summary = getSeedSummary();
  write(
    `Initialized in-memory store with ${summary.services} services and ` +
      `${summary.alerts} alerts (${summary.firingAlerts} firing, ` +
      `${summary.resolvedAlerts} resolved).`,
  );

  const hasDatabase = Boolean(process.env.MYSQL_DATABASE?.trim());
  const hasUser = Boolean(process.env.MYSQL_USER?.trim());
  if (!hasDatabase && !hasUser) {
    write("MySQL seed skipped; configure MYSQL_DATABASE and MYSQL_USER to persist it.");
    return summary;
  }

  const sequelize = createDatabaseFromEnv();
  try {
    const { Service, Alert } = defineOpsModels(sequelize);
    await sequelize.authenticate();
    await sequelize.sync();
    const serviceIdByName = new Map(
      seedServices.map((service) => [service.name, service.id]),
    );
    const databaseAlerts = seedAlerts.map((alert) => {
      const serviceId = serviceIdByName.get(alert.service);
      if (!serviceId) {
        throw new Error(`Seed alert references unknown service: ${alert.service}`);
      }
      return {
        id: alert.id,
        serviceId,
        title: alert.title,
        severity: alert.severity,
        status: alert.status,
      };
    });

    await sequelize.transaction(async (transaction) => {
      await Service.bulkCreate(seedServices, {
        updateOnDuplicate: ["name", "team", "environment"],
        transaction,
      });
      await Alert.bulkCreate(databaseAlerts, {
        updateOnDuplicate: ["serviceId", "title", "severity", "status"],
        transaction,
      });
    });
    write("Seeded MySQL with the five services and six alerts.");
    return summary;
  } finally {
    await sequelize.close();
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

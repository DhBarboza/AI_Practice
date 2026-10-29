import { createDatabaseFromEnv, defineOpsModels } from "./database.js";
import { seedAlerts, seedServices } from "./seed-data.js";
import { MemoryOpsStore } from "./store.js";

const store = new MemoryOpsStore();
const firingCount = store.listAlerts("firing").length;
const resolvedCount = store.listAlerts("resolved").length;
console.log(
  `Initialized in-memory store with ${store.listServices().length} services and ` +
    `${store.listAlerts().length} alerts (${firingCount} firing, ${resolvedCount} resolved).`,
);

const hasDatabase = Boolean(process.env.MYSQL_DATABASE?.trim());
const hasUser = Boolean(process.env.MYSQL_USER?.trim());
if (!hasDatabase && !hasUser) {
  console.log("MySQL seed skipped; configure MYSQL_DATABASE and MYSQL_USER to persist it.");
} else {
  const sequelize = createDatabaseFromEnv();
  try {
    const { Service, Alert } = defineOpsModels(sequelize);
    await sequelize.authenticate();
    await sequelize.sync();
    await Service.bulkCreate(seedServices, {
      updateOnDuplicate: ["name", "team", "environment"],
    });
    await Alert.bulkCreate(seedAlerts, {
      updateOnDuplicate: ["service", "title", "severity", "status"],
    });
    console.log("Seeded MySQL with the five services and six alerts.");
  } finally {
    await sequelize.close();
  }
}

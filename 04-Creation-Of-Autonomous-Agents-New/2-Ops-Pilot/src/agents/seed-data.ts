import { readFileSync } from "node:fs";
import { z } from "zod";
import { AlertSchema, ServiceSchema } from "./types.js";
import type { Alert, Service } from "./types.js";

const SeedDataSchema = z
  .object({
    services: z.array(ServiceSchema),
    alerts: z.array(AlertSchema),
  })
  .strict();

const seedData = SeedDataSchema.parse(
  JSON.parse(
    readFileSync(new URL("./seed-data.json", import.meta.url), "utf8"),
  ),
);

export const seedServices: Service[] = seedData.services;
export const seedAlerts: Alert[] = seedData.alerts;

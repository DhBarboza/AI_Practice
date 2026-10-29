import { seedAlerts, seedServices } from "./seed-data.js";
import type {
  Alert,
  AlertStatus,
  Incident,
  IncidentSeverity,
  Service,
} from "./types.js";

export class MemoryOpsStore {
  private readonly services = new Map<string, Service>();
  private readonly alerts = new Map<string, Alert>();
  private readonly incidents = new Map<string, Incident>();
  private nextIncidentId = 1;

  constructor(
    services: readonly Service[] = seedServices,
    alerts: readonly Alert[] = seedAlerts,
  ) {
    for (const service of services) this.services.set(service.id, { ...service });
    for (const alert of alerts) this.alerts.set(alert.id, { ...alert });
  }

  listServices(): Service[] {
    return [...this.services.values()].map((service) => ({ ...service }));
  }

  listAlerts(status?: AlertStatus): Alert[] {
    return [...this.alerts.values()]
      .filter((alert) => status === undefined || alert.status === status)
      .map((alert) => ({ ...alert }));
  }

  openIncident(
    title: string,
    service: string,
    severity: IncidentSeverity,
  ): Incident {
    if (![...this.services.values()].some((entry) => entry.name === service)) {
      throw new Error(`Unknown service: ${service}`);
    }

    const incident: Incident = {
      id: `inc-${String(this.nextIncidentId++).padStart(3, "0")}`,
      title,
      service,
      severity,
      status: "open",
    };
    this.incidents.set(incident.id, incident);
    return { ...incident };
  }

  resolveIncident(id: string): Incident {
    const incident = this.incidents.get(id);
    if (!incident) throw new Error(`Unknown incident: ${id}`);
    incident.status = "resolved";
    return { ...incident };
  }
}

export const defaultOpsStore = new MemoryOpsStore();

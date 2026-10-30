import { seedAlerts, seedServices } from "./seed-data.js";
import {
  AlertSchema,
  IncidentSchema,
  OpenIncidentInputSchema,
  ResolveIncidentInputSchema,
  ServiceSchema,
} from "./types.js";
import type {
  Alert,
  AlertFilterStatus,
  Incident,
  IncidentSeverity,
  Service,
} from "./types.js";

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnknownServiceError extends DomainError {}
export class UnknownIncidentError extends DomainError {}
export class IncidentAlreadyResolvedError extends DomainError {}

export class MemoryOpsStore {
  private readonly services = new Map<string, Service>();
  private readonly alerts = new Map<string, Alert>();
  private readonly incidents = new Map<string, Incident>();
  private nextIncidentId = 1;

  constructor(
    services: readonly Service[] = seedServices,
    alerts: readonly Alert[] = seedAlerts,
  ) {
    for (const service of services) {
      const validated = ServiceSchema.parse(service);
      if (this.services.has(validated.id)) {
        throw new DomainError(`Duplicate service ID: ${validated.id}`);
      }
      if ([...this.services.values()].some(({ name }) => name === validated.name)) {
        throw new DomainError(`Duplicate service name: ${validated.name}`);
      }
      this.services.set(validated.id, { ...validated });
    }

    for (const alert of alerts) {
      const validated = AlertSchema.parse(alert);
      if (this.alerts.has(validated.id)) {
        throw new DomainError(`Duplicate alert ID: ${validated.id}`);
      }
      if (![...this.services.values()].some(({ name }) => name === validated.service)) {
        throw new UnknownServiceError(`Unknown service: ${validated.service}`);
      }
      this.alerts.set(validated.id, { ...validated });
    }
  }

  listServices(): Service[] {
    return [...this.services.values()].map((service) => ({ ...service }));
  }

  listAlerts(status?: AlertFilterStatus): Alert[] {
    return [...this.alerts.values()]
      .filter(
        (alert) =>
          status === undefined || status === "all" || alert.status === status,
      )
      .map((alert) => ({ ...alert }));
  }

  openIncident(
    title: string,
    service: string,
    severity: IncidentSeverity,
  ): Incident {
    const input = OpenIncidentInputSchema.parse({ title, service, severity });
    if (![...this.services.values()].some((entry) => entry.name === input.service)) {
      throw new UnknownServiceError(`Unknown service: ${input.service}`);
    }

    const incident: Incident = {
      id: `inc-${String(this.nextIncidentId++).padStart(3, "0")}`,
      title: input.title,
      service: input.service,
      severity: input.severity,
      status: "open",
    };
    const validated = IncidentSchema.parse(incident);
    this.incidents.set(validated.id, validated);
    return { ...validated };
  }

  resolveIncident(id: string): Incident {
    const input = ResolveIncidentInputSchema.parse({ id });
    const incident = this.incidents.get(input.id);
    if (!incident) throw new UnknownIncidentError(`Unknown incident: ${input.id}`);
    if (incident.status === "resolved") {
      throw new IncidentAlreadyResolvedError(`Incident already resolved: ${input.id}`);
    }
    incident.status = "resolved";
    return { ...incident };
  }

  listIncidents(): Incident[] {
    return [...this.incidents.values()].map((incident) => ({ ...incident }));
  }
}

export const defaultOpsStore = new MemoryOpsStore();

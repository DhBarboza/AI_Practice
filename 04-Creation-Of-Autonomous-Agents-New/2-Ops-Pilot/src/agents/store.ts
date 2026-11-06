import { seedAlerts, seedRunbooks, seedServices } from "./seed-data.js";
import {
  AlertSchema,
  IncidentFilterSchema,
  IncidentSchema,
  OpenIncidentInputSchema,
  ResolveIncidentInputSchema,
  RunbookSchema,
  ServiceSchema,
} from "./types.js";
import type {
  Alert,
  AlertFilterStatus,
  Incident,
  IncidentFilter,
  IncidentSeverity,
  Runbook,
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
export class UnknownRunbookError extends DomainError {}
export class IncidentAlreadyResolvedError extends DomainError {}

export interface OpsStore {
  listServices(): Service[];
  listAlerts(status?: AlertFilterStatus): Alert[];
  openIncident(title: string, service: string, severity: IncidentSeverity): Incident;
  resolveIncident(id: string): Incident;
  listIncidents(filter?: IncidentFilter): Incident[];
  getRunbook(service: string): Runbook;
}

export class MemoryOpsStore implements OpsStore {
  private readonly services = new Map<string, Service>();
  private readonly alerts = new Map<string, Alert>();
  private readonly incidents = new Map<string, Incident>();
  private readonly runbooks = new Map<string, Runbook>();
  private nextIncidentId = 1;

  constructor(
    services: readonly Service[] = seedServices,
    alerts: readonly Alert[] = seedAlerts,
    runbooks: readonly Runbook[] = seedRunbooks.filter((runbook) =>
      services.some(({ name }) => name === runbook.service),
    ),
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

    for (const runbook of runbooks) {
      const validated = RunbookSchema.parse(runbook);
      if (![...this.services.values()].some(({ name }) => name === validated.service)) {
        throw new UnknownServiceError(`Unknown service: ${validated.service}`);
      }
      if (this.runbooks.has(validated.service.toLowerCase())) {
        throw new DomainError(`Duplicate runbook service: ${validated.service}`);
      }
      this.runbooks.set(validated.service.toLowerCase(), { ...validated });
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
      resolvedAt: null,
      summary: null,
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
    incident.resolvedAt = new Date().toISOString();
    return { ...incident };
  }

  listIncidents(filter?: IncidentFilter): Incident[] {
    const status = filter === undefined ? undefined : IncidentFilterSchema.parse(filter);
    return [...this.incidents.values()]
      .filter(
        (incident) =>
          status === undefined || status === "all" || incident.status === status,
      )
      .map((incident) => ({ ...incident }));
  }

  getRunbook(service: string): Runbook {
    const name = service.trim().toLowerCase();
    const runbook = this.runbooks.get(name);
    if (!runbook) throw new UnknownRunbookError(`No runbook for service: ${service}`);
    return { ...runbook };
  }
}

export const defaultOpsStore = new MemoryOpsStore();

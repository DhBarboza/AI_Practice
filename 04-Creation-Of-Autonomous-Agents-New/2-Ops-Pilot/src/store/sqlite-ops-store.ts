import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { StatementSync } from "node:sqlite";
import { z } from "zod";
import { seedAlerts, seedRunbooks, seedServices } from "../agents/seed-data.js";
import {
    IncidentAlreadyResolvedError,
    UnknownIncidentError,
    UnknownRunbookError,
    UnknownServiceError,
} from "../agents/store.js";
import type { OpsStore } from "../agents/store.js";
import {
    AlertFilterStatusSchema,
    AlertSchema,
    IncidentFilterSchema,
    IncidentSchema,
    OpenIncidentInputSchema,
    ResolveIncidentInputSchema,
    RunbookSchema,
    ServiceSchema,
} from "../agents/types.js";
import type {
    Alert,
    AlertFilterStatus,
    Incident,
    IncidentFilter,
    IncidentSeverity,
    Runbook,
    Service,
} from "../agents/types.js";

const AuthServiceSchema = ServiceSchema;
const authService = AuthServiceSchema.parse({
    id: "svc-auth",
    name: "Auth",
    team: "platform",
    environment: "production",
    tier: "tier-1",
});
const persistentServices = [...seedServices, authService];

const ServiceRowSchema = z.object({
    id: z.string(),
    name: z.string(),
    team: z.string(),
    environment: z.string(),
    tier: z.string(),
});
const AlertRowSchema = z.object({
    id: z.string(),
    service: z.string(),
    title: z.string(),
    severity: z.string(),
    status: z.string(),
});
const IncidentRowSchema = z.object({
    id: z.string(),
    title: z.string(),
    service: z.string(),
    severity: z.string(),
    status: z.string(),
    resolved_at: z.nullable(z.string()),
    summary: z.nullable(z.string()),
});
const RunbookRowSchema = z.object({
    service: z.string(),
    title: z.string(),
    content: z.string(),
});

export function initializeSqliteOpsSchema(db: DatabaseSync): void {
    db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      team TEXT NOT NULL,
      environment TEXT NOT NULL,
      tier TEXT NOT NULL CHECK (tier IN ('tier-1', 'tier-2', 'tier-3'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY NOT NULL,
      service_id TEXT NOT NULL REFERENCES services(id),
      title TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
      status TEXT NOT NULL CHECK (status IN ('firing', 'resolved'))
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      service_id TEXT NOT NULL REFERENCES services(id),
      severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
      status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      resolved_at TEXT,
      summary TEXT,
      CHECK (
        (status = 'open' AND resolved_at IS NULL)
        OR (status = 'resolved' AND resolved_at IS NOT NULL)
      )
    );

    CREATE TABLE IF NOT EXISTS runbooks (
      service_id TEXT PRIMARY KEY NOT NULL REFERENCES services(id),
      title TEXT NOT NULL,
      content TEXT NOT NULL
    );
  `);
}

function seedDatabase(db: DatabaseSync): void {
    const insertService = db.prepare(
        "INSERT OR IGNORE INTO services (id, name, team, environment, tier) VALUES (?, ?, ?, ?, ?)",
    );
    const insertAlert = db.prepare(
        `INSERT OR IGNORE INTO alerts (id, service_id, title, severity, status)
     VALUES (?, (SELECT id FROM services WHERE name = ?), ?, ?, ?)`,
    );
    const insertRunbook = db.prepare(
        `INSERT OR IGNORE INTO runbooks (service_id, title, content)
     VALUES ((SELECT id FROM services WHERE name = ?), ?, ?)`,
    );

    db.exec("BEGIN");
    try {
        for (const service of persistentServices) {
            insertService.run(
                service.id,
                service.name,
                service.team,
                service.environment,
                service.tier,
            );
        }

        for (const alert of seedAlerts) {
            insertAlert.run(
                alert.id,
                alert.service,
                alert.title,
                alert.severity,
                alert.status,
            );
        }

        for (const runbook of seedRunbooks) {
            insertRunbook.run(runbook.service, runbook.title, runbook.content);
        }
        db.exec("COMMIT");
    } catch (error) {
        db.exec("ROLLBACK");
        throw error;
    }
}

function parseService(row: unknown): Service {
    const value = ServiceRowSchema.parse(row);
    return ServiceSchema.parse(value);
}

function parseAlert(row: unknown): Alert {
    const value = AlertRowSchema.parse(row);
    return AlertSchema.parse(value);
}

function parseIncident(row: unknown): Incident {
    const value = IncidentRowSchema.parse(row);
    return IncidentSchema.parse({
        id: value.id,
        title: value.title,
        service: value.service,
        severity: value.severity,
        status: value.status,
        resolvedAt: value.resolved_at,
        summary: value.summary,
    });
}

function parseRunbook(row: unknown): Runbook {
    return RunbookSchema.parse(RunbookRowSchema.parse(row));
}

interface SqliteStatements {
    listServices: StatementSync;
    listAlerts: StatementSync;
    listAlertsByStatus: StatementSync;
    listIncidents: StatementSync;
    listOpenIncidents: StatementSync;
    listResolvedIncidents: StatementSync;
    findService: StatementSync;
    insertIncident: StatementSync;
    findIncident: StatementSync;
    resolveIncident: StatementSync;
    findRunbook: StatementSync;
}

export const DEFAULT_OPSPILOT_DB_PATH = "./data/opspilot.db";

export class SqliteOpsStore implements OpsStore {
    private readonly db: DatabaseSync;
    private readonly statements: SqliteStatements;
    private closed = false;

    constructor(path = process.env.OPSPILOT_DB ?? DEFAULT_OPSPILOT_DB_PATH) {
        const databasePath = z.string().trim().min(1).parse(path);
        if (databasePath !== ":memory:") {
            mkdirSync(dirname(resolve(databasePath)), { recursive: true });
        }

        this.db = new DatabaseSync(databasePath, {
            enableForeignKeyConstraints: true,
        });

        try {
            initializeSqliteOpsSchema(this.db);
            seedDatabase(this.db);
        } catch (error) {
            this.db.close();
            throw error;
        }

        this.statements = {
            listServices: this.db.prepare(
                "SELECT * FROM services ORDER BY rowid",
            ),
            listAlerts: this.db.prepare(
                `SELECT alerts.id, services.name AS service, alerts.title, alerts.severity, alerts.status
         FROM alerts JOIN services ON services.id = alerts.service_id
         ORDER BY alerts.rowid`,
            ),
            listAlertsByStatus: this.db.prepare(
                `SELECT alerts.id, services.name AS service, alerts.title, alerts.severity, alerts.status
         FROM alerts JOIN services ON services.id = alerts.service_id
         WHERE alerts.status = ? ORDER BY alerts.rowid`,
            ),
            listIncidents: this.db.prepare(
                `SELECT incidents.id, incidents.title, services.name AS service,
                incidents.severity, incidents.status, incidents.resolved_at, incidents.summary
         FROM incidents JOIN services ON services.id = incidents.service_id
         ORDER BY incidents.created_at, incidents.rowid`,
            ),
            listOpenIncidents: this.db.prepare(
                `SELECT incidents.id, incidents.title, services.name AS service,
                incidents.severity, incidents.status, incidents.resolved_at, incidents.summary
         FROM incidents JOIN services ON services.id = incidents.service_id
         WHERE incidents.status = 'open'
         ORDER BY incidents.created_at, incidents.rowid`,
            ),
            listResolvedIncidents: this.db.prepare(
                `SELECT incidents.id, incidents.title, services.name AS service,
                incidents.severity, incidents.status, incidents.resolved_at, incidents.summary
         FROM incidents JOIN services ON services.id = incidents.service_id
         WHERE incidents.status = 'resolved'
         ORDER BY incidents.created_at, incidents.rowid`,
            ),
            findService: this.db.prepare(
                "SELECT id FROM services WHERE name = ?",
            ),
            insertIncident: this.db.prepare(
                "INSERT INTO incidents (id, title, service_id, severity, status) VALUES (?, ?, ?, ?, 'open')",
            ),
            findIncident: this.db.prepare(
                `SELECT incidents.id, incidents.title, services.name AS service,
                incidents.severity, incidents.status, incidents.resolved_at, incidents.summary
         FROM incidents JOIN services ON services.id = incidents.service_id
         WHERE incidents.id = ?`,
            ),
            resolveIncident: this.db.prepare(
                "UPDATE incidents SET status = 'resolved', resolved_at = ? WHERE id = ? AND status = 'open'",
            ),
            findRunbook: this.db.prepare(
                `SELECT services.name AS service, runbooks.title, runbooks.content
         FROM runbooks JOIN services ON services.id = runbooks.service_id
         WHERE services.name = ? COLLATE NOCASE`,
            ),
        };
    }

    listServices(): Service[] {
        return this.statements.listServices.all().map(parseService);
    }

    listAlerts(status?: AlertFilterStatus): Alert[] {
        const filter =
            status === undefined
                ? undefined
                : AlertFilterStatusSchema.parse(status);
        const rows =
            filter === undefined || filter === "all"
                ? this.statements.listAlerts.all()
                : this.statements.listAlertsByStatus.all(filter);
        return rows.map(parseAlert);
    }

    openIncident(
        title: string,
        service: string,
        severity: IncidentSeverity,
    ): Incident {
        const input = OpenIncidentInputSchema.parse({
            title,
            service,
            severity,
        });
        const serviceRow = this.statements.findService.get(input.service);
        if (!serviceRow)
            throw new UnknownServiceError(`Unknown service: ${input.service}`);

        const serviceId = z.object({ id: z.string() }).parse(serviceRow).id;
        const id = `inc-${randomUUID()}`;
        this.statements.insertIncident.run(
            id,
            input.title,
            serviceId,
            input.severity,
        );
        return parseIncident(this.statements.findIncident.get(id));
    }

    resolveIncident(id: string): Incident {
        const input = ResolveIncidentInputSchema.parse({ id });
        const current = this.statements.findIncident.get(input.id);
        if (!current)
            throw new UnknownIncidentError(`Unknown incident: ${input.id}`);

        const incident = parseIncident(current);
        if (incident.status === "resolved") {
            throw new IncidentAlreadyResolvedError(
                `Incident already resolved: ${input.id}`,
            );
        }

        this.statements.resolveIncident.run(new Date().toISOString(), input.id);
        return parseIncident(this.statements.findIncident.get(input.id));
    }

    listIncidents(filter?: IncidentFilter): Incident[] {
        const status =
            filter === undefined ? "all" : IncidentFilterSchema.parse(filter);
        const statement =
            status === "open"
                ? this.statements.listOpenIncidents
                : status === "resolved"
                  ? this.statements.listResolvedIncidents
                  : this.statements.listIncidents;
        return statement.all().map(parseIncident);
    }

    getRunbook(service: string): Runbook {
        const name = z.string().trim().min(1).parse(service);
        const row = this.statements.findRunbook.get(name);
        if (!row)
            throw new UnknownRunbookError(`No runbook for service: ${name}`);
        return parseRunbook(row);
    }

    close(): void {
        if (this.closed) return;
        this.db.close();
        this.closed = true;
    }
}

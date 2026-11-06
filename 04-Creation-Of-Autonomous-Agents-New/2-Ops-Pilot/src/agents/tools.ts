import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { defaultOpsStore } from "./store.js";
import {
  AlertSchema,
  AlertFilterStatusSchema,
  IncidentFilterSchema,
  IncidentSeveritySchema,
  IncidentSchema,
  RunbookSchema,
} from "./types.js";
import type { OpsStore } from "./store.js";

export type ToolCallLimiter = (
  name: string,
  args: Record<string, unknown>,
) => boolean;

const listAlertsInputSchema = z
  .object({
    status: AlertFilterStatusSchema.optional().describe(
      "Filter alerts by firing, resolved, or all; omitted means all alert statuses.",
    ),
  })
  .strict();
const openIncidentInputSchema = z
  .object({
    title: z.string().trim().min(1).describe("Short, factual incident title."),
    service: z
      .string()
      .trim()
      .min(1)
      .describe("Exact name of a known service, such as Checkout or Payments."),
    severity: IncidentSeveritySchema.describe(
      "Incident severity: critical, high, medium, or low.",
    ),
  })
  .strict();
const resolveIncidentInputSchema = z
  .object({
    id: z.string().trim().min(1).describe("ID of an existing open incident."),
  })
  .strict();
const listIncidentsInputSchema = z
  .object({
    status: IncidentFilterSchema.optional().describe(
      "Incident status to list: open, resolved, or all; defaults to open.",
    ),
  })
  .strict();
const consultRunbookInputSchema = z
  .object({
    service: z
      .string()
      .trim()
      .min(1)
      .describe("Name of the service whose operational runbook is needed."),
  })
  .strict();

export function createOpsTools(
  store: OpsStore = defaultOpsStore,
  allowToolCall?: ToolCallLimiter,
) {
  const isAllowed = (name: string, args: Record<string, unknown>) =>
    allowToolCall?.(name, args) ?? true;

  const listAlerts = tool(
    async ({ status }) => {
      const args = status === undefined ? {} : { status };
      if (!isAllowed("list_alerts", args)) {
        return "Iteration limit reached; this tool call was not executed.";
      }
      return JSON.stringify(
        z.array(AlertSchema).parse(store.listAlerts(status)),
      );
    },
    {
      name: "list_alerts",
      description:
        "Lista alertas de monitoramento. Use para verificar o que está disparando ou responder como está o plantão. status aceita firing, resolved ou all e, se omitido, retorna todos. Retorna os alertas correspondentes sem alterar dados.",
      schema: listAlertsInputSchema,
    },
  );

  const openIncident = tool(
    async ({ title, service, severity }) => {
      const args = { title, service, severity };
      if (!isAllowed("open_incident", args)) {
        return "Iteration limit reached; this tool call was not executed.";
      }
      return JSON.stringify(
        IncidentSchema.parse(store.openIncident(title, service, severity)),
      );
    },
    {
      name: "open_incident",
      description:
        "Abre um incidente para um serviço conhecido. Use quando um alerta ou falha confirmada exigir acompanhamento e resposta coordenada; não abra incidentes para perguntas informativas nem duplique incidentes existentes. Informe título factual, nome exato do serviço e severidade critical, high, medium ou low. Retorna o incidente criado em estado open.",
      schema: openIncidentInputSchema,
    },
  );

  const resolveIncident = tool(
    async ({ id }) => {
      const args = { id };
      if (!isAllowed("resolve_incident", args)) {
        return "Iteration limit reached; this tool call was not executed.";
      }
      return JSON.stringify(
        IncidentSchema.parse(store.resolveIncident(id)),
      );
    },
    {
      name: "resolve_incident",
      description:
        "Resolve um incidente aberto pelo ID. Use apenas quando a resposta estiver concluída e o incidente puder ser encerrado; a ação grava o horário de resolução e retorna o incidente atualizado.",
      schema: resolveIncidentInputSchema,
    },
  );

  const listIncidents = tool(
    async ({ status }) => {
      const args = status === undefined ? {} : { status };
      if (!isAllowed("list_incidents", args)) {
        return "Iteration limit reached; this tool call was not executed.";
      }
      return JSON.stringify(
        z.array(IncidentSchema).parse(store.listIncidents(status ?? "open")),
      );
    },
    {
      name: "list_incidents",
      description:
        "Lista incidentes para acompanhar trabalho operacional ativo ou consultar histórico. Use ao verificar incidentes em andamento ou revisar casos encerrados. status aceita open, resolved ou all e, se omitido, retorna apenas open. Retorna incidentes sem alterar dados.",
      schema: listIncidentsInputSchema,
    },
  );

  const consultarRunbook = tool(
    async ({ service }) => {
      const args = { service };
      if (!isAllowed("consultar_runbook", args)) {
        return "Iteration limit reached; this tool call was not executed.";
      }
      return JSON.stringify(RunbookSchema.parse(store.getRunbook(service)));
    },
    {
      name: "consultar_runbook",
      description:
        "Consulta o runbook operacional de um serviço. Use durante a investigação para obter verificações iniciais e orientação de escalonamento. Informe o nome do serviço; retorna apenas o runbook correspondente e não executa ações no serviço.",
      schema: consultRunbookInputSchema,
    },
  );

  return [listAlerts, openIncident, resolveIncident, listIncidents, consultarRunbook] as const;
}

export const store = defaultOpsStore;
export const opsTools = createOpsTools(store);
export const [
  listAlerts,
  openIncident,
  resolveIncident,
  listIncidents,
  consultarRunbook,
] = opsTools;

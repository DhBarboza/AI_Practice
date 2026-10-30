import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { defaultOpsStore, type MemoryOpsStore } from "./store.js";
import {
  AlertSchema,
  AlertFilterStatusSchema,
  IncidentSchema,
} from "./types.js";

export type ToolCallLimiter = (
  name: string,
  args: Record<string, unknown>,
) => boolean;

const incidentSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
const listAlertsInputSchema = z
  .object({ status: AlertFilterStatusSchema.optional() })
  .strict();
const openIncidentInputSchema = z
  .object({
    title: z.string().trim().min(1),
    service: z.string().trim().min(1),
    severity: incidentSeveritySchema,
  })
  .strict();
const resolveIncidentInputSchema = z
  .object({ id: z.string().trim().min(1) })
  .strict();

export function createOpsTools(
  store: MemoryOpsStore = defaultOpsStore,
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
        "Lista os alertas de monitoramento. Use quando o plantonista perguntar o que está disparando, o estado dos serviços ou 'como está o plantão'. status: firing | resolved | all",
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
      description: "Open an incident for a known service.",
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
      description: "Resolve an existing incident by its incident ID.",
      schema: resolveIncidentInputSchema,
    },
  );

  return [listAlerts, openIncident, resolveIncident] as const;
}

export const store = defaultOpsStore;
export const opsTools = createOpsTools(store);
export const [listAlerts, openIncident, resolveIncident] = opsTools;

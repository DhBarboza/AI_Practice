import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { defaultOpsStore, type MemoryOpsStore } from "./store.js";

export type ToolCallLimiter = (
  name: string,
  args: Record<string, unknown>,
) => boolean;

const alertStatusSchema = z.enum(["firing", "resolved"]);
const incidentSeveritySchema = z.enum(["critical", "high", "medium", "low"]);

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
      return JSON.stringify(store.listAlerts(status));
    },
    {
      name: "list_alerts",
      description: "List alerts, optionally filtered by firing or resolved status.",
      schema: z.object({ status: alertStatusSchema.optional() }),
    },
  );

  const openIncident = tool(
    async ({ title, service, severity }) => {
      const args = { title, service, severity };
      if (!isAllowed("open_incident", args)) {
        return "Iteration limit reached; this tool call was not executed.";
      }
      return JSON.stringify(store.openIncident(title, service, severity));
    },
    {
      name: "open_incident",
      description: "Open an incident for a known service.",
      schema: z.object({
        title: z.string().min(1),
        service: z.string().min(1),
        severity: incidentSeveritySchema,
      }),
    },
  );

  const resolveIncident = tool(
    async ({ id }) => {
      const args = { id };
      if (!isAllowed("resolve_incident", args)) {
        return "Iteration limit reached; this tool call was not executed.";
      }
      return JSON.stringify(store.resolveIncident(id));
    },
    {
      name: "resolve_incident",
      description: "Resolve an existing incident by its incident ID.",
      schema: z.object({ id: z.string().min(1) }),
    },
  );

  return [listAlerts, openIncident, resolveIncident] as const;
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SqliteOpsStore } from "../store/sqlite-ops-store.ts";

const store = new SqliteOpsStore();
const server = new McpServer({
    name: "opspilot",
    version: "1.0.0",
});

server.registerTool(
    "open_incident",
    {
        description:
            "Abre um novo incidente no OpsPilot. Use quando o usuário relatar um problema em produção ou pedir para registrar/abrir um incidente.",
        inputSchema: {
            title: z.string().min(1).describe("Título curto do incidente."),
            service_id: z
                .string()
                .describe("Serviço afetado (ex: checkout, payments)"),
            severity: z
                .enum(["low", "medium", "high", "critical"])
                .describe("Severidade do incidente"),
        },
    },
    async ({ title, service_id, severity }) => ({
        content: [
            {
                type: "text",
                text: JSON.stringify(
                    store.openIncident(title, service_id, severity),
                ),
            },
        ],
    }),
);

// list_alerts e resolve_incident seguem o mesmo padrão

await server.connect(new StdioServerTransport());
console.error("opspilot MCP server: pronto (stdio)"); // stderr, nunca stdout

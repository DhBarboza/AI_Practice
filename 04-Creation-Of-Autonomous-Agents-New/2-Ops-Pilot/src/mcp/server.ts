import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createOpsTools } from "../agents/tools.js";
import { SqliteOpsStore } from "../store/sqlite-ops-store.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function main(): Promise<void> {
  const store = new SqliteOpsStore();
  const server = new McpServer({
    name: "opspilot",
    version: "1.0.0",
  });
  const [listAlerts, openIncident, resolveIncident] = createOpsTools(store);

  server.registerTool(
    listAlerts.name,
    {
      description: listAlerts.description,
      inputSchema: listAlerts.schema,
    },
    async (args) => ({
      content: [{ type: "text", text: await listAlerts.invoke(args) }],
    }),
  );
  server.registerTool(
    openIncident.name,
    {
      description: openIncident.description,
      inputSchema: openIncident.schema,
    },
    async (args) => ({
      content: [{ type: "text", text: await openIncident.invoke(args) }],
    }),
  );
  server.registerTool(
    resolveIncident.name,
    {
      description: resolveIncident.description,
      inputSchema: resolveIncident.schema,
    },
    async (args) => ({
      content: [{ type: "text", text: await resolveIncident.invoke(args) }],
    }),
  );

  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
  } catch (error) {
    store.close();
    throw error;
  }

  const shutdown = () => {
    void (async () => {
      try {
        await server.close();
      } catch (error) {
        console.error(`opspilot MCP shutdown failed: ${errorMessage(error)}`);
        process.exitCode = 1;
      } finally {
        store.close();
      }
    })();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  console.error("opspilot MCP server: ready (stdio)");
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  await main().catch((error: unknown) => {
    console.error(`opspilot MCP server failed: ${errorMessage(error)}`);
    process.exitCode = 1;
  });
}

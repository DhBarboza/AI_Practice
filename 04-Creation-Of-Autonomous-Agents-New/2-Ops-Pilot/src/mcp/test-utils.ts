import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface RunningOpsPilotClient {
  client: Client;
  transport: StdioClientTransport;
  close(): Promise<void>;
}

export async function startOpsPilotClient(): Promise<RunningOpsPilotClient> {
  const transport = new StdioClientTransport({
    command: "npm",
    args: ["run", "--silent", "mcp"],
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    env: { OPSPILOT_DB: ":memory:" },
    stderr: "pipe",
  });
  const client = new Client({
    name: "opspilot-test-client",
    version: "1.0.0",
  });

  try {
    await client.connect(transport);
  } catch (error) {
    await transport.close();
    throw error;
  }

  return {
    client,
    transport,
    close: () => client.close(),
  };
}

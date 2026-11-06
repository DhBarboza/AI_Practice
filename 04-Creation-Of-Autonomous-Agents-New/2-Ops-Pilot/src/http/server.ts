import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import express from "express";
import type { ErrorRequestHandler, Express } from "express";
import { z } from "zod";
import { agentRegistry, createAgentRegistry } from "../agents/index.js";
import { withReflection } from "../agents/reflection.js";
import type { ReasoningInput, ReasoningStrategy } from "../agents/types.js";
import { ReasoningResultSchema } from "../agents/types.js";
import { SqliteOpsStore } from "../store/sqlite-ops-store.js";

export const DEFAULT_CHAT_TIMEOUT_MS = 180_000;

const ChatRequestSchema = z
  .object({
    message: z.string().trim().min(1),
    strategy: z.string().trim().min(1).optional(),
    reflect: z.boolean().optional(),
  })
  .strict();

export interface ChatServerOptions {
  registry?: ReadonlyMap<string, ReasoningStrategy>;
  timeoutMs?: number;
  reflect?: (strategy: ReasoningStrategy) => ReasoningStrategy;
}

class RequestTimeoutError extends Error {
  constructor() {
    super("Chat request timed out.");
    this.name = "RequestTimeoutError";
  }
}

function runWithTimeout<T>(run: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new RequestTimeoutError()), timeoutMs);
  });

  return Promise.race([run, deadline]).finally(() => clearTimeout(timeout));
}

function malformedJsonIssues(): z.ZodIssue[] {
  return [
    {
      code: "custom",
      path: [],
      message: "Malformed JSON request body.",
    },
  ];
}

function isJsonParserError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  );
}

export function createApp(options: ChatServerOptions = {}): Express {
  const registry = options.registry ?? agentRegistry;
  const timeoutMs = options.timeoutMs ?? DEFAULT_CHAT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("timeoutMs must be a positive finite number.");
  }
  const reflect = options.reflect ?? withReflection;
  const app = express();

  app.use(express.json());
  app.post("/chat", async (request, response) => {
    const parsedRequest = ChatRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(400).json({ issues: parsedRequest.error.issues });
      return;
    }

    const { message, strategy: strategyName = "react", reflect: shouldReflect = false } =
      parsedRequest.data;
    const baseStrategy = registry.get(strategyName);
    if (!baseStrategy) {
      response.status(422).json({ error: "Unknown strategy" });
      return;
    }

    const strategy = shouldReflect ? reflect(baseStrategy) : baseStrategy;
    const input: ReasoningInput = { input: message, maxIterations: 8 };

    try {
      const result = await runWithTimeout(strategy.run(input), timeoutMs);
      const validated = ReasoningResultSchema.parse(result);
      response.status(200).json({
        answer: validated.answer,
        trace: validated.trace,
        metrics: validated.metrics,
      });
    } catch (error) {
      if (error instanceof RequestTimeoutError) {
        response.status(504).json({ error: "Request timed out" });
        return;
      }
      response.status(500).json({ error: "Internal server error" });
    }
  });

  const jsonErrorHandler: ErrorRequestHandler = (error, _request, response, next) => {
    if (isJsonParserError(error)) {
      response.status(400).json({ issues: malformedJsonIssues() });
      return;
    }
    next(error);
  };
  app.use(jsonErrorHandler);
  const genericErrorHandler: ErrorRequestHandler = (
    _error,
    _request,
    response,
    _next,
  ) => {
    response.status(500).json({ error: "Internal server error" });
  };
  app.use(genericErrorHandler);

  return app;
}

async function main(): Promise<void> {
  const rawPort = process.env.PORT ?? "3000";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  const store = new SqliteOpsStore();
  const server = createServer(createApp({ registry: createAgentRegistry(store) }));
  server.once("close", () => store.close());
  try {
    await new Promise<void>((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(port, () => {
        server.off("error", rejectListen);
        console.log(`OpsPilot HTTP server listening on port ${port}`);
        resolveListen();
      });
    });
  } catch (error) {
    store.close();
    throw error;
  }

  const shutdown = () => {
    server.close((error) => {
      if (error) {
        console.error(error.message);
        process.exitCode = 1;
      }
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  await main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

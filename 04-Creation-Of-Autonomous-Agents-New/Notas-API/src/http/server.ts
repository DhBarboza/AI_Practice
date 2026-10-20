import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { z } from 'zod';

import { normalizeTaskStatus } from '../domain/task.js';
import { DomainError, TaskService } from '../service/task-service.js';
import { InMemoryTaskStore } from '../store/in-memory-store.js';

const createTaskRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export function createTaskHttpServer(taskService = new TaskService(new InMemoryTaskStore())) {
  return createServer(async (req, res) => {
    try {
      const requestUrl = req.url ? new URL(req.url, 'http://localhost') : null;

      if (!requestUrl) {
        throw new DomainError('Invalid URL', 400);
      }

      const pathname = requestUrl.pathname.replace(/\/$/, '') || '/';
      const method = req.method ?? 'GET';

      if (method === 'GET' && pathname === '/health') {
        sendJson(res, 200, { status: 'ok' });
        return;
      }

      if (method === 'GET' && pathname === '/tasks') {
        const status = normalizeTaskStatus(requestUrl.searchParams.get('status') ?? undefined);
        sendJson(res, 200, taskService.listTasks(status));
        return;
      }

      if (method === 'GET' && pathname.startsWith('/tasks/')) {
        const taskId = pathname.slice('/tasks/'.length);

        if (!taskId) {
          throw new DomainError('Task id is required', 400);
        }

        sendJson(res, 200, taskService.getTask(taskId));
        return;
      }

      if (method === 'POST' && pathname === '/tasks') {
        const payload = await readJsonBody(req);
        const data = createTaskRequestSchema.parse(payload);
        const task = taskService.createTask(data.title);
        sendJson(res, 201, task);
        return;
      }

      if (method === 'PATCH' && pathname.startsWith('/tasks/')) {
        const taskId = pathname.slice('/tasks/'.length).split('/')[0];

        if (!taskId || !pathname.endsWith('/complete')) {
          throw new DomainError('Invalid task completion route', 400);
        }

        if (pathname !== `/tasks/${taskId}/complete`) {
          throw new DomainError('Invalid task completion route', 400);
        }

        const task = taskService.completeTask(taskId);
        sendJson(res, 200, task);
        return;
      }

      if (method === 'DELETE' && pathname.startsWith('/tasks/')) {
        const taskId = pathname.slice('/tasks/'.length).split('/')[0];

        if (!taskId || pathname !== `/tasks/${taskId}`) {
          throw new DomainError('Invalid task removal route', 400);
        }

        taskService.removeTask(taskId);
        res.writeHead(204);
        res.end();
        return;
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      const domainError = error as { statusCode?: number; message?: string };

      if (domainError instanceof DomainError) {
        sendJson(res, domainError.statusCode, { error: domainError.message });
        return;
      }

      if (error instanceof z.ZodError) {
        sendJson(res, 400, { error: error.issues.map((issue) => issue.message).join('; ') });
        return;
      }

      sendJson(res, 500, { error: 'Internal server error' });
    }
  });
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const buffers: Buffer[] = [];

  for await (const chunk of req) {
    buffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (buffers.length === 0) {
    return {};
  }

  const body = Buffer.concat(buffers).toString('utf8');

  if (!body.trim()) {
    return {};
  }

  return JSON.parse(body) as Record<string, unknown>;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

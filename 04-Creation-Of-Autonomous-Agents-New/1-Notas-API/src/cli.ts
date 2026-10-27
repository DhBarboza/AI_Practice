import { z } from 'zod';

const apiBaseUrl = process.env.TASKS_API_URL ?? 'http://localhost:3000';

const listStatusSchema = z.enum(['all', 'open', 'done']);

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });

  const responseBody = await response.text();
  const payload = responseBody ? JSON.parse(responseBody) : null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
  }

  return payload as T;
}

async function createTask(title: string) {
  const task = await requestJson<{ id: string; title: string; status: string; createdAt: string }>('/tasks', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });

  console.log(`Created task ${task.id}: ${task.title} [${task.status}]`);
}

async function listTasks(status: 'all' | 'open' | 'done') {
  const tasks = await requestJson<Array<{ id: string; title: string; status: string }>>(`/tasks?status=${status}`);

  if (tasks.length === 0) {
    console.log(`No tasks found with status ${status}.`);
    return;
  }

  for (const task of tasks) {
    console.log(`${task.id} | ${task.title} | ${task.status}`);
  }
}

async function completeTask(taskId: string) {
  const task = await requestJson<{ id: string; title: string; status: string }>('/tasks/' + taskId + '/complete', {
    method: 'PATCH',
  });

  console.log(`Completed task ${task.id}: ${task.title} [${task.status}]`);
}

async function removeTask(taskId: string) {
  await requestJson(`/tasks/${taskId}`, {
    method: 'DELETE',
  });
  console.log(`Removed task ${taskId}`);
}

export async function runCli(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'create': {
        if (!args[0]) {
          throw new Error('Usage: create <title>');
        }

        await createTask(args.join(' '));
        return;
      }

      case 'list': {
        const status = listStatusSchema.parse(args[0] ?? 'all');
        await listTasks(status);
        return;
      }

      case 'complete': {
        if (!args[0]) {
          throw new Error('Usage: complete <task-id>');
        }

        await completeTask(args[0]);
        return;
      }

      case 'remove': {
        if (!args[0]) {
          throw new Error('Usage: remove <task-id>');
        }

        await removeTask(args[0]);
        return;
      }

      case undefined:
        throw new Error('Usage: create|list|complete|remove');

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown CLI error';
    console.error(message);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runCli();
}

import { randomUUID } from 'node:crypto';

import type { Task, TaskStatus } from '../domain/task.js';
import type { TaskStore } from './task-store.js';

export class InMemoryTaskStore implements TaskStore {
  private readonly tasks = new Map<string, Task>();

  create(title: string): Task {
    const task: Task = {
      id: randomUUID(),
      title,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    return structuredClone(task);
  }

  list(status: 'all' | TaskStatus): Task[] {
    const tasks = [...this.tasks.values()];
    const filtered = status === 'all' ? tasks : tasks.filter((task) => task.status === status);
    return filtered.sort((left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }

  get(id: string): Task | undefined {
    const task = this.tasks.get(id);
    return task ? structuredClone(task) : undefined;
  }

  complete(id: string): Task {
    const task = this.tasks.get(id);

    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    const updatedTask: Task = { ...task, status: 'done' };
    this.tasks.set(id, updatedTask);
    return structuredClone(updatedTask);
  }

  remove(id: string): boolean {
    return this.tasks.delete(id);
  }
}

import { createTaskInputSchema, normalizeTaskStatus, taskSchema, type Task, type TaskStatus } from '../domain/task.js';
import type { TaskStore } from '../store/task-store.js';

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(id: string) {
    super(`Task not found: ${id}`, 404);
    this.name = 'NotFoundError';
  }
}

export class TaskService {
  constructor(private readonly store: TaskStore) {}

  createTask(title: string): Task {
    const { title: normalizedTitle } = createTaskInputSchema.parse({ title });
    const task = this.store.create(normalizedTitle);
    return taskSchema.parse(task);
  }

  listTasks(status: 'all' | TaskStatus = 'all'): Task[] {
    const normalizedStatus = normalizeTaskStatus(status);
    const tasks = this.store.list(normalizedStatus);
    return tasks.map((task) => taskSchema.parse(task));
  }

  getTask(id: string): Task {
    const task = this.store.get(id);

    if (!task) {
      throw new NotFoundError(id);
    }

    return taskSchema.parse(task);
  }

  completeTask(id: string): Task {
    const task = this.store.get(id);

    if (!task) {
      throw new NotFoundError(id);
    }

    const updatedTask = this.store.complete(id);
    return taskSchema.parse(updatedTask);
  }

  removeTask(id: string): void {
    const task = this.store.get(id);

    if (!task) {
      throw new NotFoundError(id);
    }

    const removed = this.store.remove(id);

    if (!removed) {
      throw new NotFoundError(id);
    }
  }
}

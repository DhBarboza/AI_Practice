import type { Task, TaskStatus } from '../domain/task.js';

export interface TaskStore {
  create(title: string): Task;
  list(status: 'all' | TaskStatus): Task[];
  get(id: string): Task | undefined;
  complete(id: string): Task;
  remove(id: string): boolean;
}

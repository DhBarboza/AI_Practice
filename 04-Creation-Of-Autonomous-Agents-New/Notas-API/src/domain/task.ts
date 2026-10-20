import { z } from 'zod';

export const taskStatusSchema = z.enum(['open', 'done']);

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  status: taskStatusSchema,
  createdAt: z.string().datetime(),
});

export const createTaskInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const listTasksQuerySchema = z.object({
  status: z.enum(['all', 'open', 'done']).default('all'),
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export function isTaskStatus(value: string | undefined): value is TaskStatus {
  return value === 'open' || value === 'done';
}

export function normalizeTaskStatus(value: string | undefined): 'all' | TaskStatus {
  if (value === 'open' || value === 'done') {
    return value;
  }

  return 'all';
}

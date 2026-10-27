import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryTaskStore } from '../store/in-memory-store.js';
import { NotFoundError, TaskService } from './task-service.js';

test('TaskService creates, lists, completes and removes tasks', () => {
  const service = new TaskService(new InMemoryTaskStore());

  const created = service.createTask('Estudar Node.js');

  assert.equal(created.title, 'Estudar Node.js');
  assert.equal(created.status, 'open');
  assert.equal(service.listTasks('all').length, 1);
  assert.equal(service.listTasks('open').length, 1);
  assert.equal(service.listTasks('done').length, 0);

  const completed = service.completeTask(created.id);
  assert.equal(completed.status, 'done');
  assert.equal(service.listTasks('done').length, 1);
  assert.equal(service.listTasks('open').length, 0);

  service.removeTask(created.id);
  assert.throws(() => service.getTask(created.id), NotFoundError);
});

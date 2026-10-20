import assert from 'node:assert/strict';
import test from 'node:test';

import { createTaskHttpServer } from './server.js';

test('HTTP API handles task lifecycle', async () => {
  const server = createTaskHttpServer();

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Server did not start on a TCP port');
  }

  const { port } = address;

  try {
    const createResponse = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Comprar pão' }),
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { id: string; title: string; status: string };
    assert.equal(created.title, 'Comprar pão');
    assert.equal(created.status, 'open');

    const allResponse = await fetch(`http://127.0.0.1:${port}/tasks?status=all`);
    const allTasks = (await allResponse.json()) as Array<{ id: string; status: string }>;
    assert.equal(allTasks.length, 1);
    assert.equal(allTasks[0].id, created.id);

    const openResponse = await fetch(`http://127.0.0.1:${port}/tasks?status=open`);
    const openTasks = (await openResponse.json()) as Array<{ id: string; status: string }>;
    assert.equal(openTasks.length, 1);

    const doneResponse = await fetch(`http://127.0.0.1:${port}/tasks?status=done`);
    const doneTasks = (await doneResponse.json()) as Array<{ id: string; status: string }>;
    assert.equal(doneTasks.length, 0);

    const completeResponse = await fetch(`http://127.0.0.1:${port}/tasks/${created.id}/complete`, {
      method: 'PATCH',
    });

    assert.equal(completeResponse.status, 200);
    const completed = (await completeResponse.json()) as { status: string };
    assert.equal(completed.status, 'done');

    const finalDoneResponse = await fetch(`http://127.0.0.1:${port}/tasks?status=done`);
    const finalDoneTasks = (await finalDoneResponse.json()) as Array<{ id: string; status: string }>;
    assert.equal(finalDoneTasks.length, 1);

    const removeResponse = await fetch(`http://127.0.0.1:${port}/tasks/${created.id}`, {
      method: 'DELETE',
    });

    assert.equal(removeResponse.status, 204);

    const afterDelete = await fetch(`http://127.0.0.1:${port}/tasks/${created.id}`);
    assert.equal(afterDelete.status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});

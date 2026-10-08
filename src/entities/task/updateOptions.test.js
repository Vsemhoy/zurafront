import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MutationObserver, QueryClient } from '@tanstack/query-core';
import { taskUpdateOptions } from './updateOptions.js';

test('late parent save updates only parent cache after switching to a cached child', async () => {
  const client = new QueryClient();
  const parentKey = ['task', 'scope', 'parent'];
  const childKey = ['task', 'scope', 'child'];
  const child = { id: 'child', description: '' };
  client.setQueryData(parentKey, { id: 'parent', description: 'Original' });
  client.setQueryData(childKey, child);
  let finish;
  const options = taskUpdateOptions(client, (scopeId, taskId, payload) => {
    assert.equal(scopeId, 'scope');
    assert.equal(taskId, 'parent');
    return new Promise(resolve => { finish = () => resolve({ id: taskId, ...payload }); });
  });
  const observer = new MutationObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  try {
    const saving = observer.mutate({ scopeId: 'scope', taskId: 'parent', payload: { description: 'Edited' } });
    await new Promise(resolve => setTimeout(resolve, 0));
    observer.setOptions(taskUpdateOptions(client, () => { throw new Error('Wrong request target'); }));
    finish();
    await saving;
    assert.equal(client.getQueryData(parentKey).description, 'Edited');
    assert.deepEqual(client.getQueryData(childKey), child);
  } finally { unsubscribe(); client.clear(); }
});

test('mismatched task response cannot poison the cache', async () => {
  const client = new QueryClient();
  const key = ['task', 'scope', 'parent'];
  client.setQueryData(key, { id: 'parent', description: 'Keep me' });
  const observer = new MutationObserver(client, taskUpdateOptions(client, async () => ({ id: 'child', description: null })));
  await assert.rejects(observer.mutate({ scopeId: 'scope', taskId: 'parent', payload: { title: 'Title' } }), /другой задаче/);
  assert.equal(client.getQueryData(key).description, 'Keep me');
  client.clear();
});

test('late responses remain bound to their original scope', async () => {
  const client = new QueryClient();
  const options = taskUpdateOptions(client, async () => ({ id: 'task', result: 'Saved' }));
  const updated = await options.mutationFn({ scopeId: 'old-scope', taskId: 'task', payload: { result: 'Saved' } });
  options.onSuccess(updated, { scopeId: 'old-scope', taskId: 'task' });
  assert.equal(client.getQueryData(['task', 'old-scope', 'task']).result, 'Saved');
  assert.equal(client.getQueryData(['task', 'new-scope', 'task']), undefined);
  client.clear();
});

test('updates for one task are applied in submission order', async () => {
  const client = new QueryClient();
  const requests = [];
  let finishFirst;
  const options = {
    ...taskUpdateOptions(client, async (scopeId, taskId, payload) => {
      requests.push(payload.description);
      if (payload.description === 'First') await new Promise(resolve => { finishFirst = resolve; });
      return { id: taskId, ...payload };
    }),
    scope: { id: 'task-update:scope:parent' },
  };
  const first = new MutationObserver(client, options);
  const second = new MutationObserver(client, options);
  try {
    const one = first.mutate({ scopeId: 'scope', taskId: 'parent', payload: { description: 'First' } });
    await new Promise(resolve => setTimeout(resolve, 0));
    const two = second.mutate({ scopeId: 'scope', taskId: 'parent', payload: { description: 'Second' } });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(requests, ['First']);
    finishFirst();
    await Promise.all([one, two]);
    assert.deepEqual(requests, ['First', 'Second']);
    assert.equal(client.getQueryData(['task', 'scope', 'parent']).description, 'Second');
  } finally { client.clear(); }
});

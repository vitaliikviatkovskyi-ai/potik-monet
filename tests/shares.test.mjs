import test from 'node:test';
import assert from 'node:assert/strict';
import { createShareHandler } from '../netlify/lib/shares-core.mjs';

const base = 'https://example.netlify.app/.netlify/functions/shares';
const goal = { title: 'Новий ноутбук', targetAmount: 60000, savedAmount: 12000, monthlyContribution: 4000, annualReturn: 0 };

function setup() {
  const records = new Map();
  const handler = createShareHandler(() => ({
    async setJSON(key, value, options) {
      if (options?.onlyIfNew && records.has(key)) return { modified: false };
      records.set(key, value);
      return { modified: true };
    },
    async get(key) { return records.get(key) ?? null; },
    async delete(key) { records.delete(key); }
  }));
  const request = (method, id = '', body = null, secret = '') => new Request(base + (id ? '?id=' + id : ''), {
    method,
    headers: {
      Origin: 'https://example.netlify.app',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(secret ? { Authorization: 'Bearer ' + secret } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { handler, request };
}

test('a shared link shows only the selected goal and stops working after revocation', async () => {
  const { handler, request } = setup();
  const created = await handler(request('POST', '', goal));
  assert.equal(created.status, 201);
  const { id, secret } = await created.json();
  assert.match(id, /^[A-Za-z0-9_-]{32}$/);
  assert.match(secret, /^[A-Za-z0-9_-]{43}$/);

  const opened = await handler(request('GET', id));
  assert.deepEqual(await opened.json(), { goal });

  const changed = { ...goal, monthlyContribution: 5000 };
  assert.equal((await handler(request('PUT', id, changed, 'wrong'))).status, 403);
  assert.equal((await handler(request('PUT', id, changed, secret))).status, 200);
  assert.deepEqual(await (await handler(request('GET', id))).json(), { goal: changed });

  assert.equal((await handler(request('DELETE', id, null, 'wrong'))).status, 403);
  assert.equal((await handler(request('DELETE', id, null, secret))).status, 204);
  assert.equal((await handler(request('GET', id))).status, 404);
});

test('invalid goals and cross-site writes are rejected', async () => {
  const { handler, request } = setup();
  assert.equal((await handler(request('POST', '', { ...goal, targetAmount: -1 }))).status, 400);
  const foreign = new Request(base, {
    method: 'POST',
    headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' },
    body: JSON.stringify(goal)
  });
  assert.equal((await handler(foreign)).status, 403);
});

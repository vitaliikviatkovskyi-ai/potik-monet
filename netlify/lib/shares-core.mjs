import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};
const idPattern = /^[A-Za-z0-9_-]{32}$/;
const secretPattern = /^[A-Za-z0-9_-]{43}$/;

const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
const digest = secret => createHash('sha256').update(secret).digest();

function cleanGoal(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Некоректна ціль.');
  const title = String(value.title ?? '').trim();
  const goal = {
    title,
    targetAmount: Number(value.targetAmount),
    savedAmount: Number(value.savedAmount),
    monthlyContribution: Number(value.monthlyContribution),
    annualReturn: Number(value.annualReturn)
  };
  if (!title || title.length > 100 ||
      !Number.isFinite(goal.targetAmount) || goal.targetAmount <= 0 || goal.targetAmount > 1e12 ||
      !Number.isFinite(goal.savedAmount) || goal.savedAmount < 0 || goal.savedAmount > 1e12 ||
      !Number.isFinite(goal.monthlyContribution) || goal.monthlyContribution <= 0 || goal.monthlyContribution > 1e12 ||
      !Number.isFinite(goal.annualReturn) || goal.annualReturn < 0 || goal.annualReturn > 1000) {
    throw new Error('Перевірте назву та параметри цілі.');
  }
  return goal;
}

function isOwner(request, record) {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get('Authorization') || '');
  if (!match || !record?.adminHash) return false;
  const supplied = digest(match[1]);
  const stored = Buffer.from(record.adminHash, 'hex');
  return stored.length === supplied.length && timingSafeEqual(stored, supplied);
}

export function createShareHandler(openStore) {
  return async request => {
    try {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) return reply({ error: 'Метод не підтримується.' }, 405);
      if (request.method !== 'GET') {
        const origin = request.headers.get('Origin');
        if (origin && origin !== url.origin) return reply({ error: 'Запит з іншого сайту заборонено.' }, 403);
      }
      if (request.method === 'POST' || request.method === 'PUT') {
        if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({ error: 'Потрібен формат JSON.' }, 415);
        if (Number(request.headers.get('Content-Length') || 0) > 4096) return reply({ error: 'Запит завеликий.' }, 413);
      }
      const store = openStore();
      if (request.method === 'POST') {
        const goal = cleanGoal(await request.json());
        const newId = randomBytes(24).toString('base64url');
        const secret = randomBytes(32).toString('base64url');
        const { modified } = await store.setJSON(newId, {
          goal,
          adminHash: digest(secret).toString('hex'),
          createdAt: new Date().toISOString()
        }, { onlyIfNew: true });
        if (!modified) return reply({ error: 'Спробуйте створити посилання ще раз.' }, 503);
        return reply({ id: newId, secret }, 201);
      }
      if (!idPattern.test(id || '')) return reply({ error: 'Некоректне посилання.' }, 400);
      const record = await store.get(id, { type: 'json' });
      if (!record) return reply({ error: 'Посилання недоступне або відкликане.' }, 404);
      if (request.method === 'GET') return reply({ goal: record.goal });
      if (!isOwner(request, record)) return reply({ error: 'Немає права керувати цим посиланням.' }, 403);
      if (request.method === 'DELETE') {
        await store.delete(id);
        return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
      }
      const goal = cleanGoal(await request.json());
      await store.setJSON(id, { ...record, goal, updatedAt: new Date().toISOString() });
      return reply({ goal });
    } catch (error) {
      if (error instanceof SyntaxError || error.message?.startsWith('Перевірте') || error.message === 'Некоректна ціль.') {
        return reply({ error: error.message || 'Некоректний JSON.' }, 400);
      }
      console.error('Не вдалося обробити спільне посилання:', error);
      return reply({ error: 'Сервіс спільного доступу тимчасово недоступний.' }, 500);
    }
  };
}

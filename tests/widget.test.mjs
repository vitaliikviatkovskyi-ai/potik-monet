import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/widget.js';
const { calculateFund } = globalThis.PotikFundCalculator;

const normal = { expenses: '20000', months: '6', saved: '30000', deposit: '10000' };

test('calculates the financial cushion and the time to reach it', () => {
  const plan = calculateFund(normal);
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.result, { target: 120000, remaining: 90000, horizon: 9, progress: 25 });
  assert.equal(calculateFund({ ...normal, months: '12' }).result.target, 240000);
  assert.equal(calculateFund({ ...normal, saved: '120000' }).result.horizon, 0);
});

test('rejects empty, negative, excessive, fractional-duration and invalid values', () => {
  const cases = [
    [{ ...normal, expenses: '' }, 'expenses'],
    [{ ...normal, expenses: '-5' }, 'expenses'],
    [{ ...normal, expenses: '9999999999999999' }, 'expenses'],
    [{ ...normal, expenses: 'текст' }, 'expenses'],
    [{ ...normal, expenses: '2.555' }, 'expenses'],
    [{ ...normal, months: '2.5' }, 'months'],
    [{ ...normal, months: '99' }, 'months'],
    [{ ...normal, saved: 'Infinity' }, 'saved'],
    [{ ...normal, deposit: '0' }, 'deposit']
  ];
  for (const [input, field] of cases) {
    const actual = calculateFund(input);
    assert.equal(actual.valid, false, JSON.stringify(input));
    assert.ok(actual.errors[field], JSON.stringify(input));
    assert.equal(actual.result, undefined);
  }
});

test('does not show negative remaining amounts or stale data', () => {
  const complete = calculateFund({ ...normal, saved: '150000', deposit: '0' });
  assert.equal(complete.result.remaining, 0);
  assert.equal(complete.result.horizon, 0);
  assert.equal(complete.result.progress, 100);
  assert.equal(calculateFund(null).valid, false);
});

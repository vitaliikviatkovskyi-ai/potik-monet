// ЛР №11: один ізольований простір і звичайний script для роботи також через file://.
(() => {
const allowedMonths = new Set([3, 6, 9, 12]);
const moneyFormat = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 });

function amount(raw, label, min, max) {
  const text = String(raw ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    return { error: `Введіть коректну суму для поля «${label}».` };
  }
  const value = Number(text);
  if (!Number.isFinite(value) || value < min || value > max) {
    return { error: `Допустима сума: від ${moneyFormat.format(min)} до ${moneyFormat.format(max)} грн.` };
  }
  return { cents: Math.round(value * 100) };
}

function calculateFund(values) {
  const errors = {};
  const expenses = amount(values?.expenses, 'Щомісячні витрати', 1, 1_000_000);
  const saved = amount(values?.saved, 'Уже заощаджено', 0, 100_000_000);
  const deposit = amount(values?.deposit, 'Щомісячний внесок', 0, 1_000_000);
  const months = Number(values?.months);
  if (expenses.error) errors.expenses = expenses.error;
  if (saved.error) errors.saved = saved.error;
  if (deposit.error) errors.deposit = deposit.error;
  if (!allowedMonths.has(months) || String(values?.months ?? '') !== String(months)) {
    errors.months = 'Оберіть запас на 3, 6, 9 або 12 місяців.';
  }
  if (Object.keys(errors).length) return { valid: false, errors };

  const targetCents = expenses.cents * months;
  const remainingCents = Math.max(0, targetCents - saved.cents);
  if (remainingCents > 0 && deposit.cents === 0) {
    errors.deposit = 'Щоб накопичити решту, внесок має бути більшим за 0 грн.';
    return { valid: false, errors };
  }
  const horizon = remainingCents === 0 ? 0 : Math.ceil(remainingCents / deposit.cents);
  return {
    valid: true,
    errors,
    result: {
      target: targetCents / 100,
      remaining: remainingCents / 100,
      horizon,
      progress: Math.min(100, Math.round(saved.cents / targetCents * 100))
    }
  };
}

function initFundWidget() {
  const form = document.querySelector('#fund-form');
  if (!form) return;
  const fields = Object.fromEntries(['expenses', 'months', 'saved', 'deposit'].map(key => [key, form.querySelector(`#fund-${key}`)]));
  const errors = Object.fromEntries(Object.keys(fields).map(key => [key, form.querySelector(`#fund-${key}-error`)]));
  const result = document.querySelector('.fund-result');
  const status = document.querySelector('#fund-status');
  const target = document.querySelector('#fund-target');
  const remaining = document.querySelector('#fund-remaining');
  const horizon = document.querySelector('#fund-horizon');
  const progress = document.querySelector('#fund-progress');
  const progressText = document.querySelector('#fund-progress-text');
  if (Object.values(fields).some(field => !field) || Object.values(errors).some(error => !error) ||
      [result, status, target, remaining, horizon, progress, progressText].some(element => !element)) return;

  const display = value => `${moneyFormat.format(value)} ₴`;
  function update() {
    const values = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
    const calculation = calculateFund(values);
    for (const [key, field] of Object.entries(fields)) {
      const message = calculation.errors[key] || '';
      errors[key].textContent = message;
      field.setAttribute('aria-invalid', String(Boolean(message)));
      field.classList.toggle('fund-invalid', Boolean(message));
    }
    result.classList.toggle('fund-result-invalid', !calculation.valid);
    if (!calculation.valid) {
      status.textContent = 'Перевірте позначені поля.';
      target.textContent = '—';
      remaining.textContent = '—';
      horizon.textContent = '—';
      progress.value = 0;
      progressText.textContent = '—';
      return;
    }
    const plan = calculation.result;
    status.textContent = plan.horizon === 0 ? 'Потрібну суму вже зібрано.' : 'Рухайтеся до мети у своєму темпі.';
    target.textContent = display(plan.target);
    remaining.textContent = display(plan.remaining);
    horizon.textContent = plan.horizon === 0 ? 'Мету досягнуто' : `${plan.horizon} міс.`;
    progress.value = plan.progress;
    progressText.textContent = `${plan.progress}%`;
  }
  for (const field of Object.values(fields)) {
    field.addEventListener(field.tagName === 'SELECT' ? 'change' : 'input', update);
  }
  form.addEventListener('submit', event => event.preventDefault());
  update();
}

globalThis.PotikFundCalculator = Object.freeze({ calculateFund });
if (typeof document !== 'undefined') initFundWidget();
})();

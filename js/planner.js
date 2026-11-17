const params = new URLSearchParams(location.search);
const form = document.querySelector('.calculator-form');
const storageKey = 'potikMonetSavedGoals';
const shareStorageKey = 'potikMonetShareLinks';
const shareApi = '/.netlify/functions/shares';
const money = value => Math.round(value).toLocaleString('uk-UA') + ' ₴';
const percent = value => Math.min(100, Math.max(0, Math.round(value))) + '%';

function loadShareLinks() {
  try {
    const links = JSON.parse(localStorage.getItem(shareStorageKey) || '{}');
    return links && typeof links === 'object' && !Array.isArray(links) ? links : {};
  } catch {
    return {};
  }
}

function saveShareLinks(links) {
  localStorage.setItem(shareStorageKey, JSON.stringify(links));
}

function shareUrl(id) {
  const url = new URL('shared.html', location.href);
  url.search = new URLSearchParams({ share: id }).toString();
  return url.href;
}

async function shareRequest(method, id = '', goal = null, secret = '') {
  if (location.protocol === 'file:') throw new Error('Для спільного доступу відкрийте сайт через Netlify.');
  const options = { method, headers: { Accept: 'application/json' }, cache: 'no-store' };
  if (goal) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(goal);
  }
  if (secret) options.headers.Authorization = 'Bearer ' + secret;
  let response;
  try {
    response = await fetch(shareApi + (id ? '?id=' + encodeURIComponent(id) : ''), options);
  } catch {
    throw new Error('Сервіс спільного доступу недоступний. Перевірте підключення до мережі.');
  }
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Не вдалося виконати дію. Перевірте, чи сайт опубліковано з функціями Netlify.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function loadSavedGoals() {
  try {
    const goals = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(goals) ? goals : [];
  } catch (error) {
    console.warn('Не вдалося прочитати збережені цілі:', error);
    return [];
  }
}

function parseGoal(source) {
  const goal = {
    id: String(source.id || ''),
    title: String(source.title || 'Моя ціль').slice(0, 100),
    targetAmount: Number(source.targetAmount),
    savedAmount: Number(source.savedAmount ?? 0),
    monthlyContribution: Number(source.monthlyContribution),
    annualReturn: Number(source.annualReturn ?? 0)
  };
  if (!Number.isFinite(goal.targetAmount) || goal.targetAmount <= 0 ||
      !Number.isFinite(goal.savedAmount) || goal.savedAmount < 0 ||
      !Number.isFinite(goal.monthlyContribution) || goal.monthlyContribution <= 0 ||
      !Number.isFinite(goal.annualReturn) || goal.annualReturn < 0) {
    throw new Error('Перевірте параметри цілі.');
  }
  return goal;
}

function goalFromParams() {
  if (!params.has('goalAmount')) return null;
  return parseGoal({
    id: params.get('id'),
    title: params.get('title'),
    targetAmount: params.get('goalAmount'),
    savedAmount: params.get('savedAmount'),
    monthlyContribution: params.get('monthlyContribution'),
    annualReturn: params.get('annualReturn')
  });
}

function latestGoal() {
  const goals = loadSavedGoals();
  return goals.length ? parseGoal(goals[goals.length - 1]) : null;
}

function activeGoal() {
  return goalFromParams() || latestGoal();
}

function goalQuery(goal) {
  return new URLSearchParams({
    id: goal.id,
    title: goal.title,
    goalAmount: goal.targetAmount,
    savedAmount: goal.savedAmount,
    monthlyContribution: goal.monthlyContribution,
    annualReturn: goal.annualReturn
  });
}

function forecast(goal, contribution = goal.monthlyContribution) {
  let balance = goal.savedAmount;
  const rows = [];
  while (balance < goal.targetAmount && rows.length < 1200) {
    balance = balance * (1 + goal.annualReturn / 1200) + contribution;
    rows.push(balance);
  }
  const last = rows.at(-1) ?? goal.savedAmount;
  return {
    rows,
    reached: balance >= goal.targetAmount,
    last,
    own: rows.length * contribution,
    income: last - goal.savedAmount - rows.length * contribution
  };
}

function fillValues(selector, values) {
  document.querySelectorAll(selector).forEach((element, index) => {
    element.textContent = values[index];
  });
}

function fillSchedule(scope, goal, plan) {
  const count = plan.rows.length;
  const chart = scope.querySelector('.result-chart-bars');
  const labels = scope.querySelector('.result-chart-months');
  chart.replaceChildren();
  labels.replaceChildren();
  chart.setAttribute('aria-label', 'Прогноз накопичення від ' + money(goal.savedAmount) + ' до ' + money(plan.last));
  const samples = Math.min(count, 10);
  for (let index = 1; index <= samples; index++) {
    const month = Math.ceil(index * count / samples);
    const bar = document.createElement('span');
    bar.className = 'result-bar' + (index === samples ? ' is-final' : '');
    bar.style.setProperty('--bar-height', Math.min(100, 100 * plan.rows[month - 1] / Math.max(plan.last, 1)) + '%');
    chart.append(bar);
    const label = document.createElement('li');
    label.textContent = month;
    labels.append(label);
  }
  scope.querySelector('.result-table tbody').innerHTML = plan.rows.map((balance, index) =>
    '<tr><th scope="row">' + String(index + 1).padStart(2, '0') + '</th><td>' + money(balance) +
    '</td><td>' + percent(balance / goal.targetAmount * 100) + '</td></tr>'
  ).join('');
  scope.querySelector('.result-chart-caption').textContent = 'Старт: ' + money(goal.savedAmount);
  scope.querySelector('.result-chart-disclaimer').textContent = 'Внесок наприкінці місяця. Термін відраховується від поточного місяця.';
  scope.querySelector('.result-schedule-heading p').textContent =
    'Прогноз, не фактичний баланс. Щомісячний внесок — ' + money(goal.monthlyContribution) +
    ', очікувана дохідність — ' + goal.annualReturn + '% річних.';
}

function showEmpty(main, sections) {
  sections.forEach(selector => {
    const section = document.querySelector(selector);
    section.hidden = true;
    section.style.display = 'none';
  });
  const notice = document.createElement('p');
  notice.className = 'demo-saved-notice';
  notice.textContent = 'Поки немає збережених цілей. Створіть першу ціль у симуляторі.';
  const link = document.createElement('a');
  link.href = 'index.html#simulator';
  link.textContent = 'Створити ціль';
  notice.append(' ', link);
  main.prepend(notice);
}

function renderResult() {
  const goal = activeGoal();
  const main = document.querySelector('.result-main');
  if (!goal) {
    showEmpty(main, ['.result-hero', '.result-details']);
    return;
  }
  const plan = forecast(goal);
  const count = plan.rows.length;
  main.querySelector('.result-title').textContent = goal.title + ' · ' + money(goal.targetAmount);
  main.querySelector('.result-subtitle').textContent =
    'Щомісячний внесок ' + money(goal.monthlyContribution) + ' · ' + goal.annualReturn + '% річних.';
  main.querySelector('.result-horizon-number').textContent = plan.reached ? count : '1200+';
  main.querySelector('.result-horizon').setAttribute('aria-label', 'Прогнозований горизонт: ' + count + ' місяців до цілі');
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + count);
  main.querySelector('.result-horizon-caption').textContent = plan.reached
    ? date.toLocaleDateString('uk-UA', {month:'long', year:'numeric'}) : 'Понад 100 років';
  fillValues('.result-metric dd', [money(plan.last), money(plan.own), money(plan.income)]);
  fillValues('.result-details > .result-container > .result-parameters .result-parameter-grid dd',
    [money(goal.targetAmount), money(goal.savedAmount), money(goal.monthlyContribution), goal.annualReturn + '%']);
  main.querySelector('.result-edit-button').href = 'index.html?' + goalQuery(goal) + '#simulator';
  fillSchedule(main, goal, plan);
  main.querySelector('#scenarios').innerHTML = [0.8, 1, 1.2].map(factor => {
    const contribution = goal.monthlyContribution * factor;
    const scenario = forecast(goal, contribution);
    return '<div><dt>' + money(contribution) + ' / міс.</dt><dd>' +
      (scenario.reached ? scenario.rows.length + ' міс.' : 'Понад 100 років') + '</dd></div>';
  }).join('');
  const input = main.querySelector('#plan-name');
  input.value = goal.title;
  main.querySelector('#save-plan').onsubmit = event => {
    event.preventDefault();
    goal.title = input.value.trim() || 'Моя ціль';
    goal.id ||= crypto.randomUUID();
    location.href = 'goals.html?save=1&' + goalQuery(goal);
  };
}

function fillCard(card, goal, selected) {
  card.querySelector('.goal-title').textContent = goal.title;
  if (!selected) card.querySelector('.goal-title').removeAttribute('id');
  card.querySelector('.goal-saved-badge').textContent = 'Ваша ціль';
  card.querySelector('.goal-amount strong').textContent = money(goal.targetAmount);
  const progress = percent(goal.savedAmount / goal.targetAmount * 100);
  const [balance, percentage] = card.querySelectorAll('.goal-progress-heading span');
  balance.textContent = money(goal.savedAmount) + ' із ' + money(goal.targetAmount);
  percentage.textContent = progress;
  card.querySelector('progress').value = Number.parseInt(progress, 10);
  card.querySelector('progress').setAttribute('aria-label', 'Прогрес цілі: ' + progress);
  card.querySelector('.goal-disclaimer').textContent =
    'На старті заощаджено ' + money(goal.savedAmount) + '. Майбутні внески — прогноз.';
  card.querySelector('.goal-result-button').href = 'result.html?' + goalQuery(goal);
  card.querySelector('.goal-edit-button').href = 'index.html?' + goalQuery(goal) + '#simulator';
  let deleteButton = card.querySelector('.goal-delete-button');
  if (!deleteButton) {
    deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'goal-delete-button';
    deleteButton.textContent = 'Видалити';
    card.querySelector('.goal-actions').append(deleteButton);
  }
  deleteButton.setAttribute('aria-label', 'Видалити ціль «' + goal.title + '»');
  deleteButton.addEventListener('click', async () => {
    if (!window.confirm('Видалити ціль «' + goal.title + '»?')) return;
    try {
      const links = loadShareLinks();
      const shared = links[goal.id];
      if (shared) {
        try {
          await shareRequest('DELETE', shared.id, null, shared.secret);
        } catch (error) {
          if (error.status !== 404) throw error;
        }
        delete links[goal.id];
        saveShareLinks(links);
      }
      const remaining = loadSavedGoals().filter(item => item.id !== goal.id);
      localStorage.setItem(storageKey, JSON.stringify(remaining));
      location.reload();
    } catch (error) {
      window.alert('Не вдалося видалити ціль: ' + error.message);
    }
  });
}

function initSharing(savedGoals) {
  const select = document.querySelector('#share-goal-select');
  if (!select) return;
  const create = document.querySelector('#share-create');
  const copy = document.querySelector('#share-copy');
  const revoke = document.querySelector('#share-revoke');
  const linkInput = document.querySelector('#share-link');
  const open = document.querySelector('#share-open');
  const status = document.querySelector('#share-status');
  const exportButton = document.querySelector('#goal-export');
  const goals = savedGoals.slice().reverse().map(parseGoal);
  const currentGoal = () => goals.find(goal => goal.id === select.value);
  const currentLink = () => loadShareLinks()[select.value];
  const message = (text, error = false) => {
    status.textContent = text;
    status.classList.toggle('is-error', error);
  };
  const refresh = () => {
    const goal = currentGoal();
    const plan = goal ? forecast(goal) : null;
    const link = currentLink();
    linkInput.value = link ? shareUrl(link.id) : '';
    open.hidden = !link;
    if (link) open.href = linkInput.value;
    create.textContent = link ? 'Оновити посилання' : 'Створити посилання';
    create.disabled = !goal;
    copy.disabled = !link;
    revoke.disabled = !link;
    exportButton.disabled = !goal;
    document.querySelector('#share-preview-title').textContent = goal?.title || 'Оберіть ціль';
    document.querySelector('#share-preview-amount').textContent = goal ? money(goal.targetAmount) : '—';
    document.querySelector('#share-preview-horizon').textContent = goal
      ? (plan.reached ? plan.rows.length + ' міс.' : 'Понад 100 років') : '—';
  };
  for (const goal of goals) {
    const option = document.createElement('option');
    option.value = goal.id;
    option.textContent = goal.title;
    select.append(option);
  }
  if (!goals.length) {
    select.disabled = true;
    message('Спочатку створіть і збережіть ціль.');
  }
  select.addEventListener('change', () => {
    message('');
    refresh();
  });
  create.addEventListener('click', async () => {
    const goal = currentGoal();
    if (!goal) return;
    create.disabled = copy.disabled = revoke.disabled = true;
    message('Зберігаємо посилання…');
    try {
      localStorage.setItem('potikShareStorageCheck', '1');
      localStorage.removeItem('potikShareStorageCheck');
      const links = loadShareLinks();
      let link = links[goal.id];
      if (link) {
        try {
          await shareRequest('PUT', link.id, goal, link.secret);
        } catch (error) {
          if (error.status !== 403 && error.status !== 404) throw error;
          link = null;
        }
      }
      if (!link) {
        link = await shareRequest('POST', '', goal);
        links[goal.id] = link;
        try {
          saveShareLinks(links);
        } catch (error) {
          await shareRequest('DELETE', link.id, null, link.secret).catch(() => {});
          throw error;
        }
      }
      message('Посилання готове. Одержувач побачить тільки цю ціль.');
    } catch (error) {
      message(error.message || 'Не вдалося створити посилання.', true);
    } finally {
      refresh();
    }
  });
  copy.addEventListener('click', async () => {
    if (!linkInput.value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(linkInput.value);
      } else {
        linkInput.select();
        if (!document.execCommand('copy')) throw new Error('Копіювання недоступне.');
      }
      message('Посилання скопійовано.');
    } catch {
      linkInput.select();
      message('Автоматичне копіювання недоступне. Скопіюйте виділене посилання вручну.', true);
    }
  });
  revoke.addEventListener('click', async () => {
    const link = currentLink();
    if (!link || !window.confirm('Відкликати доступ? Це посилання перестане відкриватися.')) return;
    create.disabled = copy.disabled = revoke.disabled = true;
    message('Відкликаємо доступ…');
    try {
      try {
        await shareRequest('DELETE', link.id, null, link.secret);
      } catch (error) {
        if (error.status !== 404) throw error;
      }
      const links = loadShareLinks();
      delete links[select.value];
      saveShareLinks(links);
      message('Доступ відкликано. Старе посилання більше не працює.');
    } catch (error) {
      message(error.message || 'Не вдалося відкликати доступ.', true);
    } finally {
      refresh();
    }
  });
  exportButton.addEventListener('click', () => {
    const goal = currentGoal();
    if (!goal) return;
    const rows = forecast(goal).rows;
    const data = [
      ['Ціль', goal.title],
      ['Сума цілі, грн', goal.targetAmount],
      ['Уже заощаджено, грн', goal.savedAmount],
      ['Щомісячний внесок, грн', goal.monthlyContribution],
      ['Дохідність, % річних', goal.annualReturn],
      [],
      ['Місяць', 'Накопичено, грн', 'Ціль, %'],
      ...rows.map((balance, index) => [index + 1, balance.toFixed(2), (balance / goal.targetAmount * 100).toFixed(1)])
    ];
    const csv = '\uFEFF' + data.map(row => row.map(value => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const download = document.createElement('a');
    download.href = url;
    download.download = 'plan-' + goal.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) + '.csv';
    download.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('План завантажено у форматі CSV.');
  });
  refresh();
}

function renderGoals() {
  let goals = loadSavedGoals();
  if (params.get('save') === '1') {
    const goal = goalFromParams();
    goal.id ||= crypto.randomUUID();
    goals = goals.filter(item => item.id !== goal.id).concat(goal);
    localStorage.setItem(storageKey, JSON.stringify(goals));
    history.replaceState(null, '', 'goals.html');
  }
  if (goals.some(goal => !goal.id)) {
    goals = goals.map(goal => goal.id ? goal : {...goal, id: crypto.randomUUID()});
    localStorage.setItem(storageKey, JSON.stringify(goals));
  }
  document.querySelectorAll('.demo-saved-goal').forEach(card => card.remove());
  document.querySelector('.goals-tab-label').textContent = 'Ваших цілей: ' + goals.length;
  initSharing(goals);
  if (!goals.length) {
    showEmpty(document.querySelector('.goals-main'), ['.goals-selected', '.goals-forecast']);
    return;
  }
  const ordered = goals.slice().reverse().map(parseGoal);
  const latest = ordered[0];
  const base = document.querySelector('.goals-selected .goal-card');
  fillCard(base, latest, true);
  let previous = base;
  for (const goal of ordered.slice(1)) {
    const card = base.cloneNode(true);
    fillCard(card, goal, false);
    previous.after(card);
    previous = card;
  }
  fillValues('.goal-parameter-grid dd',
    [money(latest.targetAmount), money(latest.savedAmount), money(latest.monthlyContribution), latest.annualReturn + '%']);
  const forecastSection = document.querySelector('.goals-forecast');
  const plan = forecast(latest);
  const count = plan.rows.length;
  forecastSection.querySelector('.forecast-heading p').textContent =
    'За незмінного внеску ' + money(latest.monthlyContribution) + ' щомісяця та очікуваної дохідності ' + latest.annualReturn + '% річних.';
  forecastSection.querySelector('.forecast-number').textContent = plan.reached ? count : '1200+';
  forecastSection.querySelector('.forecast-horizon').setAttribute('aria-label', 'Прогнозований горизонт: ' + count + ' місяців до цілі');
  forecastSection.querySelector('.forecast-metrics > div:last-child dt').textContent =
    count ? 'Разом на ' + count + '-й місяць' : 'Разом зараз';
  fillValues('.forecast-metrics dd', [money(plan.own), money(plan.income), money(plan.last)]);
}

async function renderShared() {
  const main = document.querySelector('.shared-main');
  const loading = main.querySelector('#share-loading');
  const token = params.get('share');
  if (!token) {
    loading.textContent = 'Відкрийте посилання, яке вам надіслав власник цілі. Створити власне можна на сторінці «Мої цілі».';
    main.setAttribute('aria-busy', 'false');
    return;
  }
  try {
  const { goal: sharedGoal } = await shareRequest('GET', token);
  const goal = parseGoal(sharedGoal);
  const plan = forecast(goal);
  const count = plan.rows.length;
  main.querySelector('.shared-goal-copy h2').textContent = goal.title;
  main.querySelector('.shared-hero-disclaimer').textContent =
    'Це знімок параметрів цілі на момент оновлення посилання. Редагувати його одержувач не може.';
  main.querySelector('.shared-horizon-number').textContent = plan.reached ? count : '1200+';
  main.querySelector('.shared-horizon').setAttribute('aria-label', 'Прогнозований горизонт: ' + count + ' місяців до цілі');
  main.querySelector('.shared-forecast h2').textContent =
    count ? 'ПРОГНОЗ НА ' + count + '-Й МІСЯЦЬ' : 'ПРОГНОЗ НА СТАРТІ';
  main.querySelector('.shared-forecast-metrics > div:last-child dt').textContent =
    count ? 'Разом на ' + count + '-й місяць' : 'Разом зараз';
  fillValues('.shared-forecast-metrics dd', [money(plan.own), money(plan.income), money(plan.last)]);
  main.querySelector('.shared-info-grid p').textContent =
    'Ви бачите параметри й розклад цілі «' + goal.title + '». Інші цілі не відображаються.';
  fillValues('.shared-parameter-grid dd',
    [money(goal.targetAmount), money(goal.savedAmount), money(goal.monthlyContribution), goal.annualReturn + '%']);
  const progress = percent(goal.savedAmount / goal.targetAmount * 100);
  const [balance, percentage] = main.querySelectorAll('.shared-progress-heading strong');
  balance.textContent = 'На старті: ' + money(goal.savedAmount) + ' із ' + money(goal.targetAmount);
  percentage.textContent = progress;
  main.querySelector('.shared-progress-card progress').value = Number.parseInt(progress, 10);
  main.querySelector('.shared-progress-card progress').setAttribute('aria-label', 'Початкові заощадження: ' + progress + ' від цілі');
  main.querySelector('.shared-progress-card p').textContent =
    'Це початкові заощадження, а не прогноз майбутніх внесків.';
  fillSchedule(main, goal, plan);
  for (const selector of ['.shared-hero', '.shared-info', '.shared-details']) {
    const section = main.querySelector(selector);
    section.hidden = false;
    section.style.display = '';
  }
  loading.remove();
  main.setAttribute('aria-busy', 'false');
  } catch (error) {
    loading.textContent = error.message || 'Не вдалося відкрити спільне посилання.';
    loading.classList.add('is-error');
    main.setAttribute('aria-busy', 'false');
  }
}

if (form) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    location.href = 'result.html?' + new URLSearchParams(new FormData(form));
  });
  for (const field of form.elements) {
    if (field.name && params.has(field.name)) field.value = params.get(field.name);
  }
}

try {
  if (document.querySelector('.result-main')) renderResult();
  if (document.querySelector('.goals-main')) renderGoals();
  if (document.querySelector('.shared-main')) renderShared();
  document.querySelectorAll('.demo-main a[href="result.html"]').forEach((link, index) => {
    const template = [
      [12000000, 2500000, 150000, 'Ferrari'],
      [1500000, 0, 25000, 'Квартира'],
      [120000, 0, 10000, 'Ноутбук і курси'],
      [200000, 0, 5000, 'Резервний фонд']
    ][index];
    if (template) link.href = 'index.html?' + goalQuery({
      id:'', title:template[3], targetAmount:template[0], savedAmount:template[1],
      monthlyContribution:template[2], annualReturn:0
    }) + '#simulator';
  });
} catch (error) {
  const note = document.createElement('p');
  note.className = 'demo-saved-notice is-error';
  note.textContent = 'Не вдалося відкрити план: ' + error.message;
  document.querySelector('main')?.prepend(note);
}

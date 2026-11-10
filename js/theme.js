(() => {
  const key = 'potik-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  const localFile = location.protocol === 'file:';
  const valid = value => value === 'dark' || value === 'light';
  let choice;
  // Local HTML pages can have separate storage. Keep the current tab in sync.
  try { choice = localStorage.getItem(key); } catch {}
  if (localFile && /^potik-theme:(dark|light)$/.test(window.name)) choice = window.name.slice(12);
  function apply() {
    const dark = valid(choice) ? choice === 'dark' : system.matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const button = document.querySelector('.theme-toggle');
    if (button) {
      button.setAttribute('aria-pressed', String(dark));
      button.title = dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему';
      button.firstElementChild.textContent = dark ? '☀' : '☾';
    }
  }
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelector('.theme-toggle').addEventListener('click', () => {
      choice = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key,choice); } catch {}
      if (localFile) window.name = 'potik-theme:'+choice;
      apply();
    });
  });
  system.addEventListener('change',apply);
  addEventListener('pageshow', () => {
    try { choice = localStorage.getItem(key); } catch {}
    if (localFile && /^potik-theme:(dark|light)$/.test(window.name)) choice = window.name.slice(12);
    apply();
  });
})();

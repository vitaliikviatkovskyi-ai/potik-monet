(() => {
  const video = document.querySelector('.hero-light-video');
  if (!video) return;

  const media = video.closest('.hero-media');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function syncVideo() {
    const shouldPlay = document.documentElement.dataset.theme === 'light' && !reduceMotion.matches;
    if (!shouldPlay) {
      media.classList.remove('is-video-playing');
      video.pause();
      if (video.hasAttribute('src')) {
        video.removeAttribute('src');
        video.load();
      }
      return;
    }

    if (!video.hasAttribute('src')) {
      video.src = video.dataset.src;
      video.load();
    }
    video.play().catch(() => media.classList.remove('is-video-playing'));
  }

  video.addEventListener('playing', () => media.classList.add('is-video-playing'));
  video.addEventListener('error', () => media.classList.remove('is-video-playing'));
  new MutationObserver(syncVideo).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  reduceMotion.addEventListener('change', syncVideo);
  syncVideo();
})();

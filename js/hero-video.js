(() => {
  const media = document.querySelector('.hero-media');
  if (!media) return;

  const videos = {
    light: media.querySelector('.hero-light-video'),
    dark: media.querySelector('.hero-dark-video'),
  };
  if (!videos.light || !videos.dark) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileViewport = matchMedia('(max-width: 699px)');
  const playingClass = theme => `is-${theme}-video-playing`;
  let currentTheme;

  function syncVideo() {
    const activeTheme = reduceMotion.matches ? null : document.documentElement.dataset.theme;
    if (activeTheme !== currentTheme) {
      media.classList.remove('is-light-video-playing', 'is-dark-video-playing', 'is-video-fallback');
      currentTheme = activeTheme;
    }
    for (const [theme, video] of Object.entries(videos)) {
      if (theme !== activeTheme) {
        media.classList.remove(playingClass(theme));
        video.pause();
        if (video.hasAttribute('src')) {
          video.removeAttribute('src');
          video.load();
        }
        continue;
      }

      const mobileSource = mobileViewport.matches &&
        video.canPlayType('video/webm; codecs="vp9"') && video.dataset.srcMobile;
      const source = mobileSource || video.dataset.src;
      if (video.getAttribute('src') !== source) {
        video.src = source;
        video.load();
      }
      video.play().catch(() => {
        if (currentTheme === theme) {
          media.classList.remove(playingClass(theme));
          media.classList.add('is-video-fallback');
        }
      });
    }
  }

  for (const [theme, video] of Object.entries(videos)) {
    video.addEventListener('playing', () => {
      if (!reduceMotion.matches && document.documentElement.dataset.theme === theme) {
        media.classList.remove('is-video-fallback');
        media.classList.add(playingClass(theme));
      }
    });
    video.addEventListener('error', () => {
      if (currentTheme === theme) {
        media.classList.remove(playingClass(theme));
        media.classList.add('is-video-fallback');
      }
    });
  }
  new MutationObserver(syncVideo).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  reduceMotion.addEventListener('change', syncVideo);
  mobileViewport.addEventListener('change', syncVideo);
  syncVideo();
})();

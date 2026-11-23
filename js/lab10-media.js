document.addEventListener("DOMContentLoaded", () => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof Swiper === "function" && document.querySelector(".reviews-swiper")) {
    new Swiper(".reviews-swiper", {
      loop: true,
      spaceBetween: 18,
      speed: reducedMotion ? 0 : 500,
      autoplay: reducedMotion ? false : {
        delay: 3500,
        disableOnInteraction: false,
        pauseOnMouseEnter: true
      },
      pagination: { el: ".reviews-pagination", clickable: true },
      navigation: { nextEl: ".reviews-next", prevEl: ".reviews-prev" },
      breakpoints: {
        320: { slidesPerView: 1 },
        700: { slidesPerView: 2 },
        1100: { slidesPerView: 3 }
      }
    });
  }

  if (typeof Swiper === "function" && document.querySelector(".media-gallery-swiper")) {
    const gallery = new Swiper(".media-gallery-swiper", {
      loop: true,
      spaceBetween: 14,
      speed: reducedMotion ? 0 : 650,
      grabCursor: true,
      autoplay: reducedMotion ? false : {
        delay: 3000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true
      },
      pagination: { el: ".gallery-pagination", clickable: true },
      navigation: { nextEl: ".gallery-next", prevEl: ".gallery-prev" },
      breakpoints: {
        320: { slidesPerView: 1.25 },
        560: { slidesPerView: 2 },
        900: { slidesPerView: 3 },
        1200: { slidesPerView: 4 }
      }
    });
    const gallerySection = document.querySelector(".media-gallery");
    gallerySection.addEventListener("focusin", () => gallery.autoplay?.stop());
    gallerySection.addEventListener("focusout", () => {
      if (!gallerySection.contains(document.activeElement)) gallery.autoplay?.start();
    });
  }

  if (typeof Fancybox !== "undefined") {
    Fancybox.bind('[data-fancybox="potik-gallery"]', {
      Carousel: { transition: reducedMotion ? false : "fade" },
      Images: { Panzoom: { maxScale: 3 } }
    });
  }

  const heading = document.querySelector("#typed-heading");
  const mobileViewport = window.matchMedia("(max-width: 699px)").matches;
  if (!reducedMotion && !mobileViewport && heading) {
    const text = heading.textContent;
    heading.textContent = "";
    heading.classList.add("is-typing");
    window.setTimeout(() => {
      let index = 0;
      const timer = window.setInterval(() => {
        heading.textContent = text.slice(0, ++index);
        if (index >= text.length) {
          window.clearInterval(timer);
          heading.classList.remove("is-typing");
        }
      }, 100);
    }, 350);
  }
});

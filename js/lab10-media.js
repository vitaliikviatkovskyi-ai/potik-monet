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

  if (typeof Fancybox !== "undefined") {
    Fancybox.bind('[data-fancybox="potik-gallery"]', {
      Carousel: { transition: reducedMotion ? false : "fade" },
      Images: { Panzoom: { maxScale: 3 } }
    });
  }

  const heading = document.querySelector("#typed-heading");
  if (!reducedMotion && heading) {
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

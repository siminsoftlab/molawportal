document.addEventListener("DOMContentLoaded", () => {

  /* ⭐ 1) 슬라이드 랜덤 셔플 */
  const wrapper = document.querySelector(".youtubeSwiper .swiper-wrapper");
  const slides = Array.from(wrapper.children);

  // Fisher–Yates Shuffle
  for (let i = slides.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    wrapper.appendChild(slides[j]);
    slides.splice(j, 1);
  }

  /* ⭐ 2) Swiper 실행 */
  const youtubeSwiper = new Swiper(".youtubeSwiper", {
    loop: true,
    autoplay: {
      delay: 3500,
      disableOnInteraction: false
    },
    pagination: {
      el: ".swiper-pagination",
      clickable: true
    },
    slidesPerView: 1.1,
    spaceBetween: 16,

    breakpoints: {
      768: { slidesPerView: 2.2 },
      1024: { slidesPerView: 3.2 }
    }
  });

  /* ⭐ 3) hover 시 autoplay 정지 */
  const swiperEl = document.querySelector(".youtubeSwiper");

  swiperEl.addEventListener("mouseenter", () => {
    youtubeSwiper.autoplay.stop();
  });

  swiperEl.addEventListener("mouseleave", () => {
    youtubeSwiper.autoplay.start();
  });
});

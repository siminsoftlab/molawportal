/* =========================================================
   ⭐ 추천영상 슬라이더 초기화 (전용)
========================================================= */
document.addEventListener("DOMContentLoaded", () => {

  const wrap = document.querySelector(".youtube-section .review-slider-wrap");
  if (!wrap) return;

  const slider = wrap.querySelector(".review-slider");
  const dotsWrap = wrap.querySelector(".review-dots");
  const cards = Array.from(slider.children);

  /* ⭐ 랜덤 셔플 */
  const shuffled = cards.sort(() => Math.random() - 0.5);
  slider.innerHTML = "";
  shuffled.forEach(card => slider.appendChild(card));

  /* ⭐ 도트 생성 */
  dotsWrap.innerHTML = "";
  shuffled.forEach((_, i) => {
    const dot = document.createElement("span");
    if (i === 0) dot.classList.add("active");
    dotsWrap.appendChild(dot);

    dot.addEventListener("click", () => {
      const cardWidth = slider.children[0].offsetWidth + 18;
      slider.scrollTo({
        left: cardWidth * i,
        behavior: "smooth"
      });
      updateDots(i);
    });
  });

  /* ⭐ 도트 업데이트 */
  function updateDots(index) {
    const dots = dotsWrap.querySelectorAll("span");
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  }

  /* ⭐ 스크롤 시 dot 업데이트 */
  slider.addEventListener("scroll", () => {
    const cardWidth = slider.children[0].offsetWidth + 18;
    const index = Math.round(slider.scrollLeft / cardWidth);
    updateDots(index);
  });

  /* ⭐ 자동 슬라이드 */
  let index = 0;
  let autoplayInterval;

  function play() {
    autoplayInterval = setInterval(() => {
      index++;
      if (index >= shuffled.length) index = 0;

      const cardWidth = slider.children[0].offsetWidth + 18;
      slider.scrollTo({
        left: cardWidth * index,
        behavior: "smooth"
      });

      updateDots(index);
    }, 3500);
  }

  function stop() {
    clearInterval(autoplayInterval);
  }

  slider.addEventListener("mouseenter", stop);
  slider.addEventListener("mouseleave", play);

  play();
});

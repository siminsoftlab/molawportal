document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("consultMessage");
  if (!el) return;

  // 순환 재생할 문장들
  const messages = [
    "무엇이든 편하게 상담 신청하세요!",
    "전문 상담팀이 빠르게 도와드립니다.",
    "지금 바로 무료 상담을 받아보세요.",
    "더이상 혼자 고민하지 마세요."
  ];

  let msgIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function type() {
    const current = messages[msgIndex];
    const speed = isDeleting
      ? Math.random() * 40 + 30   // 삭제 속도 (랜덤)
      : Math.random() * 80 + 50;  // 입력 속도 (랜덤)

    if (!isDeleting) {
      // 글자 입력
      el.textContent = current.substring(0, charIndex + 1);
      charIndex++;

      if (charIndex === current.length) {
        // 문장 끝 → 잠시 멈춤
        setTimeout(() => (isDeleting = true), 1000);
      }
    } else {
      // 글자 삭제
      el.textContent = current.substring(0, charIndex - 1);
      charIndex--;

      if (charIndex === 0) {
        isDeleting = false;
        msgIndex = (msgIndex + 1) % messages.length; // 다음 문장
      }
    }

    setTimeout(type, speed);
  }

  type();
});

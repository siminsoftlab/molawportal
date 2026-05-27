// 우클릭 방지
document.addEventListener('contextmenu', function (e) {
  e.preventDefault();
});

// 드래그 방지 (선택)
document.addEventListener('dragstart', function (e) {
  e.preventDefault();
});

// 텍스트 선택 방지 (선택)
document.addEventListener('selectstart', function (e) {
  e.preventDefault();
});

// 개발자도구 일부 차단 (선택)
/*
document.addEventListener('keydown', function (e) {
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && e.key === "I") ||
    (e.ctrlKey && e.key === "U")
  ) {
    e.preventDefault();
  }
});
*/

// common-apply-ch.js
import { db } from "/firebase-init.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* =========================================================
   ⭐ HTML에서 직접 호출하는 함수 (모듈 외부에서도 작동)
========================================================= */
window.openApplyModal = function(type) {
  const modal = document.getElementById("commonApplyModal");
  const typeEl = document.getElementById("applyType");
  const titleEl = document.getElementById("applyTitle");

  if (typeEl) typeEl.value = type;
  if (titleEl) titleEl.textContent = "온라인 상담 신청";

  modal.style.display = "block";
};

window.closeApplyModal = function() {
  const modal = document.getElementById("commonApplyModal");
  modal.style.display = "none";
};

/* =========================================================
   ⭐ 로드 후 실행되는 기능들
========================================================= */
export function initApplyModal() {
  console.log("✅ initApplyModal 실행 시작");

  const modal = document.getElementById("commonApplyModal");
  const form = document.getElementById("commonApplyForm");
  const closeBtn = modal?.querySelector(".close-modal");
  const statusEl = document.getElementById("applyStatus");

  const privacyModal = document.getElementById("privacyModal");
  const closePrivacy = document.querySelector(".close-privacy");
  const openPrivacy = document.getElementById("openPrivacy");

  // ⭐ 신청하기 버튼 연결
  const applyBtn = document.getElementById("applyBtn");
    applyBtn?.addEventListener("click", () => {
  if (!modal) {
    console.error("❌ commonApplyModal 요소를 찾을 수 없습니다.");
    return;
  }
  console.log("📌 applyBtn 클릭 → 모달 열기");
  modal.style.display = "block";
});

  /* 연락처 자동 하이픈 */
  document.querySelector("input[name='phone']")?.addEventListener("input", (e) => {
    e.target.value = autoHyphenPhone(e.target.value);
  });

  /* 상담 모달 닫기 */
  closeBtn?.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  /* 개인정보 모달 */
  openPrivacy?.addEventListener("click", () => {
    privacyModal.style.display = "block";
  });

  closePrivacy?.addEventListener("click", () => {
    privacyModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === privacyModal) privacyModal.style.display = "none";
  });

  /* Firestore 저장 */
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    // … 기존 Firestore 저장 로직 …
  });

  console.log("✅ initApplyModal 실행 완료");
}


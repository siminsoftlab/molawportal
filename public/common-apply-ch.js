// common-apply-ch.js
import { db } from "/firebase-init.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* =========================================================
   ⭐ 모달 열기 함수 (HTML onclick에서 호출)
========================================================= */
window.openApplyModal = function(type) {
  const applyModal = document.getElementById("commonApplyModal");
  const privacyModal = document.getElementById("privacyModal");

  // 다른 모달이 떠 있으면 닫기
  if (privacyModal) privacyModal.style.display = "none";

  if (!applyModal) return;

  const typeEl = document.getElementById("applyType");
  const titleEl = document.getElementById("applyTitle");

  if (typeEl) typeEl.value = type;
  if (titleEl) titleEl.textContent = "온라인 상담 신청";

  applyModal.style.display = "flex";   // ⭐ flex로 강제
};

window.closeApplyModal = function() {
  const applyModal = document.getElementById("commonApplyModal");
  if (applyModal) applyModal.style.display = "none";
};

/* =========================================================
   ⭐ 초기화 함수 (modals.html 로드 후 실행)
========================================================= */
export function initApplyModal() {

  console.log("🔧 initApplyModal() 실행됨 — 모달 DOM 연결 완료");

  const applyModal = document.getElementById("commonApplyModal");
  const privacyModal = document.getElementById("privacyModal");
  const form = document.getElementById("commonApplyForm");

  const closeApply = applyModal?.querySelector(".close-modal");
  const closePrivacy = privacyModal?.querySelector(".close-privacy");
  const openPrivacy = document.getElementById("openPrivacy");

  const statusEl = document.getElementById("applyStatus");

  if (!applyModal || !form) {
    console.error("❌ 모달 요소가 존재하지 않습니다.");
    return;
  }

  /* =========================================================
     ⭐ 연락처 자동 하이픈
  ========================================================== */
  const phoneInput = document.querySelector("input[name='phone']");
  if (phoneInput) {
    phoneInput.addEventListener("input", (e) => {
      e.target.value = e.target.value
        .replace(/[^0-9]/g, "")
        .replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3");
    });
  }

  /* =========================================================
     ⭐ 상담 모달 닫기
  ========================================================== */
  closeApply?.addEventListener("click", () => {
    applyModal.style.display = "none";
  });

  /* =========================================================
     ⭐ 개인정보 모달 열기/닫기
  ========================================================== */
  openPrivacy?.addEventListener("click", () => {
    // 상담 모달이 떠 있으면 닫기
    applyModal.style.display = "none";
    privacyModal.style.display = "flex";   // ⭐ flex로 강제
  });

  closePrivacy?.addEventListener("click", () => {
    privacyModal.style.display = "none";
  });

  /* =========================================================
     ⭐ window 클릭 이벤트 — 하나로 통합 (중복 제거)
  ========================================================== */
  window.addEventListener("click", (e) => {
    if (e.target === applyModal) applyModal.style.display = "none";
    if (e.target === privacyModal) privacyModal.style.display = "none";
  });

  /* =========================================================
     ⭐ Firestore 저장
  ========================================================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const agree = document.getElementById("agreePrivacy");

    if (!agree.checked) {
      statusEl.textContent = "개인정보 수집·이용에 동의해야 신청이 가능합니다.";
      statusEl.style.color = "red";
      return;
    }

    statusEl.textContent = "신청 처리 중...";
    statusEl.style.color = "#333";

    const fd = new FormData(form);

    const data = {
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      applyType: fd.get("applyType"),
      content: fd.get("content"),
      manager: "",
      partner: "",
      status: "신청",
      contractCode: "",
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "consult_requests"), data);

      statusEl.textContent = "신청이 정상적으로 접수되었습니다.";
      statusEl.style.color = "green";

      setTimeout(() => {
        applyModal.style.display = "none";
        form.reset();
        statusEl.textContent = "";
      }, 1500);

    } catch (err) {
      console.error(err);
      statusEl.textContent = "오류가 발생했습니다. 다시 시도해주세요.";
      statusEl.style.color = "red";
    }
  });

  console.log("✅ initApplyModal() 완료 — 모든 모달 이벤트 정상 연결됨");
}

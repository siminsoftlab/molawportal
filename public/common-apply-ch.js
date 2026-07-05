import { db } from "/firebase-init.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* =========================================================
   상담신청 모달 열기
========================================================= */
window.openApplyModal = function(type) {
  const applyModal = document.getElementById("commonApplyModal");
  const privacyModal = document.getElementById("privacyModal");

  // 개인정보 모달은 항상 닫고 시작
  if (privacyModal) privacyModal.style.display = "none";

  const typeEl = document.getElementById("applyType");
  const titleEl = document.getElementById("applyTitle");

  if (typeEl) typeEl.value = type;
  if (titleEl) titleEl.textContent = "온라인 상담 신청";

  applyModal.style.display = "flex";
};

/* =========================================================
   초기화
========================================================= */
export function initApplyModal() {

  const applyModal = document.getElementById("commonApplyModal");
  const privacyModal = document.getElementById("privacyModal");

  const closeApply = document.getElementById("closeApplyModal");
  const closePrivacy = document.getElementById("closePrivacyModal");
  const openPrivacy = document.getElementById("openPrivacy");

  const form = document.getElementById("commonApplyForm");
  const statusEl = document.getElementById("applyStatus");

  /* 연락처 자동 하이픈 */
  const phoneInput = document.querySelector("input[name='phone']");
  if (phoneInput) {
    phoneInput.addEventListener("input", (e) => {
      e.target.value = e.target.value
        .replace(/[^0-9]/g, "")
        .replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3");
    });
  }

  /* 상담 모달 닫기 */
  closeApply?.addEventListener("click", () => {
    applyModal.style.display = "none";
  });

  /* 개인정보 모달 열기 (상담신청 모달은 유지) */
  openPrivacy?.addEventListener("click", () => {
    privacyModal.style.display = "flex";
  });

  /* 개인정보 모달 닫기 → 상담신청 모달 유지 */
  closePrivacy?.addEventListener("click", () => {
    privacyModal.style.display = "none";
    applyModal.style.display = "flex";
  });

  /* 바깥 클릭 처리 */
  window.addEventListener("click", (e) => {

    // 개인정보 모달 바깥 클릭 → 개인정보 모달만 닫고 상담신청 모달 유지
    if (e.target === privacyModal) {
      privacyModal.style.display = "none";
      applyModal.style.display = "flex";
    }

    // 상담신청 모달 바깥 클릭 → 상담신청 모달 닫기
    if (e.target === applyModal) {
      applyModal.style.display = "none";
    }
  });

  /* Firestore 저장 */
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
      statusEl.textContent = "오류가 발생했습니다. 다시 시도해주세요.";
      statusEl.style.color = "red";
    }
  });
}

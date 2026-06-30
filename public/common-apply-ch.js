// common-apply-ch.js
import { db } from "/firebase-init.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* =========================================================
   ⭐ HTML에서 직접 호출하는 함수 (버튼 onclick에서 사용)
========================================================= */
window.openApplyModal = function(type) {
  const modal = document.getElementById("commonApplyModal");
  const typeEl = document.getElementById("applyType");
  const titleEl = document.getElementById("applyTitle");

  if (!modal) {
    console.error("❌ commonApplyModal 요소가 아직 DOM에 없습니다.");
    return;
  }

  if (typeEl) typeEl.value = type;
  if (titleEl) titleEl.textContent = "온라인 상담 신청";

  modal.style.display = "block";
};

window.closeApplyModal = function() {
  const modal = document.getElementById("commonApplyModal");
  if (modal) modal.style.display = "none";
};

/* =========================================================
   ⭐ footer + modals 로드 후 실행되는 초기화 함수
========================================================= */
export function initApplyModal() {

  console.log("🔧 initApplyModal() 실행됨 — modals.html이 DOM에 존재합니다.");

  const modal = document.getElementById("commonApplyModal");
  const form = document.getElementById("commonApplyForm");
  const closeBtn = modal?.querySelector(".close-modal");
  const statusEl = document.getElementById("applyStatus");

  const privacyModal = document.getElementById("privacyModal");
  const closePrivacy = document.querySelector(".close-privacy");
  const openPrivacy = document.getElementById("openPrivacy");

  /* =========================================================
     ⭐ 필수 요소 체크
  ========================================================== */
  if (!modal) {
    console.error("❌ commonApplyModal 요소를 찾을 수 없습니다.");
    return;
  }
  if (!form) {
    console.error("❌ commonApplyForm 요소를 찾을 수 없습니다.");
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
  closeBtn?.addEventListener("click", () => modal.style.display = "none");

  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  /* =========================================================
     ⭐ 개인정보 모달 열기/닫기
  ========================================================== */
  openPrivacy?.addEventListener("click", () => {
    privacyModal.style.display = "block";
  });

  closePrivacy?.addEventListener("click", () => {
    privacyModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
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
        modal.style.display = "none";
        form.reset();
        statusEl.textContent = "";
      }, 1500);

    } catch (err) {
      console.error(err);
      statusEl.textContent = "오류가 발생했습니다. 다시 시도해주세요.";
      statusEl.style.color = "red";
    }
  });

  console.log("✅ initApplyModal() 완료 — 모든 모달 이벤트 연결됨");
}

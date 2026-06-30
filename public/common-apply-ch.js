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

  console.log("📌 모달 요소:", modal);
  console.log("📌 폼 요소:", form);
  console.log("📌 닫기 버튼:", closeBtn);
  console.log("📌 개인정보 모달:", privacyModal);

  /* 연락처 자동 하이픈 */
  function autoHyphenPhone(value) {
    return value
      .replace(/[^0-9]/g, "")
      .replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3");
  }

  document.querySelector("input[name='phone']")?.addEventListener("input", (e) => {
    e.target.value = autoHyphenPhone(e.target.value);
    console.log("☎️ 전화번호 입력:", e.target.value);
  });

  /* 상담 모달 닫기 */
  closeBtn?.addEventListener("click", () => {
    console.log("❌ 상담 모달 닫기 클릭");
    modal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      console.log("❌ 모달 바깥 클릭 → 닫기");
      modal.style.display = "none";
    }
  });

  /* 개인정보 모달 */
  openPrivacy?.addEventListener("click", () => {
    console.log("🔓 개인정보 모달 열기");
    privacyModal.style.display = "block";
  });

  closePrivacy?.addEventListener("click", () => {
    console.log("❌ 개인정보 모달 닫기 클릭");
    privacyModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === privacyModal) {
      console.log("❌ 개인정보 모달 바깥 클릭 → 닫기");
      privacyModal.style.display = "none";
    }
  });

  /* Firestore 저장 */
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📤 상담 신청 폼 제출");

    const agree = document.getElementById("agreePrivacy");

    if (!agree.checked) {
      console.log("⚠️ 개인정보 동의 체크 안 됨");
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

    console.log("📦 Firestore 저장 데이터:", data);

    try {
      await addDoc(collection(db, "consult_requests"), data);
      console.log("✅ Firestore 저장 성공");

      statusEl.textContent = "신청이 정상적으로 접수되었습니다.";
      statusEl.style.color = "green";

      setTimeout(() => {
        modal.style.display = "none";
        form.reset();
        statusEl.textContent = "";
      }, 1500);

    } catch (err) {
      console.error("❌ Firestore 저장 오류:", err);
      statusEl.textContent = "오류가 발생했습니다. 다시 시도해주세요.";
      statusEl.style.color = "red";
    }
  });

  console.log("✅ initApplyModal 실행 완료");
}

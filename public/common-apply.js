// common-apply.js
import { db } from "/firebase-init.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  const modal = document.getElementById("commonApplyModal");
  const form = document.getElementById("commonApplyForm");
  const closeBtn = modal?.querySelector(".close-modal");
  const statusEl = document.getElementById("applyStatus");

  // ⭐ 블로그/메인 페이지에서 호출하는 함수
  window.openApplyModal = function(type) {
    document.getElementById("applyType").value = type;
    document.getElementById("applyTitle").textContent = `${type} 신청`;
    modal.style.display = "block";
  };

  // 모달 닫기
  closeBtn?.addEventListener("click", () => modal.style.display = "none");
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // ⭐ Firestore 저장
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "신청 처리 중...";

    const fd = new FormData(form);

    const data = {
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      applyType: fd.get("applyType"),
      content: fd.get("content"),

      // 관리용 필드
      manager: "",
      partner: "",
      status: "신규",
      contractCode: "",

      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "consult_requests"), data);
      statusEl.textContent = "신청이 정상적으로 접수되었습니다.";
      form.reset();
    } catch (err) {
      console.error(err);
      statusEl.textContent = "오류가 발생했습니다. 다시 시도해주세요.";
    }
  });

});

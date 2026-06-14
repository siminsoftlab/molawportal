// consult-detail.js
import { db } from "/firebase-init.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  if (!id) {
    alert("잘못된 접근입니다.");
    location.href = "/admin/admin-consult.html";
    return;
  }

  const ref = doc(db, "consult_requests", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("상담 정보를 찾을 수 없습니다.");
    location.href = "/admin/admin-consult.html";
    return;
  }

  const data = snap.data();

  // 상세 정보 표시
  document.getElementById("name").textContent = data.name;
  document.getElementById("phone").textContent = data.phone;
  document.getElementById("email").textContent = data.email;
  document.getElementById("type").textContent = data.applyType || "-";
  document.getElementById("message").textContent = data.content || "-";

  document.getElementById("createdAt").textContent =
    data.createdAt?.toDate
      ? data.createdAt.toDate().toLocaleString()
      : "-";

  // 관리 항목 기본값
  document.getElementById("status").value = data.status || "신규";
  document.getElementById("manager").value = data.manager || "";
  document.getElementById("partner").value = data.partner || "";
  document.getElementById("contractCode").value = data.contractCode || "";

  // 저장 버튼
  document.getElementById("saveBtn").addEventListener("click", async () => {
    const updateData = {
      status: document.getElementById("status").value,
      manager: document.getElementById("manager").value,
      partner: document.getElementById("partner").value,
      contractCode: document.getElementById("contractCode").value
    };

    try {
      await updateDoc(ref, updateData);
      alert("저장되었습니다.");
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    }
  });
});

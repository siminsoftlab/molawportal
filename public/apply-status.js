/* ============================================================
   Firebase Firestore v9.22.2 모듈
============================================================ */
import { db } from "/firebase-init.js";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

function loadApplyStatus() {
  const container = document.getElementById("applyStatusCards");

  // 스피너 표시
  container.innerHTML = `<div class="loading-spinner"></div>`;

  const q = query(
    collection(db, "consult_requests"),
    orderBy("createdAt", "desc"),
    limit(5)
  );

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = "<div>최근 신청 내역이 없습니다.</div>";
      return;
    }

    container.innerHTML = ""; // 스피너 제거

    snapshot.forEach((doc, i) => {
      const data = doc.data();

      const card = document.createElement("div");
      card.className = "apply-status-card";

      card.innerHTML = `
        <span class="col status">${data.status}</span>
        <span class="col type">${data.applyType}</span>
        <span class="col name">${maskName(data.name)}</span>
        <span class="col date">${data.createdAt?.toDate().toLocaleDateString("ko-KR")}</span>
      `;

      container.appendChild(card);

      setTimeout(() => card.classList.add("visible"), i * 150);
    });
  });
}

loadApplyStatus();

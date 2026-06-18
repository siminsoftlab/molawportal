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

/* 이름 마스킹 */
function maskName(name) {
  if (!name || name.length < 2) return name;
  if (name.length === 2) return name[0] + "O";
  if (name.length === 3) return name[0] + "O" + name[2];
  return name[0] + "OO" + name.slice(-1);
}

/* 상태 태그 */
function getStatusTag(status) {
  const cls = "status-" + status.replace(/\s/g, "");
  return `<span class="status-tag ${cls}">${status}</span>`;
}

/* Firestore 불러오기 */
function loadApplyStatus() {
  const container = document.getElementById("applyStatusCards");

  // 스피너 표시
  container.innerHTML = `<div class="loading-spinner"></div>`;

  const q = query(
    collection(db, "consult_requests"),
    orderBy("createdAt", "desc"),
    limit(10) // 취소 제외하면 실제 표시 수가 줄 수 있으니 10개로 늘림
  );

  onSnapshot(q, (snapshot) => {
    // 스피너 제거
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = "<div>최근 신청 내역이 없습니다.</div>";
      return;
    }

    let count = 0;

    snapshot.forEach((doc, i) => {
      const data = doc.data();

      // 🔥 JS에서 취소 상태 필터링
      if (data.status === "취소") return;

      // 최대 5개만 표시
      if (count >= 5) return;
      count++;

      const card = document.createElement("div");
      card.className = "apply-status-card";

      card.innerHTML = `
        <span class="col status">${data.status}</span>
        <span class="col name">${maskName(data.name)}</span>
        <span class="col type">${data.applyType}</span>
        <span class="col date">${data.createdAt?.toDate().toLocaleDateString("ko-KR")}</span>
      `;

      container.appendChild(card);

      setTimeout(() => card.classList.add("visible"), i * 150);
    });

    // 필터링 후에도 아무것도 없을 때
    if (count === 0) {
      container.innerHTML = "<div>최근 신청 내역이 없습니다.</div>";
    }
  });
}

loadApplyStatus();

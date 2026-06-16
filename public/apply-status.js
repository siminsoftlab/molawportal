/* ============================================================
   Firebase Firestore v9.22.2 모듈
============================================================ */
import { db } from "/firebase-init.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs
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
async function loadApplyStatus() {
  const container = document.getElementById("applyStatusCards");
  container.innerHTML = "불러오는 중...";

  try {
    const q = query(
      collection(db, "consult_requests"),
      orderBy("createdAt", "desc"),
      limit(8)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      container.innerHTML = "<div>최근 신청 내역이 없습니다.</div>";
      return;
    }

    container.innerHTML = "";

    snapshot.forEach((doc, i) => {
      const data = doc.data();

      const card = document.createElement("div");
      card.className = "apply-status-card";

      card.innerHTML = `
        ${getStatusTag(data.status || "신규")}
        <div>${data.applyType || "유형 없음"}</div>
        <div>${maskName(data.name || "이름 없음")}</div>
        <div>${data.createdAt?.toDate().toLocaleDateString("ko-KR")}</div>
      `;

      container.appendChild(card);

      // 순차 등장 애니메이션
      setTimeout(() => card.classList.add("visible"), i * 200);
    });

  } catch (e) {
    console.error("상담현황 불러오기 오류:", e);
    container.innerHTML = "<div>불러오는 중 오류 발생</div>";
  }
}

loadApplyStatus();

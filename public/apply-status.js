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

/* ============================================================
   이름 마스킹
============================================================ */
function maskName(name) {
  if (!name || name.length < 2) return name;

  if (name.length === 2) return name[0] + "O";
  if (name.length === 3) return name[0] + "O" + name[2];
  return name[0] + "OO" + name.slice(-1);
}

/* ============================================================
   상태 태그
============================================================ */
function getStatusTag(status) {
  const cls = "status-" + status.replace(/\s/g, "");
  return `<span class="status-tag ${cls}">${status}</span>`;
}

/* ============================================================
   Firestore 불러오기 (슬라이드 제거)
============================================================ */
async function loadApplyStatus() {
  const listEl = document.getElementById("applyStatusList");
  if (!listEl) return;

  listEl.innerHTML = "<li>불러오는 중...</li>";

  try {
    const q = query(
      collection(db, "consult_requests"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      listEl.innerHTML = "<li>최근 신청 내역이 없습니다.</li>";
      return;
    }

    listEl.innerHTML = "";

    snapshot.forEach(doc => {
      const data = doc.data();

      const name = maskName(data.name || "이름 없음");
      const type = data.applyType || "유형 없음";
      const status = data.status || "신규";
      const date = data.createdAt?.toDate().toLocaleDateString("ko-KR") || "";

      // li 생성
      const li = document.createElement("li");

      // 상태
      const spanStatus = document.createElement("span");
      spanStatus.innerHTML = getStatusTag(status);

      // 신청유형
      const spanType = document.createElement("span");
      spanType.textContent = type;

      // 성명
      const spanName = document.createElement("span");
      spanName.textContent = name;

      // 날짜
      const spanDate = document.createElement("span");
      spanDate.textContent = date;

      // 순서: 상태 → 신청유형 → 성명 → 날짜
      li.appendChild(spanStatus);
      li.appendChild(spanType);
      li.appendChild(spanName);
      li.appendChild(spanDate);

      listEl.appendChild(li);
    });

  } catch (e) {
    console.error("상담현황 불러오기 오류:", e);
    listEl.innerHTML = "<li>불러오는 중 오류 발생</li>";
  }
}

loadApplyStatus();

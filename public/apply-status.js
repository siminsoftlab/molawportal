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
   1) 이름 마스킹 — 최종 규칙
   - 2글자 → 이O
   - 3글자 → 김O수
   - 4글자 이상 → 박OO준
============================================================ */
function maskName(name) {
  if (!name || name.length < 2) return name;

  // 2글자 → 이O
  if (name.length === 2) {
    return name[0] + "O";
  }

  // 3글자 → 김O수
  if (name.length === 3) {
    return name[0] + "O" + name[2];
  }

  // 4글자 이상 → 박OO준
  return name[0] + "OO" + name.slice(-1);
}

/* ============================================================
   2) 상태(status) 색상 태그
============================================================ */
function getStatusTag(status) {
  const cls = "status-" + status.replace(/\s/g, "");
  return `<span class="status-tag ${cls}">${status}</span>`;
}

/* ============================================================
   3) Firestore에서 최근 5건 불러오기
   ※ consult_requests 기준
============================================================ */
async function loadApplyStatus() {
  const listEl = document.getElementById("applyStatusList");
  if (!listEl) return;

  listEl.innerHTML = "<li>불러오는 중...</li>";

  try {
    const q = query(
      collection(db, "consult_requests"),   // ← ★ 여기 변경됨
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

      const item = `
        <li>
          <span>${name}</span>
          <span>${type}</span>
          ${getStatusTag(status)}
          <span>${date}</span>
        </li>
      `;
      listEl.innerHTML += item;
    });

    startRolling(); // 자동 롤링 시작

  } catch (e) {
    console.error("상담현황 불러오기 오류:", e);
    listEl.innerHTML = "<li>불러오는 중 오류 발생</li>";
  }
}

/* ============================================================
   4) 자동 슬라이드 롤링 (3초 간격)
============================================================ */
function startRolling() {
  const items = document.querySelectorAll("#applyStatusList li");
  let index = 0;

  // 초기 위치 설정
  items.forEach((item, i) => {
    item.style.transform = `translateY(${i * 60}px)`;
  });

  setInterval(() => {
    index = (index + 1) % items.length;

    items.forEach((item, i) => {
      item.style.transform = `translateY(${(i - index) * 60}px)`;
    });
  }, 3000);
}

/* ============================================================
   실행
============================================================ */
loadApplyStatus();

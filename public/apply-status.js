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
============================================================ */
function maskName(name) {
  if (!name || name.length < 2) return name;

  if (name.length === 2) {
    return name[0] + "O";
  }

  if (name.length === 3) {
    return name[0] + "O" + name[2];
  }

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
============================================================ */
async function loadApplyStatus() {
  const listEl = document.getElementById("applyStatusList");
  if (!listEl) return;

  listEl.innerHTML = "";

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

    snapshot.forEach(doc => {
      const data = doc.data();

      const name = maskName(data.name || "이름 없음");
      const type = data.applyType || "유형 없음";
      const status = data.status || "신규";
      const date = data.createdAt?.toDate().toLocaleDateString("ko-KR") || "";

      // li 생성
      const li = document.createElement("li");

      // 이름
      const spanName = document.createElement("span");
      spanName.textContent = name;

      // 유형
      const spanType = document.createElement("span");
      spanType.textContent = type;

      // 상태
      const spanStatus = document.createElement("span");
      spanStatus.innerHTML = getStatusTag(status);

      // 날짜
      const spanDate = document.createElement("span");
      spanDate.textContent = date;

      // li에 추가
      li.appendChild(spanName);
      li.appendChild(spanType);
      li.appendChild(spanStatus);
      li.appendChild(spanDate);

      listEl.appendChild(li);
    });

    startRolling();

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

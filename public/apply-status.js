import { db } from "/firebase-init.js";
import { collection, query, orderBy, limit, getDocs } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 이름 마스킹: 김O수 형태
function maskName(name) {
  if (!name || name.length < 2) return name;

  if (name.length === 2) {
    return name[0] + "O";
  }

  return name[0] + "O" + name.slice(2);
}

// 상태 색상 태그
function getStatusTag(status) {
  const cls = "status-" + status.replace(/\s/g, "");
  return `<span class="status-tag ${cls}">${status}</span>`;
}

async function loadApplyStatus() {
  const listEl = document.getElementById("applyStatusList");
  if (!listEl) return;

  listEl.innerHTML = "<li>불러오는 중...</li>";

  try {
    const q = query(
      collection(db, "apply"),
      orderBy("timestamp", "desc"),
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
      const status = data.status || "진행중";
      const date = data.timestamp?.toDate().toLocaleDateString("ko-KR") || "";

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
    console.error(e);
    listEl.innerHTML = "<li>불러오는 중 오류 발생</li>";
  }
}

// 자동 롤링
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

loadApplyStatus();

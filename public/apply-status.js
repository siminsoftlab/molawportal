import { db } from "/firebase-init.js";
import { collection, query, orderBy, limit, getDocs } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 이름 마스킹 (성만 표시)
function maskName(name) {
  if (!name || name.length < 2) return name;
  return name[0] + "*".repeat(name.length - 1);
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
      const status = data.status || "진행중"; // Firestore에 status 필드가 있다고 가정
      const date = data.timestamp?.toDate().toLocaleDateString("ko-KR") || "";

      const item = `
        <li>
          <span>${name}</span>
          <span>${type}</span>
          <span>${status}</span>
          <span>${date}</span>
        </li>
      `;
      listEl.innerHTML += item;
    });
  } catch (e) {
    console.error(e);
    listEl.innerHTML = "<li>불러오는 중 오류 발생</li>";
  }
}

loadApplyStatus();
